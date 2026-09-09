import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, resumeSurvey, resumeSurveyWithPole, updateSurveyNode } from '../../store';
import { fetchErectionPoleDetailsAction } from '../../store/actions/erectionAction';
import { fetchDomainsAction, fetchTransformersAction, fetchConductorsAction, fetchPolesAction } from '../../store/actions/masterAction';
import { useToast } from '../../components/ToastProvider';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';

import SurveySvgCanvas from './components/SurveySvgCanvas';
import SurveyAttributeEditor from './components/SurveyAttributeEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 320;
const SVG_HEIGHT = 240;

export default function ErectionDetailsScreen() {
  const toast = useToast();
  const { confirm } = useConfirmation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { surveyId } = route.params;
  const historyList = useSelector((state: RootState) => state.survey.historyList) || [];
  const survey = Array.isArray(historyList) ? historyList.find(l => l.id === surveyId) : undefined;
  const domains = useSelector((state: RootState) => state.master.domains) || {};
  const rawTransformers = useSelector((state: RootState) => state.master.transformers);
  const rawConductors = useSelector((state: RootState) => state.master.conductors);
  const rawPoles = useSelector((state: RootState) => state.master.poles);

  const transformers = useMemo(() => Array.isArray(rawTransformers) ? rawTransformers : [], [rawTransformers]);
  const conductors = useMemo(() => Array.isArray(rawConductors) ? rawConductors : [], [rawConductors]);
  const poles = useMemo(() => Array.isArray(rawPoles) ? rawPoles : [], [rawPoles]);

  const isReadOnlyParam = Boolean(route.params?.isReadOnly);
  const isRejectedParam = Boolean(
    route.params?.isRejected ||
    survey?.status === 'REJECTED' ||
    (survey as any)?.erectionItem?.status === 3 ||
    route.params?.erectionItem?.status === 3
  );
  const isLocked = Boolean(survey?.isCompleted || isReadOnlyParam || isRejectedParam);
  const erectionItem = route.params?.erectionItem || (survey as any)?.erectionItem;

  const [zoomScale, setZoomScale] = useState(1.0);

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0));
  const handleResetZoom = () => setZoomScale(1.0);

  // Selected sub-elements
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedSpanNodeId, setSelectedSpanNodeId] = useState<string | null>(null);

  const [confirmEditModalVisible, setConfirmEditModalVisible] = useState(false);
  const [selectedEditPole, setSelectedEditPole] = useState<string>('');
  const [loadingPoleDetails, setLoadingPoleDetails] = useState<boolean>(false);

  const handleOpenEditModal = () => {
    if (!survey || survey.nodes.length === 0) {
      toast.info('No recorded poles found in this survey run.');
      return;
    }
    const currentSelected = selectedNodeId ? survey.nodes.find(n => n.id === selectedNodeId) : null;
    const initialPole = currentSelected?.nameLabel || survey.nodes[0]?.nameLabel || '';
    setSelectedEditPole(initialPole);
    setConfirmEditModalVisible(true);
  };

  const handleEditChosenPole = (poleLabel: string) => {
    if (!survey) return;
    const targetNode = survey.nodes.find(n => n.nameLabel === poleLabel);
    const rawId = survey.id.replace('erect-', '');
    const erectionDbId = !isNaN(Number(rawId)) ? Number(rawId) : undefined;
    const drawingNum = survey.drawingNo || undefined;

    setLoadingPoleDetails(true);
    dispatch(fetchErectionPoleDetailsAction(
      {
        drawing_no: drawingNum,
        erection_id: erectionDbId,
        pole_no: poleLabel,
        node_id: targetNode?.id && !isNaN(Number(targetNode.id)) ? Number(targetNode.id) : undefined,
      },
      (data) => {
        setLoadingPoleDetails(false);
        setConfirmEditModalVisible(false);
        const serverNode = data?.selected_node;
        const finalNode = serverNode || targetNode;
        dispatch(resumeSurveyWithPole({
          lineId: survey.id,
          poleLabel,
          editingNode: finalNode,
        }));
        navigation.navigate('ActiveSurvey', {
          isEditingNode: true,
          targetPoleLabel: poleLabel,
          serverNodeData: finalNode || null,
          workflowType: 'ERECTION',
        });
      },
      (err) => {
        setLoadingPoleDetails(false);
        console.log('Using local pole details for edit:', err);
        setConfirmEditModalVisible(false);
        dispatch(resumeSurveyWithPole({
          lineId: survey.id,
          poleLabel,
          editingNode: targetNode,
        }));
        navigation.navigate('ActiveSurvey', {
          isEditingNode: true,
          targetPoleLabel: poleLabel,
          serverNodeData: targetNode || null,
          workflowType: 'ERECTION',
        });
      }
    ) as any);
  };

  const handleContinueFromChosenPole = (poleLabel: string) => {
    if (!survey) return;
    setConfirmEditModalVisible(false);
    dispatch(resumeSurveyWithPole({
      lineId: survey.id,
      poleLabel,
    }));
    navigation.navigate('ActiveSurvey', {
      isContinuation: true,
      targetPoleLabel: poleLabel,
      workflowType: 'ERECTION',
    });
  };

  // Node Edit form state
  const [nodeName, setNodeName] = useState('');
  const [nodeLat, setNodeLat] = useState('');
  const [nodeLng, setNodeLng] = useState('');
  const [nodeCableSize, setNodeCableSize] = useState('');
  const [nodePoleType, setNodePoleType] = useState('');
  const [nodeHeight, setNodeHeight] = useState('');
  const [nodeTilt, setNodeTilt] = useState('');
  const [nodeSag, setNodeSag] = useState('');
  const [nodeParentLabel, setNodeParentLabel] = useState('');
  const [nodeSpanDistance, setNodeSpanDistance] = useState('');

  // Load missing master domains if not present
  useEffect(() => {
    if (!domains || Object.keys(domains).length === 0 || !domains.earthing) {
      dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point', 'earthing', 'stay_set', 'pole_db', 'pole_type', 'clamping_arrangement']) as any);
    }
    if (!transformers || transformers.length === 0) {
      dispatch(fetchTransformersAction() as any);
    }
    if (!conductors || conductors.length === 0) {
      dispatch(fetchConductorsAction() as any);
    }
    if (!poles || poles.length === 0) {
      dispatch(fetchPolesAction() as any);
    }
  }, []);

  const drawingNumber = survey?.drawingNo || erectionItem?.drawing_no || 'N/A';
  const feederName = (survey as any)?.feederName || erectionItem?.feeder_name || '';
  const dtrCode = (survey as any)?.dtrCode || erectionItem?.dtr_code || '';
  const stateName = (survey as any)?.stateName || erectionItem?.state_name || '';
  const districtName = survey?.district || erectionItem?.district_name || '';
  const blockName = survey?.block || erectionItem?.block_name || '';
  const villageName = (survey as any)?.village || survey?.location || erectionItem?.village_name || '';
  const contractorName = survey?.contractorName || erectionItem?.contractor_name || 'N/A';
  const remarksText = survey?.remarks || erectionItem?.remarks || '';
  const rawTypeOfWork = erectionItem?.type_of_work || (survey?.lineType === 'HT_33KV' ? '33_KV' : (survey?.lineType === 'HT_11KV' ? '11_KV' : 'LT_LINE'));
  const rawLtStartingPoint = survey?.ltStartingPoint || erectionItem?.lt_starting_point;
  const statusLabel = isRejectedParam ? 'REJECTED' : (survey?.isCompleted || isReadOnlyParam ? 'COMPLETED' : 'IN PROGRESS');
  const updatedDate = erectionItem?.updated_on || erectionItem?.updated_at || erectionItem?.created_on || erectionItem?.created_at || survey?.endedAt || survey?.startedAt;

  const getDomainLabel = (domainKey: string, code: any) => {
    if (code === undefined || code === null || code === '') return '';
    const rawList = domains[domainKey] || domains[domainKey.toUpperCase()] || domains[domainKey.toLowerCase()];
    const list = Array.isArray(rawList) ? rawList : (rawList && Array.isArray((rawList as any).Data) ? (rawList as any).Data : []);
    if (!Array.isArray(list) || typeof list.find !== 'function') return String(code);
    const found = list.find((d: any) => String(d.domain_code) === String(code));
    return found ? (found.domain_desc || found.domain_value) : String(code);
  };

  const getMasterLabel = (list: any[], id: any, nameKey = 'name') => {
    if (id === undefined || id === null || id === '') return '';
    if (!Array.isArray(list) || typeof list.find !== 'function') return String(id);
    const found = list.find((item: any) => String(item.id) === String(id));
    if (!found) return String(id);
    return found[nameKey] || found.name || found.label || String(id);
  };

  const typeOfWorkLabel = useMemo(() => {
    if (rawTypeOfWork === '11_KV') return '11 KV Line';
    if (rawTypeOfWork === '33_KV') return '33 KV Line';
    if (rawTypeOfWork === 'LT_LINE') return 'LT Line';
    return getDomainLabel('type_of_work', rawTypeOfWork) || rawTypeOfWork || 'N/A';
  }, [rawTypeOfWork, domains]);

  const ltStartingPointLabel = useMemo(() => {
    if (!rawLtStartingPoint) return '';
    if (rawLtStartingPoint === 'HT_TAPPING_POINT') return 'HT Tapping Point';
    if (rawLtStartingPoint === 'DTR') return 'DTR Substation';
    return getDomainLabel('lt_starting_point', rawLtStartingPoint) || rawLtStartingPoint;
  }, [rawLtStartingPoint, domains]);

  const activeInspectedNode = useMemo(() => {
    const surveyNodes = Array.isArray(survey?.nodes) ? survey.nodes : [];
    if (surveyNodes.length === 0) return null;
    if (selectedNodeId) {
      return surveyNodes.find(n => n.id === selectedNodeId) || surveyNodes[0];
    }
    return surveyNodes[0];
  }, [survey?.nodes, selectedNodeId]);

  const activeAttrs = (activeInspectedNode as any)?.attributes || {};
  const activePoleId = activeAttrs.pole_type_id ?? activeAttrs.pole_master_id ?? activeAttrs.poleMaster ?? activeAttrs.poleType ?? activeAttrs.pole_type;
  const activePoleTypeLabel = activePoleId ? getMasterLabel(poles, activePoleId, 'pole_name') : '';

  const activeConductorId = activeAttrs.conductor_type_id ?? activeAttrs.conductorType ?? activeAttrs.cableSize;
  const activeConductorLabel = activeConductorId ? getMasterLabel(conductors, activeConductorId, 'conductor_name') : '';

  const activeTransformerId = activeAttrs.dtr_capacity_id ?? activeAttrs.transformer_type_id ?? activeAttrs.dtrCapacity;
  const activeDtrCapacityLabel = activeTransformerId ? getMasterLabel(transformers, activeTransformerId, 'transformer_name') : '';

  const activeEarthingLabel = getDomainLabel('earthing', activeAttrs.earthing_type ?? activeAttrs.earthing);
  const activeStaySetLabel = getDomainLabel('stay_set', activeAttrs.stay_set_type ?? activeAttrs.stay_set);
  const activePoleDbLabel = getDomainLabel('pole_db', activeAttrs.pole_db_type ?? activeAttrs.pole_db);
  const activeClampingLabel = getDomainLabel('clamping_arrangement', activeAttrs.clamping_arrangement);

  const activeConditionLabel = (activeAttrs.condition || (activeInspectedNode as any)?.condition || 'NEW').toUpperCase();
  const activeDangerBoard = Boolean(activeAttrs.danger_board_fitted);
  const activeAntiClimbing = Boolean(activeAttrs.anticlimbing_fitted);
  const activeServiceConnQty = activeAttrs.service_connection_qty ? String(activeAttrs.service_connection_qty) : '';

  const activeNodePhotos: string[] = useMemo(() => {
    if (!activeInspectedNode) return [];
    const photos: string[] = [];
    if (Array.isArray(activeInspectedNode.imageUris)) {
      photos.push(...activeInspectedNode.imageUris);
    }
    if (Array.isArray(activeAttrs.all_photos)) {
      photos.push(...activeAttrs.all_photos);
    }
    if (activeInspectedNode.imageUri && !photos.includes(activeInspectedNode.imageUri)) {
      photos.push(activeInspectedNode.imageUri);
    }
    if (activeAttrs.image_url && !photos.includes(activeAttrs.image_url)) {
      photos.push(activeAttrs.image_url);
    }
    return photos.filter(Boolean);
  }, [activeInspectedNode, activeAttrs]);

  const materialSummary = useMemo(() => {
    const summary = {
      poles: {
        '8M': { concrete: 0, nonConcrete: 0, total: 0 },
        '9M': { concrete: 0, nonConcrete: 0, total: 0 },
        '11M': { concrete: 0, nonConcrete: 0, total: 0 },
        'other': { concrete: 0, nonConcrete: 0, total: 0 },
        totalConcrete: 0,
        totalNonConcrete: 0,
        totalNew: 0,
        totalOld: 0,
        total: 0,
      },
      dtr: {
        byCapacity: {} as Record<string, { newQty: number; existingQty: number; total: number }>,
        totalNew: 0,
        totalExisting: 0,
        total: 0,
      },
      staySet: {
        htQty: 0,
        ltQty: 0,
        byType: {} as Record<string, number>,
        total: 0,
      },
      earthing: {
        coilQty: 0,
        pipeQty: 0,
        plateQty: 0,
        byType: {} as Record<string, number>,
        total: 0,
      },
      conductors: {} as Record<string, { name: string; spans: number; totalLength: number }>,
      poleDb: {} as Record<string, { name: string; qty: number }>,
      totalPoleDb: 0,
      accessories: {
        dangerBoards: 0,
        antiClimbing: 0,
        serviceConnectionsTotal: 0,
        serviceConnectionsByType: {} as Record<string, number>,
        clampingByType: {} as Record<string, number>,
      },
      totalSpans: 0,
      totalLineLengthMeters: 0,
    };

    const surveyNodes = survey?.nodes || [];
    if (surveyNodes.length === 0) return summary;

    surveyNodes.forEach((node: any) => {
      const attrs = node.attributes || {};
      const condition = String(attrs.condition || node.condition || 'NEW').toUpperCase();
      const isNew = condition.includes('NEW');

      // 1. POLES
      if (node.nodeType === 'POLE' || (!node.nodeType && attrs.pole_type_id)) {
        summary.poles.total += 1;
        if (isNew) summary.poles.totalNew += 1;
        else summary.poles.totalOld += 1;

        const poleMasterId = attrs.pole_type_id ?? attrs.pole_master_id ?? attrs.poleMaster ?? attrs.poleType ?? attrs.pole_type;
        const poleObj = Array.isArray(poles) ? poles.find((p: any) => String(p.id) === String(poleMasterId)) : undefined;
        const poleName = (poleObj && poleObj?.pole_name || attrs && attrs.poleTypeName || attrs.pole_name || attrs.poleType || '')?.toString()?.toUpperCase() || '';
        const poleCode = (poleObj?.pole_code || '').toString()?.toUpperCase();
        const heightAttr = String(attrs.height || '').toUpperCase();

        // Determine height category
        let heightKey: '8M' | '9M' | '11M' | 'other' = 'other';
        if (poleName.includes('8M') || poleName.includes('8 M') || poleCode.includes('8M') || heightAttr === '8' || heightAttr === '8M') {
          heightKey = '8M';
        } else if (poleName.includes('9M') || poleName.includes('9 M') || poleCode.includes('9M') || heightAttr === '9' || heightAttr === '9M') {
          heightKey = '9M';
        } else if (poleName.includes('11M') || poleName.includes('11 M') || poleCode.includes('11M') || heightAttr === '11' || heightAttr === '11M') {
          heightKey = '11M';
        }

        // Determine concrete vs non-concrete
        const isConcrete = poleName.includes('PCC') || poleName.includes('RCC') || poleName.includes('PSC') ||
          poleName.includes('CONCRETE') || poleName.includes('CEMENT') || poleCode.includes('PCC') || poleCode.includes('RCC');

        if (isConcrete) {
          summary.poles[heightKey].concrete += 1;
          summary.poles.totalConcrete += 1;
        } else {
          summary.poles[heightKey].nonConcrete += 1;
          summary.poles.totalNonConcrete += 1;
        }
        summary.poles[heightKey].total += 1;
      }

      // 2. DTR
      const isDtrNode = node.nodeType === 'DTR' || Boolean(attrs.dtr_capacity_id || attrs.transformer_type_id || attrs.dtrCapacity);
      if (isDtrNode) {
        summary.dtr.total += 1;
        if (isNew) summary.dtr.totalNew += 1;
        else summary.dtr.totalExisting += 1;

        const dtrId = attrs.dtr_capacity_id ?? attrs.transformer_type_id ?? attrs.dtrCapacity;
        const transObj = Array.isArray(transformers) ? transformers.find((t: any) => String(t.id) === String(dtrId)) : undefined;
        let capacityLabel = transObj?.transformer_name || (dtrId ? `${dtrId} KVA` : 'Standard DTR');
        if (!capacityLabel.toUpperCase().includes('KVA') && !isNaN(Number(capacityLabel))) {
          capacityLabel = `${capacityLabel} KVA`;
        }

        if (!summary.dtr.byCapacity[capacityLabel]) {
          summary.dtr.byCapacity[capacityLabel] = { newQty: 0, existingQty: 0, total: 0 };
        }
        if (isNew) {
          summary.dtr.byCapacity[capacityLabel].newQty += 1;
        } else {
          summary.dtr.byCapacity[capacityLabel].existingQty += 1;
        }
        summary.dtr.byCapacity[capacityLabel].total += 1;
      }

      // 3. STAY SET
      const stayTypeRaw = attrs.stay_set_used ?? attrs.stay_set_type ?? attrs.stay_set ?? attrs.staySetUsed;
      const stayQty = Number(attrs.stay_set_quantity ?? attrs.staySetQuantity) || (stayTypeRaw ? 1 : 0);
      if (stayTypeRaw && stayQty > 0) {
        const stayLabel = getDomainLabel('stay_set', stayTypeRaw) || String(stayTypeRaw);
        const stayUpper = (stayLabel + ' ' + String(stayTypeRaw)).toUpperCase();
        if (stayUpper.includes('HT')) {
          summary.staySet.htQty += stayQty;
        } else if (stayUpper.includes('LT')) {
          summary.staySet.ltQty += stayQty;
        }
        summary.staySet.byType[stayLabel] = (summary.staySet.byType[stayLabel] || 0) + stayQty;
        summary.staySet.total += stayQty;
      }

      // 4. EARTHING
      const earthTypeRaw = attrs.earthing_used ?? attrs.earthing_type ?? attrs.earthing ?? attrs.earthingUsed;
      const earthQty = Number(attrs.earthing_quantity ?? attrs.earthingQuantity) || (earthTypeRaw ? 1 : 0);
      if (earthTypeRaw && earthQty > 0) {
        const earthLabel = getDomainLabel('earthing', earthTypeRaw) || String(earthTypeRaw);
        const earthUpper = (earthLabel + ' ' + String(earthTypeRaw)).toUpperCase();
        if (earthUpper.includes('COIL')) {
          summary.earthing.coilQty += earthQty;
        } else if (earthUpper.includes('PIPE')) {
          summary.earthing.pipeQty += earthQty;
        } else if (earthUpper.includes('PLATE')) {
          summary.earthing.plateQty += earthQty;
        }
        summary.earthing.byType[earthLabel] = (summary.earthing.byType[earthLabel] || 0) + earthQty;
        summary.earthing.total += earthQty;
      }

      // 5. CONDUCTORS & SPANS
      const conductorId = attrs.conductor_type_id ?? attrs.conductorType ?? attrs.cableSize;
      if (conductorId) {
        const condObj = Array.isArray(conductors) ? conductors.find((c: any) => String(c.id) === String(conductorId)) : undefined;
        const condName = condObj?.conductor_name || String(conductorId);
        const spanDist = Number(attrs.spanDistance) || 0;

        if (!summary.conductors[condName]) {
          summary.conductors[condName] = { name: condName, spans: 0, totalLength: 0 };
        }
        summary.conductors[condName].spans += 1;
        summary.conductors[condName].totalLength += spanDist;
        summary.totalSpans += 1;
        summary.totalLineLengthMeters += spanDist;
      }

      // 6. POLE DB
      const dbCodes = attrs.pole_db_type_codes || (attrs.pole_db ? (Array.isArray(attrs.pole_db) ? attrs.pole_db : [attrs.pole_db]) : []);
      const dbQtys = attrs.pole_db_quantities || attrs.poleDbQuantities || {};
      if (Array.isArray(dbCodes)) {
        dbCodes.forEach((code: any) => {
          if (!code) return;
          const dbName = getDomainLabel('pole_db', code) || String(code);
          const qty = Number(dbQtys[code]) || 1;
          if (!summary.poleDb[dbName]) {
            summary.poleDb[dbName] = { name: dbName, qty: 0 };
          }
          summary.poleDb[dbName].qty += qty;
          summary.totalPoleDb += qty;
        });
      }

      // 7. ACCESSORIES & SAFETY
      if (attrs.danger_board_fitted) {
        summary.accessories.dangerBoards += 1;
      }
      if (attrs.anticlimbing_fitted) {
        summary.accessories.antiClimbing += 1;
      }
      const servQty = Number(attrs.service_connection_qty) || 0;
      if (servQty > 0) {
        summary.accessories.serviceConnectionsTotal += servQty;
        const servType = attrs.service_connection_type || 'Standard';
        summary.accessories.serviceConnectionsByType[servType] = (summary.accessories.serviceConnectionsByType[servType] || 0) + servQty;
      }
      if (attrs.clamping_arrangement) {
        const clampLabel = getDomainLabel('clamping_arrangement', attrs.clamping_arrangement) || String(attrs.clamping_arrangement);
        summary.accessories.clampingByType[clampLabel] = (summary.accessories.clampingByType[clampLabel] || 0) + 1;
      }
    });

    return summary;
  }, [survey?.nodes, poles, conductors, transformers, domains]);

  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  if (!survey) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Erection details not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getLineAccent = () => {
    switch (survey.lineType) {
      case 'HT_11KV': return '#F59E0B';
      case 'HT_33KV': return '#EF4444';
      case 'LT_440V': return '#0284C7';
      default: return '#0284C7';
    }
  };

  const accentColor = getLineAccent();
  const nodes = Array.isArray(survey?.nodes) ? survey.nodes : [];
  const latitudes = nodes.map(n => n.latitude);
  const longitudes = nodes.map(n => n.longitude);

  const minLat = latitudes.length > 0 ? Math.min(...latitudes) : 0;
  const maxLat = latitudes.length > 0 ? Math.max(...latitudes) : 0;
  const minLng = longitudes.length > 0 ? Math.min(...longitudes) : 0;
  const maxLng = longitudes.length > 0 ? Math.max(...longitudes) : 0;

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const padding = 35;

  const projectedPoints = nodes.map(node => {
    let x = SVG_WIDTH / 2;
    let y = SVG_HEIGHT / 2;

    if (latRange > 0 || lngRange > 0) {
      const normX = lngRange > 0 ? (node.longitude - minLng) / lngRange : 0.5;
      const normY = latRange > 0 ? (node.latitude - minLat) / latRange : 0.5;
      x = padding + normX * (SVG_WIDTH - 2 * padding);
      y = SVG_HEIGHT - (padding + normY * (SVG_HEIGHT - 2 * padding));
    }
    return { ...node, x, y };
  });

  const handleSelectNode = (node: any, index: number) => {
    setSelectedSpanNodeId(null);
    setSelectedNodeId(node.id);
    if (!isLocked) {
      setNodeName(node.nameLabel);
      setNodeLat(node.latitude !== undefined && node.latitude !== null ? node.latitude.toString() : '');
      setNodeLng(node.longitude !== undefined && node.longitude !== null ? node.longitude.toString() : '');
      setNodeCableSize(node.attributes?.cableSize !== undefined && node.attributes?.cableSize !== null ? String(node.attributes.cableSize) : '');
      setNodePoleType(node.attributes?.poleType !== undefined && node.attributes?.poleType !== null ? String(node.attributes.poleType) : '');
      setNodeHeight(node.attributes?.height !== undefined && node.attributes?.height !== null ? String(node.attributes.height) : '');
      setNodeTilt(node.attributes?.tilt !== undefined && node.attributes?.tilt !== null ? String(node.attributes.tilt) : '');
      setNodeSag(node.attributes?.sag !== undefined && node.attributes?.sag !== null ? String(node.attributes.sag) : '');
      setNodeSpanDistance(node.attributes?.spanDistance !== undefined && node.attributes?.spanDistance !== null ? String(node.attributes.spanDistance) : '');

      let resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
      setNodeParentLabel(resolvedParent);
    }
  };

  const handleSelectSpan = (node: any, index: number) => {
    if (isLocked) {
      setSelectedNodeId(node.id);
      setSelectedSpanNodeId(null);
      return;
    }
    setSelectedNodeId(null);
    setSelectedSpanNodeId(node.id);
    setNodeName(node.nameLabel);
    setNodeCableSize(node.attributes?.cableSize !== undefined && node.attributes?.cableSize !== null ? String(node.attributes.cableSize) : '');
    setNodePoleType(node.attributes?.poleType !== undefined && node.attributes?.poleType !== null ? String(node.attributes.poleType) : '');
    setNodeHeight(node.attributes?.height !== undefined && node.attributes?.height !== null ? String(node.attributes.height) : '');
    setNodeTilt(node.attributes?.tilt !== undefined && node.attributes?.tilt !== null ? String(node.attributes.tilt) : '');
    setNodeSag(node.attributes?.sag !== undefined && node.attributes?.sag !== null ? String(node.attributes.sag) : '');
    setNodeSpanDistance(node.attributes?.spanDistance !== undefined && node.attributes?.spanDistance !== null ? String(node.attributes.spanDistance) : '');

    let resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
    setNodeParentLabel(resolvedParent);
  };

  const handleSaveNodeUpdates = () => {
    if (isLocked) return;
    const activeId = selectedNodeId || selectedSpanNodeId;
    if (!activeId) return;

    dispatch(updateSurveyNode({
      lineId: survey.id,
      nodeId: activeId,
      nameLabel: nodeName.trim(),
      latitude: selectedNodeId ? parseFloat(nodeLat) || 0 : (survey.nodes.find(n => n.id === activeId)?.latitude || 0),
      longitude: selectedNodeId ? parseFloat(nodeLng) || 0 : (survey.nodes.find(n => n.id === activeId)?.longitude || 0),
      parentLabel: nodeParentLabel.trim() || undefined,
      attributes: {
        cableSize: nodeCableSize.trim(),
        poleType: nodePoleType.trim(),
        height: nodeHeight.trim(),
        tilt: nodeTilt.trim(),
        sag: nodeSag.trim(),
        spanDistance: nodeSpanDistance.trim() || undefined,
      }
    }));

    toast.success('Structure details updated successfully.');
    setSelectedNodeId(null);
    setSelectedSpanNodeId(null);
  };

  const selectedPole = selectedNodeId && Array.isArray(survey?.nodes)
    ? survey.nodes.find(node => node.id === selectedNodeId && node.nodeType === 'POLE')
    : undefined;

  const handleContinueFromPole = () => {
    if (!selectedPole || isLocked) return;
    confirm({
      title: 'Continue From This Pole?',
      message: `New structures will branch from ${selectedPole.nameLabel}. Existing structures and spans remain unchanged.`,
      confirmLabel: 'CONTINUE ERECTION',
      onConfirm: () => {
        dispatch(resumeSurvey({ lineId: survey.id, parentLabel: selectedPole.nameLabel }));
        navigation.navigate('ActiveSurvey');
      },
    });
  };

  return (
    <View style={styles.outerContainer}>
      {/* 1. NATIVE GRADIENT SVG BACKDROP */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="60%" stopColor="#F0F9FF" />
              <Stop offset="100%" stopColor="#E0F2FE" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGradient)" />
        </Svg>
      </View>

      {/* 2. HUD HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>&lt; LOGS</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ERECTION DETAILS</Text>
        <View style={[styles.classBadge, { borderColor: accentColor }]}>
          <Text style={[styles.classBadgeText, { color: accentColor }]}>
            {getLineTypeLabel(survey.lineType)}
          </Text>
        </View>
      </View>

      {/* 3. SCROLLABLE LAYOUT */}
      <ScrollView style={styles.scrollContainerWrapper} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* 1. BASIC ERECTION DETAILS CARD */}
        <View style={styles.basicCard}>
          <View style={styles.basicHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.basicHeaderIcon}>📋</Text>
              <View>
                <Text style={styles.basicHeaderTitle}>BASIC ERECTION DETAILS</Text>
                <Text style={styles.basicHeaderSubtitle}>Drawing & Administrative Parameters</Text>
              </View>
            </View>
            <View style={[
              styles.statusPill,
              isRejectedParam ? styles.statusPillRejected : (isLocked ? styles.statusPillCompleted : styles.statusPillPending)
            ]}>
              <Text style={[
                styles.statusPillText,
                isRejectedParam ? styles.statusPillTextRejected : (isLocked ? styles.statusPillTextCompleted : styles.statusPillTextPending)
              ]}>
                {statusLabel}
              </Text>
            </View>
          </View>

          <View style={styles.basicGrid}>
            <View style={styles.basicGridCol}>
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>DRAWING NO</Text>
                <Text style={styles.basicValueHighlight}>{drawingNumber}</Text>
              </View>
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>TYPE OF WORK</Text>
                <Text style={styles.basicValue}>{typeOfWorkLabel}</Text>
              </View>
              {feederName ? (
                <View style={styles.basicField}>
                  <Text style={styles.basicLabel}>11 KV FEEDER</Text>
                  <Text style={styles.basicValue}>{feederName}</Text>
                </View>
              ) : null}
              {dtrCode ? (
                <View style={styles.basicField}>
                  <Text style={styles.basicLabel}>DTR CODE</Text>
                  <Text style={styles.basicValue}>{dtrCode}</Text>
                </View>
              ) : null}
              {ltStartingPointLabel ? (
                <View style={styles.basicField}>
                  <Text style={styles.basicLabel}>LT STARTING POINT</Text>
                  <Text style={styles.basicValue}>{ltStartingPointLabel}</Text>
                </View>
              ) : null}
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>CONTRACTOR FIRM</Text>
                <Text style={styles.basicValue}>{contractorName}</Text>
              </View>
            </View>

            <View style={styles.basicGridCol}>
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>STATE</Text>
                <Text style={styles.basicValue}>{stateName || 'N/A'}</Text>
              </View>
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>DISTRICT</Text>
                <Text style={styles.basicValue}>{districtName || 'N/A'}</Text>
              </View>
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>BLOCK</Text>
                <Text style={styles.basicValue}>{blockName || 'N/A'}</Text>
              </View>
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>VILLAGE / LOCATION</Text>
                <Text style={styles.basicValue}>{villageName || 'N/A'}</Text>
              </View>
              <View style={styles.basicField}>
                <Text style={styles.basicLabel}>TOTAL STRUCTURES</Text>
                <Text style={styles.basicValueHighlight}>{nodes.length} Recorded</Text>
              </View>
            </View>
          </View>

          {remarksText && remarksText !== 'N/A' && remarksText !== 'None' ? (
            <View style={styles.basicRemarksBox}>
              <Text style={styles.basicRemarksLabel}>REMARKS:</Text>
              <Text style={styles.basicRemarksText}>{remarksText}</Text>
            </View>
          ) : null}

          {updatedDate ? (
            <View style={styles.basicFooter}>
              <Text style={styles.basicFooterText}>
                Last Activity: {String(updatedDate)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 2. STATUS / EDIT GUIDE BANNER */}
        {isRejectedParam ? (
          <View style={styles.rejectedBanner}>
            <View style={styles.bannerHeaderRow}>
              <Text style={styles.rejectedTitle}>REJECTED ERECTION - VIEW ONLY</Text>
              <View style={styles.rejectedBadge}>
                <Text style={styles.rejectedBadgeText}>REJECTED</Text>
              </View>
            </View>
            <Text style={styles.rejectedText}>
              This erection execution has been marked as rejected. All captured parameters are locked in read-only mode for inspection.
            </Text>
            {remarksText && remarksText !== 'N/A' && remarksText !== 'None' ? (
              <View style={styles.rejectionReasonBox}>
                <Text style={styles.rejectionReasonLabel}>REJECTION / REMARKS REASON:</Text>
                <Text style={styles.rejectionReasonText}>{remarksText}</Text>
              </View>
            ) : null}
          </View>
        ) : isLocked ? (
          <View style={styles.lockedBanner}>
            <View style={styles.bannerHeaderRow}>
              <Text style={styles.lockedTitle}>COMPLETED ERECTION - VIEW ONLY</Text>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>COMPLETED</Text>
              </View>
            </View>
            <Text style={styles.lockedText}>
              This line was confirmed as complete. All parameters and structures are locked in read-only mode and can no longer be edited or continued.
            </Text>
          </View>
        ) : (
          <View style={styles.editGuide}>
            <Text style={styles.editGuideTitle}>CHOOSE A POLE OR SPAN</Text>
            <Text style={styles.editGuideText}>Tap a span to edit it, or tap any pole to edit its details or continue the line from that point.</Text>
          </View>
        )}

        {/* 3. LINE ROUTING CANVAS */}
        <View style={styles.canvasPanel}>
          <View style={styles.panelHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.panelTitle}>LINE ROUTING LAYOUT</Text>
              {!isLocked && (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleOpenEditModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editIconText}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: isRejectedParam ? '#DC2626' : (isLocked ? '#059669' : accentColor) }]} />
              <Text style={[styles.liveText, { color: isRejectedParam ? '#DC2626' : (isLocked ? '#059669' : accentColor) }]}>
                {isRejectedParam ? 'REJECTED' : (isLocked ? 'VIEW ONLY' : 'INTERACTIVE')}
              </Text>
            </View>
          </View>
          <Text style={styles.canvasSubtitle}>
            {isLocked ? 'Routing layout is permanently locked. Tap any pole to inspect captured parameters.' : 'Tap a pole or span to edit physical parameters.'}
          </Text>

          {nodes.length === 0 ? (
            <View style={styles.emptyCanvas}>
              <Text style={styles.emptyCanvasText}>NO NODES RECORDED FOR SURVEY LINE</Text>
            </View>
          ) : (
            <SurveySvgCanvas
              projectedPoints={projectedPoints}
              selectedNodeId={selectedNodeId}
              selectedSpanNodeId={selectedSpanNodeId}
              accentColor={accentColor}
              showMixedVoltage={survey.lineType === 'LT_440V' && survey.ltStartingPoint === 'HT_TAPPING_POINT'}
              zoomScale={zoomScale}
              handleSelectNode={handleSelectNode}
              handleSelectSpan={handleSelectSpan}
              handleZoomIn={handleZoomIn}
              handleZoomOut={handleZoomOut}
              handleResetZoom={handleResetZoom}
            />
          )}

          {/* Canvas Legend Overlay */}
          <View style={styles.legendBox}>
            <Text style={styles.legendTitle}>STRUCTURE STATUS LEGEND</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDotSym, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.legendText}>New Pole / DTR</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDotSym, { backgroundColor: '#64748B' }]} />
                <Text style={styles.legendText}>Old Pole / DTR</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4. READ-ONLY STRUCTURE INSPECTOR (LOCKED / VIEW ONLY) */}
        {isLocked && activeInspectedNode && (
          <View style={styles.inspectorCard}>
            <View style={styles.inspectorHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.inspectorHeaderIcon}>
                  {activeInspectedNode.nodeType === 'DTR' ? '⚡' : '📍'}
                </Text>
                <View>
                  <Text style={styles.inspectorTitle}>
                    {activeInspectedNode.nameLabel} (Seq #{activeInspectedNode.sequenceNumber})
                  </Text>
                  <Text style={styles.inspectorSubtitle}>
                    {activeInspectedNode.nodeType} Structure • {activeConditionLabel}
                  </Text>
                </View>
              </View>
              <View style={styles.tapToSelectHint}>
                <Text style={styles.tapToSelectText}>TAP CANVAS TO SWITCH</Text>
              </View>
            </View>

            <View style={styles.inspectorGrid}>
              <View style={styles.inspectorCol}>
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>COORDINATES</Text>
                  <Text style={styles.inspectorValueMono}>
                    {activeInspectedNode.latitude?.toFixed(6)}, {activeInspectedNode.longitude?.toFixed(6)}
                  </Text>
                </View>
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>PARENT STRUCTURE</Text>
                  <Text style={styles.inspectorValue}>
                    {activeInspectedNode.parentLabel || 'Root Source'}
                  </Text>
                </View>
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>POLE / MAST TYPE</Text>
                  <Text style={styles.inspectorValue}>
                    {activePoleTypeLabel || 'N/A'}
                  </Text>
                </View>
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>CONDUCTOR / CABLE</Text>
                  <Text style={styles.inspectorValue}>
                    {activeConductorLabel || 'N/A'}
                  </Text>
                </View>
              </View>

              <View style={styles.inspectorCol}>
                {activeInspectedNode.nodeType === 'DTR' && (
                  <View style={styles.inspectorItem}>
                    <Text style={styles.inspectorLabel}>DTR CAPACITY</Text>
                    <Text style={styles.inspectorValueHighlight}>
                      {activeDtrCapacityLabel || 'N/A'}
                    </Text>
                  </View>
                )}
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>EARTHING</Text>
                  <Text style={styles.inspectorValue}>{activeEarthingLabel || 'None'}</Text>
                </View>
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>STAY SET</Text>
                  <Text style={styles.inspectorValue}>{activeStaySetLabel || 'None'}</Text>
                </View>
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>POLE DB</Text>
                  <Text style={styles.inspectorValue}>{activePoleDbLabel || 'None'}</Text>
                </View>
                <View style={styles.inspectorItem}>
                  <Text style={styles.inspectorLabel}>CLAMPING</Text>
                  <Text style={styles.inspectorValue}>{activeClampingLabel || 'N/A'}</Text>
                </View>
              </View>
            </View>

            {/* Accessory Badges */}
            <View style={styles.accessoryBadgesRow}>
              <View style={[styles.accBadge, activeDangerBoard ? styles.accBadgeActive : styles.accBadgeInactive]}>
                <Text style={[styles.accBadgeText, activeDangerBoard ? styles.accBadgeTextActive : styles.accBadgeTextInactive]}>
                  Danger Board: {activeDangerBoard ? 'YES' : 'NO'}
                </Text>
              </View>
              <View style={[styles.accBadge, activeAntiClimbing ? styles.accBadgeActive : styles.accBadgeInactive]}>
                <Text style={[styles.accBadgeText, activeAntiClimbing ? styles.accBadgeTextActive : styles.accBadgeTextInactive]}>
                  Anti-Climbing: {activeAntiClimbing ? 'YES' : 'NO'}
                </Text>
              </View>
              {activeServiceConnQty ? (
                <View style={[styles.accBadge, styles.accBadgeActive]}>
                  <Text style={[styles.accBadgeText, styles.accBadgeTextActive]}>
                    Service Conn: {activeServiceConnQty}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Captured Photos */}
            {activeNodePhotos.length > 0 ? (
              <View style={styles.photosSection}>
                <Text style={styles.inspectorLabel}>CAPTURED PHOTOS ({activeNodePhotos.length}):</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                  {activeNodePhotos.map((uri: string, pIdx: number) => (
                    <TouchableOpacity
                      key={`${uri}-${pIdx}`}
                      onPress={() => setSelectedPhotoModal(uri)}
                      activeOpacity={0.8}
                      style={styles.photoThumbWrapper}
                    >
                      <Image source={{ uri }} style={styles.photoThumb} resizeMode="cover" />
                      <View style={styles.photoIndexBadge}>
                        <Text style={styles.photoIndexText}>#{pIdx + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}
          </View>
        )}

        {/* 5. ERECTED STRUCTURES SUMMARY LIST (LOCKED / VIEW ONLY) */}
        {isLocked && nodes.length > 0 && (
          <View style={styles.structuresListCard}>
            <View style={styles.structuresListHeader}>
              <Text style={styles.structuresListTitle}>ERECTED STRUCTURES SUMMARY</Text>
              <Text style={styles.structuresListCount}>{nodes.length} TOTAL</Text>
            </View>
            {nodes.map((node: any, idx: number) => {
              const isSelected = activeInspectedNode?.id === node.id;
              const isDtr = node.nodeType === 'DTR';
              const photosCount = Array.isArray(node.imageUris) ? node.imageUris.length : (node.imageUri ? 1 : 0);
              return (
                <TouchableOpacity
                  key={node.id || `node-${idx}`}
                  style={[styles.structureRow, isSelected && styles.structureRowSelected]}
                  onPress={() => {
                    setSelectedNodeId(node.id);
                    setSelectedSpanNodeId(null);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={[styles.structureSeqBadge, isSelected && styles.structureSeqBadgeSelected]}>
                    <Text style={[styles.structureSeqText, isSelected && styles.structureSeqTextSelected]}>
                      #{node.sequenceNumber || idx + 1}
                    </Text>
                  </View>
                  <View style={styles.structureRowMain}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={styles.structureRowTitle}>{node.nameLabel}</Text>
                      <View style={[styles.structureTypeTag, isDtr && styles.structureTypeTagDtr, { marginLeft: 8 }]}>
                        <Text style={[styles.structureTypeTagText, isDtr && styles.structureTypeTagTextDtr]}>
                          {node.nodeType}
                        </Text>
                      </View>
                      {photosCount > 0 && (
                        <View style={styles.structurePhotosCountTag}>
                          <Text style={styles.structurePhotosCountText}>📷 {photosCount}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.structureRowCoords}>
                      Lat: {node.latitude?.toFixed(5)}, Lng: {node.longitude?.toFixed(5)}
                      {node.parentLabel ? ` • From: ${node.parentLabel}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* 6. MATERIAL & BoQ SUMMARY SECTION */}
        <View style={styles.materialSection}>
          <View style={styles.materialSectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.materialHeaderIcon}>📦</Text>
              <View>
                <Text style={styles.materialHeaderTitle}>MATERIAL & BoQ SUMMARY</Text>
                <Text style={styles.materialHeaderSubtitle}>
                  Computed Bill of Quantities across {nodes.length} structure(s)
                </Text>
              </View>
            </View>
            <View style={styles.materialTotalBadge}>
              <Text style={styles.materialTotalBadgeText}>{nodes.length} STRUCTURES</Text>
            </View>
          </View>

          {/* Quick Metrics Bar */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricScroll} contentContainerStyle={styles.metricScrollContent}>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipNum}>{materialSummary.poles.total}</Text>
              <Text style={styles.metricChipLabel}>Poles</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipNum}>{materialSummary.dtr.total}</Text>
              <Text style={styles.metricChipLabel}>DTRs</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipNum}>{materialSummary.staySet.total}</Text>
              <Text style={styles.metricChipLabel}>Stay Sets</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipNum}>{materialSummary.earthing.total}</Text>
              <Text style={styles.metricChipLabel}>Earthing</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipNum}>{materialSummary.totalPoleDb}</Text>
              <Text style={styles.metricChipLabel}>Pole DBs</Text>
            </View>
            <View style={styles.metricChip}>
              <Text style={styles.metricChipNum}>{materialSummary.totalSpans}</Text>
              <Text style={styles.metricChipLabel}>Spans</Text>
            </View>
          </ScrollView>

          {/* 1. POLE SUMMARY CARD */}
          <View style={styles.matCard}>
            <View style={styles.matCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.matCardIcon}>🪵</Text>
                <Text style={styles.matCardTitle}>1. POLE INVENTORY</Text>
              </View>
              <View style={styles.matCardBadge}>
                <Text style={styles.matCardBadgeText}>{materialSummary.poles.total} TOTAL</Text>
              </View>
            </View>

            {/* Global Pole Subtotals */}
            <View style={styles.poleGlobalPillsRow}>
              <View style={[styles.polePill, styles.polePillConcrete]}>
                <Text style={styles.polePillLabel}>Concrete (PCC/RCC)</Text>
                <Text style={styles.polePillValue}>{materialSummary.poles.totalConcrete}</Text>
              </View>
              <View style={[styles.polePill, styles.polePillNonConcrete]}>
                <Text style={styles.polePillLabel}>Non-Concrete (STP/Steel)</Text>
                <Text style={styles.polePillValue}>{materialSummary.poles.totalNonConcrete}</Text>
              </View>
              <View style={[styles.polePill, styles.polePillNew]}>
                <Text style={styles.polePillLabel}>New Poles</Text>
                <Text style={styles.polePillValue}>{materialSummary.poles.totalNew}</Text>
              </View>
              <View style={[styles.polePill, styles.polePillOld]}>
                <Text style={styles.polePillLabel}>Existing Poles</Text>
                <Text style={styles.polePillValue}>{materialSummary.poles.totalOld}</Text>
              </View>
            </View>

            {/* Height Breakdown Items */}
            <View style={styles.heightBreakdownList}>
              {/* a. 8M Poles */}
              <View style={styles.heightItemBox}>
                <View style={styles.heightItemHeader}>
                  <Text style={styles.heightItemTitle}>a. 8M Poles</Text>
                  <Text style={styles.heightItemTotal}>{materialSummary.poles['8M'].total} Poles</Text>
                </View>
                <View style={styles.heightItemChipsRow}>
                  <View style={styles.heightSubChip}>
                    <Text style={styles.heightSubChipLabel}>Concrete Pole Qty:</Text>
                    <Text style={styles.heightSubChipVal}>{materialSummary.poles['8M'].concrete}</Text>
                  </View>
                  <View style={styles.heightSubChip}>
                    <Text style={styles.heightSubChipLabel}>Non-Concrete Pole Qty:</Text>
                    <Text style={styles.heightSubChipVal}>{materialSummary.poles['8M'].nonConcrete}</Text>
                  </View>
                </View>
              </View>

              {/* b. 9M Poles */}
              <View style={styles.heightItemBox}>
                <View style={styles.heightItemHeader}>
                  <Text style={styles.heightItemTitle}>b. 9M Poles</Text>
                  <Text style={styles.heightItemTotal}>{materialSummary.poles['9M'].total} Poles</Text>
                </View>
                <View style={styles.heightItemChipsRow}>
                  <View style={styles.heightSubChip}>
                    <Text style={styles.heightSubChipLabel}>Concrete Pole Qty:</Text>
                    <Text style={styles.heightSubChipVal}>{materialSummary.poles['9M'].concrete}</Text>
                  </View>
                  <View style={styles.heightSubChip}>
                    <Text style={styles.heightSubChipLabel}>Non-Concrete Pole Qty:</Text>
                    <Text style={styles.heightSubChipVal}>{materialSummary.poles['9M'].nonConcrete}</Text>
                  </View>
                </View>
              </View>

              {/* c. 11M Poles */}
              <View style={styles.heightItemBox}>
                <View style={styles.heightItemHeader}>
                  <Text style={styles.heightItemTitle}>c. 11M Poles</Text>
                  <Text style={styles.heightItemTotal}>{materialSummary.poles['11M'].total} Poles</Text>
                </View>
                <View style={styles.heightItemChipsRow}>
                  <View style={styles.heightSubChip}>
                    <Text style={styles.heightSubChipLabel}>Concrete Pole Qty:</Text>
                    <Text style={styles.heightSubChipVal}>{materialSummary.poles['11M'].concrete}</Text>
                  </View>
                  <View style={styles.heightSubChip}>
                    <Text style={styles.heightSubChipLabel}>Non-Concrete Pole Qty:</Text>
                    <Text style={styles.heightSubChipVal}>{materialSummary.poles['11M'].nonConcrete}</Text>
                  </View>
                </View>
              </View>

              {/* Other Poles (if any) */}
              {materialSummary.poles['other'].total > 0 && (
                <View style={styles.heightItemBox}>
                  <View style={styles.heightItemHeader}>
                    <Text style={styles.heightItemTitle}>d. Other / Custom Poles</Text>
                    <Text style={styles.heightItemTotal}>{materialSummary.poles['other'].total} Poles</Text>
                  </View>
                  <View style={styles.heightItemChipsRow}>
                    <View style={styles.heightSubChip}>
                      <Text style={styles.heightSubChipLabel}>Concrete Pole Qty:</Text>
                      <Text style={styles.heightSubChipVal}>{materialSummary.poles['other'].concrete}</Text>
                    </View>
                    <View style={styles.heightSubChip}>
                      <Text style={styles.heightSubChipLabel}>Non-Concrete Pole Qty:</Text>
                      <Text style={styles.heightSubChipVal}>{materialSummary.poles['other'].nonConcrete}</Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          </View>

          {/* 2. DTR CARD */}
          <View style={styles.matCard}>
            <View style={styles.matCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.matCardIcon}>⚡</Text>
                <Text style={styles.matCardTitle}>2. DISTRIBUTION TRANSFORMERS (DTR)</Text>
              </View>
              <View style={styles.matCardBadgeDtr}>
                <Text style={styles.matCardBadgeTextDtr}>{materialSummary.dtr.total} DTRs</Text>
              </View>
            </View>

            {materialSummary.dtr.total === 0 ? (
              <View style={styles.emptyMatRow}>
                <Text style={styles.emptyMatText}>No DTR substation structures recorded in this line.</Text>
              </View>
            ) : (
              <View style={styles.dtrBreakdownList}>
                {Object.entries(materialSummary.dtr.byCapacity).map(([capacity, dtrData]) => (
                  <View key={capacity} style={styles.dtrItemRow}>
                    <View style={styles.dtrCapacityBadge}>
                      <Text style={styles.dtrCapacityText}>{capacity}</Text>
                    </View>
                    <View style={styles.dtrQuantitiesGroup}>
                      <View style={styles.dtrQtyChipNew}>
                        <Text style={styles.dtrQtyLabelNew}>New:</Text>
                        <Text style={styles.dtrQtyValNew}>{dtrData.newQty}</Text>
                      </View>
                      <View style={styles.dtrQtyChipOld}>
                        <Text style={styles.dtrQtyLabelOld}>Existing:</Text>
                        <Text style={styles.dtrQtyValOld}>{dtrData.existingQty}</Text>
                      </View>
                    </View>
                    <View style={styles.dtrRowTotalBox}>
                      <Text style={styles.dtrRowTotalText}>{dtrData.total} Unit(s)</Text>
                    </View>
                  </View>
                ))}

                <View style={styles.matCardSubtotalRow}>
                  <Text style={styles.matCardSubtotalText}>
                    Total DTRs: {materialSummary.dtr.total} (New: {materialSummary.dtr.totalNew}, Existing: {materialSummary.dtr.totalExisting})
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* 3. STAY SET CARD */}
          <View style={styles.matCard}>
            <View style={styles.matCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.matCardIcon}>⚓</Text>
                <Text style={styles.matCardTitle}>3. STAY SETS & ANCHORING</Text>
              </View>
              <View style={styles.matCardBadge}>
                <Text style={styles.matCardBadgeText}>{materialSummary.staySet.total} SETS</Text>
              </View>
            </View>

            <View style={styles.matGrid2Cols}>
              <View style={styles.matStatCard}>
                <Text style={styles.matStatCardLabel}>HT Stay Set</Text>
                <Text style={styles.matStatCardValue}>{materialSummary.staySet.htQty}</Text>
                <Text style={styles.matStatCardUnit}>Installed Sets</Text>
              </View>
              <View style={styles.matStatCard}>
                <Text style={styles.matStatCardLabel}>LT Stay Set</Text>
                <Text style={styles.matStatCardValue}>{materialSummary.staySet.ltQty}</Text>
                <Text style={styles.matStatCardUnit}>Installed Sets</Text>
              </View>
            </View>

            {Object.keys(materialSummary.staySet.byType).length > 2 && (
              <View style={styles.matSubTypesList}>
                {Object.entries(materialSummary.staySet.byType).map(([typeName, qty]) => (
                  <View key={typeName} style={styles.matSubTypeRow}>
                    <Text style={styles.matSubTypeLabel}>{typeName}</Text>
                    <Text style={styles.matSubTypeQty}>{qty} Sets</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 4. EARTHING CARD */}
          <View style={styles.matCard}>
            <View style={styles.matCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.matCardIcon}>⏚</Text>
                <Text style={styles.matCardTitle}>4. EARTHING INSTALLATIONS</Text>
              </View>
              <View style={styles.matCardBadge}>
                <Text style={styles.matCardBadgeText}>{materialSummary.earthing.total} UNITS</Text>
              </View>
            </View>

            <View style={styles.matGrid3Cols}>
              <View style={styles.matStatCard}>
                <Text style={styles.matStatCardLabel}>Coil Earthing</Text>
                <Text style={styles.matStatCardValue}>{materialSummary.earthing.coilQty}</Text>
                <Text style={styles.matStatCardUnit}>Qty</Text>
              </View>
              <View style={styles.matStatCard}>
                <Text style={styles.matStatCardLabel}>Pipe Earthing</Text>
                <Text style={styles.matStatCardValue}>{materialSummary.earthing.pipeQty}</Text>
                <Text style={styles.matStatCardUnit}>Qty</Text>
              </View>
              <View style={styles.matStatCard}>
                <Text style={styles.matStatCardLabel}>Plate Earthing</Text>
                <Text style={styles.matStatCardValue}>{materialSummary.earthing.plateQty}</Text>
                <Text style={styles.matStatCardUnit}>Qty</Text>
              </View>
            </View>

            {Object.keys(materialSummary.earthing.byType).length > 3 && (
              <View style={styles.matSubTypesList}>
                {Object.entries(materialSummary.earthing.byType).map(([typeName, qty]) => (
                  <View key={typeName} style={styles.matSubTypeRow}>
                    <Text style={styles.matSubTypeLabel}>{typeName}</Text>
                    <Text style={styles.matSubTypeQty}>{qty} Units</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 5. CONDUCTORS & CABLING CARD */}
          <View style={styles.matCard}>
            <View style={styles.matCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.matCardIcon}>〰️</Text>
                <Text style={styles.matCardTitle}>5. CONDUCTORS & CABLING</Text>
              </View>
              <View style={styles.matCardBadge}>
                <Text style={styles.matCardBadgeText}>{materialSummary.totalSpans} SPANS</Text>
              </View>
            </View>

            {Object.keys(materialSummary.conductors).length === 0 ? (
              <View style={styles.emptyMatRow}>
                <Text style={styles.emptyMatText}>No conductor or cabling parameters recorded.</Text>
              </View>
            ) : (
              <View style={styles.matConductorList}>
                {Object.values(materialSummary.conductors).map((cond) => (
                  <View key={cond.name} style={styles.matConductorRow}>
                    <View style={styles.matConductorMain}>
                      <Text style={styles.matConductorName}>{cond.name}</Text>
                      <Text style={styles.matConductorSub}>
                        {cond.spans} span(s)
                        {cond.totalLength > 0 ? ` • ${cond.totalLength} meters` : ''}
                      </Text>
                    </View>
                    <View style={styles.matConductorSpansBadge}>
                      <Text style={styles.matConductorSpansText}>{cond.spans} Spans</Text>
                    </View>
                  </View>
                ))}
                {materialSummary.totalLineLengthMeters > 0 && (
                  <View style={styles.matCardSubtotalRow}>
                    <Text style={styles.matCardSubtotalText}>
                      Total Recorded Line Length: ~{materialSummary.totalLineLengthMeters} meters
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* 6. POLE DISTRIBUTION BOXES (DB) */}
          <View style={styles.matCard}>
            <View style={styles.matCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.matCardIcon}>🔲</Text>
                <Text style={styles.matCardTitle}>6. POLE DISTRIBUTION BOXES (DB)</Text>
              </View>
              <View style={styles.matCardBadge}>
                <Text style={styles.matCardBadgeText}>{materialSummary.totalPoleDb} TOTAL</Text>
              </View>
            </View>

            {Object.keys(materialSummary.poleDb).length === 0 ? (
              <View style={styles.emptyMatRow}>
                <Text style={styles.emptyMatText}>No Pole DB units recorded in this erection section.</Text>
              </View>
            ) : (
              <View style={styles.matSubTypesList}>
                {Object.values(materialSummary.poleDb).map((db) => (
                  <View key={db.name} style={styles.matSubTypeRow}>
                    <Text style={styles.matSubTypeLabel}>{db.name}</Text>
                    <Text style={styles.matSubTypeQty}>{db.qty} Installed</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* 7. ACCESSORIES & SAFETY HARDWARE */}
          <View style={styles.matCard}>
            <View style={styles.matCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.matCardIcon}>🛡️</Text>
                <Text style={styles.matCardTitle}>7. ACCESSORIES & HARDWARE</Text>
              </View>
            </View>

            <View style={styles.matGrid2Cols}>
              <View style={styles.matStatCard}>
                <Text style={styles.matStatCardLabel}>Danger Boards</Text>
                <Text style={styles.matStatCardValue}>{materialSummary.accessories.dangerBoards}</Text>
                <Text style={styles.matStatCardUnit}>Fitted</Text>
              </View>
              <View style={styles.matStatCard}>
                <Text style={styles.matStatCardLabel}>Anti-Climbing</Text>
                <Text style={styles.matStatCardValue}>{materialSummary.accessories.antiClimbing}</Text>
                <Text style={styles.matStatCardUnit}>Devices</Text>
              </View>
            </View>

            {/* Service Connections */}
            <View style={styles.serviceConnBox}>
              <View style={styles.serviceConnHeader}>
                <Text style={styles.serviceConnTitle}>Service Connections</Text>
                <Text style={styles.serviceConnTotal}>
                  {materialSummary.accessories.serviceConnectionsTotal} Connections
                </Text>
              </View>
              {Object.keys(materialSummary.accessories.serviceConnectionsByType).length > 0 ? (
                <View style={styles.serviceConnTypeList}>
                  {Object.entries(materialSummary.accessories.serviceConnectionsByType).map(([sName, sQty]) => (
                    <View key={sName} style={styles.serviceConnTypeRow}>
                      <Text style={styles.serviceConnTypeLabel}>{sName}:</Text>
                      <Text style={styles.serviceConnTypeQty}>{sQty} Nos</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>

            {/* Clamping Arrangements */}
            {Object.keys(materialSummary.accessories.clampingByType).length > 0 && (
              <View style={styles.clampingBox}>
                <Text style={styles.clampingTitle}>Clamping Arrangements Fitted</Text>
                <View style={styles.clampingList}>
                  {Object.entries(materialSummary.accessories.clampingByType).map(([cName, cQty]) => (
                    <View key={cName} style={styles.clampingRow}>
                      <Text style={styles.clampingLabel}>{cName}:</Text>
                      <Text style={styles.clampingQty}>{cQty} Nos</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* INLINE ATTRS EDITOR */}
        {!isLocked && <SurveyAttributeEditor
          selectedNodeId={selectedNodeId}
          selectedSpanNodeId={selectedSpanNodeId}
          nodeName={nodeName}
          setNodeName={setNodeName}
          nodeParentLabel={nodeParentLabel}
          setNodeParentLabel={setNodeParentLabel}
          nodeHeight={nodeHeight}
          setNodeHeight={setNodeHeight}
          nodePoleType={nodePoleType}
          setNodePoleType={setNodePoleType}
          nodeLat={nodeLat}
          setNodeLat={setNodeLat}
          nodeLng={nodeLng}
          setNodeLng={setNodeLng}
          nodeCableSize={nodeCableSize}
          setNodeCableSize={setNodeCableSize}
          nodeTilt={nodeTilt}
          setNodeTilt={setNodeTilt}
          nodeSag={nodeSag}
          setNodeSag={setNodeSag}
          nodeSpanDistance={nodeSpanDistance}
          setNodeSpanDistance={setNodeSpanDistance}
          onCancel={() => { setSelectedNodeId(null); setSelectedSpanNodeId(null); }}
          onApply={handleSaveNodeUpdates}
        />}

        {!isLocked && selectedPole && (
          <View style={styles.continuationPanel}>
            <View style={styles.continuationCopy}>
              <Text style={styles.continuationTitle}>CONTINUE FROM {selectedPole.nameLabel}</Text>
              <Text style={styles.continuationText}>Capture a new branch or extend the route from this pole.</Text>
            </View>
            <TouchableOpacity style={styles.continuationButton} onPress={handleContinueFromPole}>
              <Text style={styles.continuationButtonText}>START HERE</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Photo Viewer Modal */}
      <Modal
        visible={Boolean(selectedPhotoModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoModal(null)}
      >
        <Pressable style={styles.photoModalOverlay} onPress={() => setSelectedPhotoModal(null)}>
          <View style={styles.photoModalCard}>
            <TouchableOpacity
              style={styles.photoModalCloseBtn}
              onPress={() => setSelectedPhotoModal(null)}
            >
              <Text style={styles.photoModalCloseText}>✕ CLOSE</Text>
            </TouchableOpacity>
            {selectedPhotoModal && (
              <Image
                source={{ uri: selectedPhotoModal }}
                style={styles.photoModalFullImage}
                resizeMode="contain"
              />
            )}
          </View>
        </Pressable>
      </Modal>

      {/* Beautiful Edit Structure / Continuation Modal */}
      <Modal
        visible={confirmEditModalVisible && !isLocked}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loadingPoleDetails) setConfirmEditModalVisible(false);
        }}
      >
        <Pressable
          style={styles.modalOverlayCenter}
          onPress={() => {
            if (!loadingPoleDetails) setConfirmEditModalVisible(false);
          }}
        >
          <Pressable style={styles.confirmCard} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmHeader}>
              <Text style={styles.confirmIcon}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmTitle}>EDIT STRUCTURE / CONTINUATION</Text>
                {survey.drawingNo ? (
                  <Text style={styles.dwgBadgeText}>DWG NO: {survey.drawingNo}</Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.confirmBodyText}>
              Select a pole to load its saved details from the database against this drawing, or continue line branching from it:
            </Text>

            {/* Pole Selection List */}
            <Text style={styles.polePickerLabel}>CHOOSE POLE / STRUCTURE:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.poleChipsScroll}
              contentContainerStyle={styles.poleChipsContent}
            >
              {nodes.map((node) => {
                const isSelected = selectedEditPole === node.nameLabel;
                const isDtr = node.nodeType === 'DTR';
                return (
                  <TouchableOpacity
                    key={node.id}
                    style={[
                      styles.poleChip,
                      isSelected && styles.poleChipSelected,
                      isDtr && styles.poleChipDtr,
                      isDtr && isSelected && styles.poleChipDtrSelected,
                    ]}
                    onPress={() => setSelectedEditPole(node.nameLabel)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.poleChipText,
                      isSelected && styles.poleChipTextSelected,
                      isDtr && styles.poleChipTextDtr,
                    ]}>
                      {node.nameLabel}
                    </Text>
                    <Text style={[
                      styles.poleChipSeq,
                      isSelected && styles.poleChipSeqSelected,
                    ]}>
                      #{node.sequenceNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingPoleDetails ? (
              <View style={styles.loadingPoleBox}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.loadingPoleText}>
                  Fetching {selectedEditPole} details from DB...
                </Text>
              </View>
            ) : (
              <View style={styles.modalActionButtonsCol}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, !selectedEditPole && styles.actionBtnDisabled]}
                  disabled={!selectedEditPole || loadingPoleDetails}
                  onPress={() => handleEditChosenPole(selectedEditPole)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>
                    EDIT POLE DETAILS ({selectedEditPole || 'SELECT'})
                  </Text>
                  <Text style={styles.actionBtnSubtext}>
                    Loads and fills all saved database details for updating
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, !selectedEditPole && styles.actionBtnDisabled]}
                  disabled={!selectedEditPole || loadingPoleDetails}
                  onPress={() => handleContinueFromChosenPole(selectedEditPole)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryActionBtnText}>
                    CONTINUE LINE FROM {selectedEditPole || 'THIS POLE'}
                  </Text>
                  <Text style={styles.secondaryBtnSubtext}>
                    Add new pole structures with GPS connecting line
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelLinkBtn}
                  onPress={() => setConfirmEditModalVisible(false)}
                >
                  <Text style={styles.cancelLinkText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 20,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
  },
  backText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  backBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  classBadge: {
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContainerWrapper: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  lockedBanner: {
    borderWidth: 1.2,
    borderColor: '#94A3B8',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    padding: 14,
    marginBottom: 14,
  },
  lockedTitle: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  lockedText: { color: '#64748B', fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  editGuide: {
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    padding: 14,
    marginBottom: 14,
  },
  editGuideTitle: { color: '#0369A1', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  editGuideText: { color: '#475569', fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  canvasPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  canvasSubtitle: {
    color: '#64748B',
    fontSize: 9.5,
    marginBottom: 12,
  },
  emptyCanvas: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
  },
  emptyCanvasText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  legendBox: {
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(2, 132, 199, 0.08)',
    marginTop: 14,
    paddingTop: 12,
  },
  legendTitle: {
    color: 'rgba(15, 23, 42, 0.35)',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginHorizontal: -4,
  },
  legendItem: {
    width: '50%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
  },
  legendSym: {
    width: 20,
    height: 12,
    position: 'relative',
    marginRight: 6,
  },
  legendCircleOverLeft: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderColor: '#8B5CF6',
    borderWidth: 1.2,
  },
  legendCircleOverRight: {
    position: 'absolute',
    left: 7,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderColor: '#8B5CF6',
    borderWidth: 1.2,
  },
  legendText: {
    flex: 1,
    color: '#64748B',
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 13,
  },
  legendWavySym: {
    color: '#0284C7',
    fontSize: 10,
    marginRight: 6,
    letterSpacing: -2,
  },
  legendDotSym: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  continuationPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#059669',
    borderRadius: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.06)',
    padding: 14,
    marginBottom: 20,
  },
  continuationCopy: { flex: 1, marginRight: 12 },
  continuationTitle: { color: '#047857', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  continuationText: { color: '#64748B', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  continuationButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  continuationButtonText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  editIconButton: {
    marginLeft: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconText: {
    fontSize: 10,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  confirmTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  confirmBodyText: {
    color: '#475569',
    fontSize: 10.5,
    lineHeight: 16,
    marginBottom: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  confirmCancelText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  confirmResumeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  confirmResumeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dwgBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  polePickerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  poleChipsScroll: {
    maxHeight: 56,
    marginBottom: 16,
  },
  poleChipsContent: {
    gap: 8,
    paddingVertical: 2,
  },
  poleChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  poleChipSelected: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  poleChipDtr: {
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  poleChipDtrSelected: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  poleChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  poleChipTextSelected: {
    color: '#0284C7',
  },
  poleChipTextDtr: {
    color: '#7C3AED',
  },
  poleChipSeq: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  poleChipSeqSelected: {
    color: '#0284C7',
  },
  loadingPoleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  loadingPoleText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  modalActionButtonsCol: {
    gap: 10,
  },
  primaryActionBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtnSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 8.5,
    marginTop: 2,
  },
  secondaryActionBtn: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#059669',
    borderWidth: 1.2,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryBtnSubtext: {
    color: '#047857',
    fontSize: 8.5,
    marginTop: 2,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  cancelLinkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  cancelLinkText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Basic Details Card */
  basicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  basicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 12,
    marginBottom: 12,
  },
  basicHeaderIcon: {
    fontSize: 20,
  },
  basicHeaderTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  basicHeaderSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillCompleted: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#059669',
  },
  statusPillRejected: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: '#DC2626',
  },
  statusPillPending: {
    backgroundColor: 'rgba(217, 119, 6, 0.08)',
    borderColor: '#D97706',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusPillTextCompleted: { color: '#059669' },
  statusPillTextRejected: { color: '#DC2626' },
  statusPillTextPending: { color: '#D97706' },
  basicGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  basicGridCol: {
    flex: 1,
    gap: 8,
  },
  basicField: {
    paddingVertical: 2,
  },
  basicLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  basicValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  basicValueHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  basicRemarksBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  basicRemarksLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  basicRemarksText: {
    fontSize: 11,
    color: '#334155',
    lineHeight: 16,
  },
  basicFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  basicFooterText: {
    fontSize: 9,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'right',
  },

  /* Rejected Banner */
  rejectedBanner: {
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    padding: 14,
    marginBottom: 14,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rejectedTitle: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  rejectedBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rejectedBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rejectedText: {
    color: '#B91C1C',
    fontSize: 10.5,
    lineHeight: 16,
  },
  rejectionReasonBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionReasonLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rejectionReasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7F1D1D',
  },
  completedBadge: {
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  completedBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Read-Only Structure Inspector */
  inspectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  inspectorHeaderIcon: {
    fontSize: 20,
  },
  inspectorTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  inspectorSubtitle: {
    fontSize: 9.5,
    color: '#0284C7',
    fontWeight: '700',
    marginTop: 1,
  },
  tapToSelectHint: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tapToSelectText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  inspectorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inspectorCol: {
    flex: 1,
    gap: 8,
  },
  inspectorItem: {
    paddingVertical: 2,
  },
  inspectorLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  inspectorValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  inspectorValueMono: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0369A1',
    fontFamily: 'monospace',
  },
  inspectorValueHighlight: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#7C3AED',
  },
  accessoryBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  accBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  accBadgeActive: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  accBadgeInactive: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  accBadgeText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  accBadgeTextActive: {
    color: '#15803D',
  },
  accBadgeTextInactive: {
    color: '#94A3B8',
  },
  photosSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  photosScroll: {
    marginTop: 6,
  },
  photoThumbWrapper: {
    marginRight: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: {
    width: 68,
    height: 68,
    borderRadius: 7,
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: 'bold',
  },

  /* Structures List Card */
  structuresListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  structuresListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  structuresListTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  structuresListCount: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#0284C7',
  },
  structureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    backgroundColor: '#FAFAFA',
    marginBottom: 6,
  },
  structureRowSelected: {
    borderColor: '#0284C7',
    backgroundColor: '#F0F9FF',
  },
  structureSeqBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  structureSeqBadgeSelected: {
    backgroundColor: '#0284C7',
  },
  structureSeqText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  structureSeqTextSelected: {
    color: '#FFFFFF',
  },
  structureRowMain: {
    flex: 1,
  },
  structureRowTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  structureRowCoords: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  structureTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#E0F2FE',
  },
  structureTypeTagDtr: {
    backgroundColor: '#EDE9FE',
  },
  structureTypeTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#0284C7',
  },
  structureTypeTagTextDtr: {
    color: '#7C3AED',
  },
  structurePhotosCountTag: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#FEF3C7',
    marginLeft: 6,
  },
  structurePhotosCountText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#D97706',
  },

  /* Photo Modal Overlay */
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  photoModalCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    paddingBottom: 16,
  },
  photoModalCloseBtn: {
    alignSelf: 'flex-end',
    padding: 12,
  },
  photoModalCloseText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  photoModalFullImage: {
    width: '100%',
    height: 380,
    borderRadius: 12,
  },

  /* Material Summary Section */
  materialSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  materialSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  materialHeaderIcon: {
    fontSize: 22,
  },
  materialHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 1,
  },
  materialHeaderSubtitle: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 1,
  },
  materialTotalBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  materialTotalBadgeText: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metricScroll: {
    marginBottom: 16,
  },
  metricScrollContent: {
    gap: 8,
    paddingVertical: 2,
  },
  metricChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    alignItems: 'center',
    minWidth: 70,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  metricChipNum: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0284C7',
  },
  metricChipLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },

  /* Material Card General */
  matCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  matCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
    marginBottom: 12,
  },
  matCardIcon: {
    fontSize: 18,
  },
  matCardTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.8,
  },
  matCardBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  matCardBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  matCardBadgeDtr: {
    backgroundColor: 'rgba(124, 58, 237, 0.08)',
    borderColor: '#7C3AED',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  matCardBadgeTextDtr: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#7C3AED',
    letterSpacing: 0.5,
  },

  /* Pole Global Pills */
  poleGlobalPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  polePill: {
    flex: 1,
    minWidth: '47%',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  polePillConcrete: {
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
  },
  polePillNonConcrete: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  polePillNew: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
  },
  polePillOld: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  polePillLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#475569',
  },
  polePillValue: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },

  /* Height Breakdown List */
  heightBreakdownList: {
    gap: 8,
  },
  heightItemBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  heightItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heightItemTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  heightItemTotal: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0284C7',
  },
  heightItemChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  heightSubChip: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heightSubChipLabel: {
    fontSize: 8.5,
    color: '#64748B',
    fontWeight: '600',
  },
  heightSubChipVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '800',
  },

  /* DTR Breakdown List */
  dtrBreakdownList: {
    gap: 8,
  },
  dtrItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  dtrCapacityBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 72,
    alignItems: 'center',
  },
  dtrCapacityText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#7C3AED',
  },
  dtrQuantitiesGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  dtrQtyChipNew: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderColor: '#86EFAC',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  dtrQtyLabelNew: {
    fontSize: 8.5,
    color: '#15803D',
    fontWeight: '600',
  },
  dtrQtyValNew: {
    fontSize: 10.5,
    color: '#15803D',
    fontWeight: '800',
  },
  dtrQtyChipOld: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
  },
  dtrQtyLabelOld: {
    fontSize: 8.5,
    color: '#475569',
    fontWeight: '600',
  },
  dtrQtyValOld: {
    fontSize: 10.5,
    color: '#475569',
    fontWeight: '800',
  },
  dtrRowTotalBox: {
    minWidth: 64,
    alignItems: 'flex-end',
  },
  dtrRowTotalText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  matCardSubtotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  matCardSubtotalText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'right',
  },

  /* Mat Grid Multi-Cols */
  matGrid2Cols: {
    flexDirection: 'row',
    gap: 10,
  },
  matGrid3Cols: {
    flexDirection: 'row',
    gap: 8,
  },
  matStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    alignItems: 'center',
  },
  matStatCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  matStatCardValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0284C7',
  },
  matStatCardUnit: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },

  /* SubTypes List */
  matSubTypesList: {
    marginTop: 8,
    gap: 6,
  },
  matSubTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  matSubTypeLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#334155',
  },
  matSubTypeQty: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0284C7',
  },

  /* Conductor List */
  matConductorList: {
    gap: 8,
  },
  matConductorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  matConductorMain: {
    flex: 1,
    paddingRight: 8,
  },
  matConductorName: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  matConductorSub: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
  },
  matConductorSpansBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  matConductorSpansText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
  },

  /* Empty Mat Row */
  emptyMatRow: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyMatText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  /* Service Connections & Clamping in accessories */
  serviceConnBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  serviceConnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceConnTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  serviceConnTotal: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#059669',
  },
  serviceConnTypeList: {
    marginTop: 6,
    gap: 4,
  },
  serviceConnTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  serviceConnTypeLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  serviceConnTypeQty: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
  },
  clampingBox: {
    marginTop: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
  },
  clampingTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  clampingList: {
    gap: 4,
  },
  clampingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  clampingLabel: {
    fontSize: 9,
    color: '#64748B',
  },
  clampingQty: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#334155',
  },
});
