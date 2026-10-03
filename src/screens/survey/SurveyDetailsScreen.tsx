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
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, resumeSurvey, resumeSurveyWithPole, updateSurveyNode, SurveyNode } from '../../store';
import { fetchDomainsAction, fetchTransformersAction, fetchConductorsAction, fetchPolesAction } from '../../store/actions/masterAction';
import { updateSpanDistanceAction } from '../../store/actions/erectionAction';
import { GetSurveyDetailService, GetSurveyPoleDetailsService } from '../../services/erectionService';
import { useToast } from '../../components/ToastProvider';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';

import SurveySvgCanvas from './components/SurveySvgCanvas';
import SurveyAttributeEditor from './components/SurveyAttributeEditor';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 320;
const SVG_HEIGHT = 240;

export default function SurveyDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [detailsTab, setDetailsTab] = useState<'routing' | 'materials'>('routing');
  const [showBasicDetails, setShowBasicDetails] = useState(false);
  const toast = useToast();
  const { confirm } = useConfirmation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const { surveyId, editMode = false } = route.params;
  const historyList = useSelector((state: RootState) => state.survey.historyList) || [];
  const survey = historyList.find(
    (l: any) =>
      String(l.id) === String(surveyId) ||
      String(l.id) === `srv-${surveyId}` ||
      String(l.id).replace('srv-', '') === String(surveyId)
  );

  const domains = useSelector((state: RootState) => state.master.domains) || {};
  const rawTransformers = useSelector((state: RootState) => state.master.transformers);
  const rawConductors = useSelector((state: RootState) => state.master.conductors);
  const rawPoles = useSelector((state: RootState) => state.master.poles);

  const transformers = useMemo(() => (Array.isArray(rawTransformers) ? rawTransformers : []), [rawTransformers]);
  const conductors = useMemo(() => (Array.isArray(rawConductors) ? rawConductors : []), [rawConductors]);
  const poles = useMemo(() => (Array.isArray(rawPoles) ? rawPoles : []), [rawPoles]);

  const [serverDetail, setServerDetail] = useState<any>(null);
  const [loadingServerDetail, setLoadingServerDetail] = useState<boolean>(false);

  // Fetch survey detail and material summary from backend
  useEffect(() => {
    const rawId = String(surveyId || '').replace('srv-', '').replace('erect-', '');
    if (rawId && !isNaN(Number(rawId))) {
      setLoadingServerDetail(true);
      GetSurveyDetailService({ id: Number(rawId), survey_line_id: Number(rawId) })
        .then((res: any) => {
          setLoadingServerDetail(false);
          if (res?.data?.Data) {
            setServerDetail(res.data.Data);
          }
        })
        .catch((err: any) => {
          setLoadingServerDetail(false);
          console.log('Error fetching survey details from server:', err);
        });
    }
  }, [surveyId]);

  useEffect(() => {
    dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point', 'earthing', 'stay_set', 'pole_db', 'pole_type', 'structure_condition', 'cond_phase']) as any);
    dispatch(fetchTransformersAction() as any);
    dispatch(fetchConductorsAction() as any);
    dispatch(fetchPolesAction() as any);
  }, [dispatch]);

  const isLocked = Boolean(survey?.isCompleted || route.params?.isReadOnly);

  // Merge server and local nodes
  const nodes = useMemo<SurveyNode[]>(() => {
    const localNodes = Array.isArray(survey?.nodes) ? survey.nodes : [];
    const serverNodes = Array.isArray(serverDetail?.nodes)
      ? serverDetail.nodes.map((node: any) => ({
          id: String(node.id),
          nodeType: node.nodeType || node.node_type || 'POLE',
          sequenceNumber: node.sequenceNumber ?? node.sequence_number ?? 0,
          nameLabel: node.nameLabel || node.name_label || '',
          latitude: Number(node.latitude) || 0,
          longitude: Number(node.longitude) || 0,
          attributes: {
            ...(node.attributes || {}),
            ...(node.structure_detail || {}),
            newPoleRequired: node.structure_detail?.new_pole_required ?? node.is_new_pole,
            poleMaster: node.structure_detail?.pole_master_id,
            poleMasterName: node.structure_detail?.pole_master_name,
            poleQty: node.structure_detail?.pole_qty,
            structureCondition: node.structure_detail?.structure_condition ?? node.structure_condition,
            existingConductor: node.structure_detail?.existing_conductor,
            conductorPhaseNo: node.structure_detail?.conductor_phase_no,
            proposedConductor: node.structure_detail?.proposed_conductor_id,
            proposedConductorName: node.structure_detail?.proposed_conductor_name,
            existingDtrCapacity: node.structure_detail?.existing_dtr_capacity_id,
            existingDtrCapacityName: node.structure_detail?.existing_dtr_capacity_name,
            newDtrCapacity: node.structure_detail?.new_dtr_capacity_id,
            newDtrCapacityName: node.structure_detail?.new_dtr_capacity_name,
            earthingType: node.structure_detail?.earthing_type,
            earthingRequired: node.structure_detail?.earthing_required,
            existingStaySet: node.structure_detail?.existing_stay_set,
            existingStaySetQty: node.structure_detail?.existing_stay_set_qty,
            proposedStaySet: node.structure_detail?.proposed_stay_set,
            newStaySetQty: node.structure_detail?.new_stay_set_qty,
            remarks: node.structure_detail?.remarks,
          },
          imageUri: node.image_path || node.imageUri || null,
          imageUris: node.images || (node.image_path ? [node.image_path] : []),
          capturedAt: node.captured_at || node.capturedAt || '',
          parentLabel: node.parent_label || node.parentLabel,
        }))
      : [];
    if (serverNodes.length > localNodes.length) {
      return serverNodes as SurveyNode[];
    }
    return (localNodes.length > 0 ? localNodes : serverNodes) as SurveyNode[];
  }, [survey?.nodes, serverDetail?.nodes]);

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
  const [savingSpanDistance, setSavingSpanDistance] = useState<boolean>(false);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<string | null>(null);

  // Inline node editing fields
  const [nodeName, setNodeName] = useState('');
  const [nodeHeight, setNodeHeight] = useState('');
  const [nodePoleType, setNodePoleType] = useState('');
  const [nodeLat, setNodeLat] = useState('');
  const [nodeLng, setNodeLng] = useState('');
  const [nodeCableSize, setNodeCableSize] = useState('');
  const [nodeTilt, setNodeTilt] = useState('');
  const [nodeSag, setNodeSag] = useState('');
  const [nodeSpanDistance, setNodeSpanDistance] = useState('');
  const [nodeParentLabel, setNodeParentLabel] = useState('');

  const handleOpenEditModal = () => {
    if (nodes.length === 0) {
      toast.info('No recorded poles found in this survey run.');
      return;
    }
    const currentSelected = selectedNodeId ? nodes.find((n: any) => n.id === selectedNodeId) : null;
    const initialPole = currentSelected?.nameLabel || nodes[0]?.nameLabel || '';
    setSelectedEditPole(initialPole);
    setConfirmEditModalVisible(true);
  };

  const handleEditChosenPole = (poleLabel: string) => {
    const targetNode = nodes.find((n: any) => n.nameLabel === poleLabel);
    const lineId = survey?.id || route.params?.surveyId;
    const rawId = String(lineId || '').replace('srv-', '').replace('erect-', '');
    const surveyDbId = !isNaN(Number(rawId)) ? Number(rawId) : undefined;

    setLoadingPoleDetails(true);
    GetSurveyPoleDetailsService({
      survey_id: surveyDbId,
      survey_line_id: surveyDbId,
      pole_no: poleLabel,
      node_id: targetNode?.id && !isNaN(Number(targetNode.id)) ? Number(targetNode.id) : undefined,
    })
      .then((res: any) => {
        setLoadingPoleDetails(false);
        setConfirmEditModalVisible(false);
        const serverNode = res?.data?.Data?.selected_node || res?.data?.selected_node;
        const finalNode = serverNode || targetNode;
        dispatch(resumeSurveyWithPole({
          lineId: survey?.id || String(surveyId),
          poleLabel,
          editingNode: finalNode,
        }));
        navigation.navigate('ActiveSurvey', {
          isEditingNode: true,
          targetPoleLabel: poleLabel,
          serverNodeData: finalNode || null,
          workflowType: 'SURVEY',
        });
      })
      .catch((err: any) => {
        setLoadingPoleDetails(false);
        setConfirmEditModalVisible(false);
        dispatch(resumeSurveyWithPole({
          lineId: survey?.id || String(surveyId),
          poleLabel,
          editingNode: targetNode,
        }));
        navigation.navigate('ActiveSurvey', {
          isEditingNode: true,
          targetPoleLabel: poleLabel,
          serverNodeData: targetNode || null,
          workflowType: 'SURVEY',
        });
      });
  };

  const handleContinueFromChosenPole = (poleLabel: string) => {
    setConfirmEditModalVisible(false);
    dispatch(resumeSurveyWithPole({
      lineId: survey?.id || String(surveyId),
      poleLabel,
    }));
    navigation.navigate('ActiveSurvey', {
      isContinuation: true,
      targetPoleLabel: poleLabel,
      workflowType: 'SURVEY',
    });
  };

  const contractorName = serverDetail?.contractor_name || survey?.contractorName || 'N/A';
  const surveyCode = serverDetail?.id ? `SRV-${serverDetail.id}` : (survey?.id || 'N/A');
  const villageName = serverDetail?.village_name || survey?.village || survey?.location || '';
  const blockName = serverDetail?.block_name || survey?.block || '';
  const districtName = serverDetail?.district_name || survey?.district || '';
  const stateName = serverDetail?.state_name || survey?.stateName || '';
  const feederName = serverDetail?.feeder_name || survey?.feederName || '';
  const remarksText = serverDetail?.remarks || survey?.remarks || '';
  const updatedDate = serverDetail?.updated_on || survey?.endedAt || survey?.startedAt || '';
  const statusLabel = isLocked ? 'COMPLETED' : 'ACTIVE';

  const rawLineType = serverDetail?.line_type ?? survey?.lineType;
  const lineTypeLabel = useMemo(() => {
    return getLineTypeLabel(rawLineType);
  }, [rawLineType]);

  const activeInspectedNode = useMemo(() => {
    if (nodes.length === 0) return null;
    if (selectedNodeId) {
      return nodes.find((n: any) => n.id === selectedNodeId) || nodes[0];
    }
    return nodes[0];
  }, [nodes, selectedNodeId]);

  const activeAttrs = (activeInspectedNode as any)?.attributes || {};

  // Material Summary data (Server API primary, client calculated fallback)
  const materialSummary = useMemo(() => {
    if (serverDetail?.material_summary) {
      return serverDetail.material_summary;
    }

    // Client-side computation fallback
    const summary: any = {
      total_poles: 0,
      total_poles_count: 0,
      total_new_poles: 0,
      total_existing_poles: 0,
      poles_by_type: [] as any[],
      ht_conductors: {
        existing: [] as any[],
        new: [] as any[],
        total_existing_spans: 0,
        total_new_spans: 0,
        total_length_meters: 0,
      },
      lt_conductors: {
        existing: [] as any[],
        new: [] as any[],
        total_existing_spans: 0,
        total_new_spans: 0,
        total_length_meters: 0,
      },
      dtr_summary: {
        existing: [] as any[],
        new: [] as any[],
        total_existing: 0,
        total_new: 0,
        total_dtr: 0,
      },
      stay_set_summary: {
        ht: { existing_qty: 0, new_qty: 0, total: 0 },
        lt: { existing_qty: 0, new_qty: 0, total: 0 },
        total_ht_count: 0,
        total_lt_count: 0,
        total_stay_set_count: 0,
      },
      total_route_length_meters: 0,
      ht_route_length_meters: 0,
      lt_route_length_meters: 0,
      total_spans: Math.max(0, nodes.length - 1),
    };

    if (serverDetail?.material_summary) {
      return {
        ...summary,
        ...serverDetail.material_summary,
        total_route_length_meters: serverDetail.material_summary.total_route_length_meters ?? serverDetail.total_route_length_meters ?? 0,
        ht_route_length_meters: serverDetail.material_summary.ht_route_length_meters ?? serverDetail.ht_route_length_meters ?? 0,
        lt_route_length_meters: serverDetail.material_summary.lt_route_length_meters ?? serverDetail.lt_route_length_meters ?? 0,
      };
    }

    if (nodes.length === 0) return summary;

    const lineTypeStr = String(rawLineType || '').toUpperCase();
    const isLineHt = lineTypeStr.includes('HT') || lineTypeStr.includes('11') || lineTypeStr.includes('33');

    const polesMap: Record<string, any> = {};
    const dtrExistMap: Record<string, any> = {};
    const dtrNewMap: Record<string, any> = {};

    let dtrEncountered = false;
    let prevNode: SurveyNode | null = null;
    let totalDist = 0;
    let htDist = 0;
    let ltDist = 0;

    nodes.forEach((node, idx) => {
      const attrs = node.attributes || {};
      const isNewPole = Boolean(attrs.newPoleRequired);

      // Distance calculation
      let spanDist = 0;
      if (prevNode && node.latitude && node.longitude && prevNode.latitude && prevNode.longitude) {
        const R = 6371000;
        const dLat = ((node.latitude - prevNode.latitude) * Math.PI) / 180;
        const dLon = ((node.longitude - prevNode.longitude) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((prevNode.latitude * Math.PI) / 180) *
            Math.cos((node.latitude * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        spanDist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }
      totalDist += spanDist;
      prevNode = node;

      // Determine HT vs LT for 440V line:
      // Before and up to DTR: HT line (feeder connection from tapping point till DTR)
      // After DTR: LT line
      let isHt = false;
      const nodeLineSec = String(attrs.lineSection || '').toUpperCase();
      if (nodeLineSec === 'HT') {
        isHt = true;
      } else if (nodeLineSec === 'LT') {
        isHt = false;
      } else if (!isLineHt) {
        if (!dtrEncountered) {
          isHt = true;
          if (node.nodeType === 'DTR') {
            dtrEncountered = true;
          }
        } else {
          isHt = false;
        }
      } else {
        isHt = true;
      }

      if (isHt) htDist += spanDist;
      else ltDist += spanDist;

      // 1. Poles
      if (node.nodeType === 'POLE') {
        summary.total_poles += 1;
        const pQty = Number(attrs.poleQty) || 1;
        summary.total_poles_count += pQty;
        if (isNewPole) summary.total_new_poles += pQty;
        else summary.total_existing_poles += pQty;

        const resolvedPole = poles.find(p => String(p.id) === String(attrs.poleMaster));
        const pName = attrs.poleMasterName || resolvedPole?.pole_name || (attrs.poleMaster ? `Pole Master #${attrs.poleMaster}` : 'Standard Pole');
        if (!polesMap[pName]) {
          polesMap[pName] = { pole_type_name: pName, new_qty: 0, existing_qty: 0, total_qty: 0 };
        }
        if (isNewPole) polesMap[pName].new_qty += pQty;
        else polesMap[pName].existing_qty += pQty;
        polesMap[pName].total_qty += pQty;
      }

      // 2. Conductors
      const resolvedPropCond = conductors.find(c => String(c.id) === String(attrs.proposedConductor || attrs.conductor));
      const cName = attrs.proposedConductorName || resolvedPropCond?.conductor_name || attrs.cableSize;
      if (cName) {
        const target = isHt ? summary.ht_conductors : summary.lt_conductors;
        target.total_new_spans += 1;
        target.total_length_meters = Math.round(target.total_length_meters + spanDist);
        const found = target.new.find((c: any) => c.conductor_name === cName);
        if (found) {
          found.spans_count += 1;
          found.length_meters = Math.round((found.length_meters || 0) + spanDist);
        } else {
          target.new.push({ conductor_name: cName, spans_count: 1, length_meters: Math.round(spanDist) });
        }
      }

      if (attrs.existingConductor && attrs.existingConductor !== 'NONE') {
        const target = isHt ? summary.ht_conductors : summary.lt_conductors;
        target.total_existing_spans += 1;
        target.total_length_meters = Math.round(target.total_length_meters + spanDist);
        const found = target.existing.find((c: any) => c.conductor_name === attrs.existingConductor);
        if (found) {
          found.spans_count += 1;
          found.length_meters = Math.round((found.length_meters || 0) + spanDist);
        } else {
          target.existing.push({ conductor_name: attrs.existingConductor, phase: attrs.conductorPhaseNo, spans_count: 1, length_meters: Math.round(spanDist) });
        }
      }

      // 3. DTR (Resolved from TransformerMaster, never raw ID)
      const resolveLocalDtrName = (nameVal: any, idVal: any) => {
        if (nameVal) return nameVal;
        if (!idVal || idVal === 'NONE' || idVal === '') return null;
        const found = transformers.find(t => String(t.id) === String(idVal));
        if (found) return found.transformer_name;
        const s = String(idVal).trim();
        return s.toUpperCase().endsWith('KVA') ? s : `${s} KVA`;
      };

      const edName = resolveLocalDtrName(attrs.existingDtrCapacityName, attrs.existingDtrCapacity);
      if (edName) {
        dtrExistMap[edName] = (dtrExistMap[edName] || 0) + 1;
        summary.dtr_summary.total_existing += 1;
      }

      const ndName = resolveLocalDtrName(attrs.newDtrCapacityName, attrs.newDtrCapacity);
      if (ndName) {
        dtrNewMap[ndName] = (dtrNewMap[ndName] || 0) + 1;
        summary.dtr_summary.total_new += 1;
      }
      if (node.nodeType === 'DTR' && !edName && !ndName) {
        const defaultDtr = 'Standard DTR';
        dtrNewMap[defaultDtr] = (dtrNewMap[defaultDtr] || 0) + 1;
        summary.dtr_summary.total_new += 1;
      }

      // 4. Stay Sets (Explicitly classified by domain code: 1/HT -> HT, 2/LT -> LT)
      const existStay = Number(attrs.existingStaySetQty) || 0;
      const newStay = Number(attrs.newStaySetQty) || 0;

      const existStayStr = String(attrs.existingStaySet || '').toUpperCase();
      const propStayStr = String(attrs.proposedStaySet || attrs.staySetUsed || '').toUpperCase();

      if (existStay > 0) {
        if (existStayStr === '1' || existStayStr.includes('HT')) {
          summary.stay_set_summary.ht.existing_qty += existStay;
        } else if (existStayStr === '2' || existStayStr.includes('LT')) {
          summary.stay_set_summary.lt.existing_qty += existStay;
        } else if (isHt) {
          summary.stay_set_summary.ht.existing_qty += existStay;
        } else {
          summary.stay_set_summary.lt.existing_qty += existStay;
        }
      }

      if (newStay > 0) {
        if (propStayStr === '1' || propStayStr.includes('HT')) {
          summary.stay_set_summary.ht.new_qty += newStay;
        } else if (propStayStr === '2' || propStayStr.includes('LT')) {
          summary.stay_set_summary.lt.new_qty += newStay;
        } else if (isHt) {
          summary.stay_set_summary.ht.new_qty += newStay;
        } else {
          summary.stay_set_summary.lt.new_qty += newStay;
        }
      }
    });

    summary.total_route_length_meters = Math.round(totalDist);
    summary.ht_route_length_meters = Math.round(htDist);
    summary.lt_route_length_meters = Math.round(ltDist);

    summary.poles_by_type = Object.values(polesMap);
    summary.dtr_summary.existing = Object.entries(dtrExistMap).map(([capacity_name, qty]) => ({ capacity_name, qty }));
    summary.dtr_summary.new = Object.entries(dtrNewMap).map(([capacity_name, qty]) => ({ capacity_name, qty }));
    summary.dtr_summary.total_dtr = summary.dtr_summary.total_existing + summary.dtr_summary.total_new;

    summary.stay_set_summary.ht.total = summary.stay_set_summary.ht.existing_qty + summary.stay_set_summary.ht.new_qty;
    summary.stay_set_summary.lt.total = summary.stay_set_summary.lt.existing_qty + summary.stay_set_summary.lt.new_qty;
    summary.stay_set_summary.total_ht_count = summary.stay_set_summary.ht.total;
    summary.stay_set_summary.total_lt_count = summary.stay_set_summary.lt.total;
    summary.stay_set_summary.total_stay_set_count = summary.stay_set_summary.ht.total + summary.stay_set_summary.lt.total;

    return summary;
  }, [serverDetail, nodes, rawLineType, transformers, conductors, poles]);

  const getLineAccent = () => {
    const lType = String(rawLineType || '');
    if (lType.includes('11')) return '#F59E0B';
    if (lType.includes('33')) return '#EF4444';
    return '#0284C7';
  };
  const accentColor = getLineAccent();

  // Coordinates and canvas layout
  const latitudes = nodes.map((n: any) => n.latitude);
  const longitudes = nodes.map((n: any) => n.longitude);
  const minLat = latitudes.length > 0 ? Math.min(...latitudes) : 0;
  const maxLat = latitudes.length > 0 ? Math.max(...latitudes) : 0;
  const minLng = longitudes.length > 0 ? Math.min(...longitudes) : 0;
  const maxLng = longitudes.length > 0 ? Math.max(...longitudes) : 0;

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const padding = 35;

  const projectedPoints = nodes.map((node: any) => {
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
      const resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
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
    const resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
    setNodeParentLabel(resolvedParent);
  };

  const handleSaveNodeUpdates = () => {
    if (isLocked) return;
    const activeId = selectedNodeId || selectedSpanNodeId;
    if (!activeId) return;

    const lineId = survey?.id || route.params?.surveyId;
    const cleanSpanDist = nodeSpanDistance.trim();
    const cleanParentLabel = nodeParentLabel.trim();
    const cleanNodeName = nodeName.trim();

    dispatch(updateSurveyNode({
      lineId,
      nodeId: activeId,
      nameLabel: cleanNodeName,
      latitude: selectedNodeId ? parseFloat(nodeLat) || 0 : (nodes.find((n: any) => n.id === activeId)?.latitude || 0),
      longitude: selectedNodeId ? parseFloat(nodeLng) || 0 : (nodes.find((n: any) => n.id === activeId)?.longitude || 0),
      parentLabel: cleanParentLabel,
      attributes: {
        height: nodeHeight,
        poleType: nodePoleType,
        cableSize: nodeCableSize,
        tilt: nodeTilt,
        sag: nodeSag,
        spanDistance: cleanSpanDist,
      },
    }));

    if (selectedSpanNodeId && cleanSpanDist) {
      setSavingSpanDistance(true);
      const targetNode = nodes.find((n: any) => n.id === selectedSpanNodeId);
      const rawId = String(lineId).replace('srv-', '').replace('erect-', '');
      dispatch(updateSpanDistanceAction({
        node_id: !isNaN(Number(activeId)) ? Number(activeId) : undefined,
        span_distance: cleanSpanDist,
        name_label: targetNode?.nameLabel,
        survey_id: !isNaN(Number(rawId)) ? Number(rawId) : rawId,
      }, () => {
        setSavingSpanDistance(false);
        toast.success(`Span distance for ${targetNode?.nameLabel || 'pole'} updated to ${cleanSpanDist}m.`);
      }) as any);
    } else {
      toast.success('Structure details updated successfully.');
    }
  };

  if (!survey && !serverDetail) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Survey line details not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeNodePhotos: string[] = Array.isArray(activeInspectedNode?.imageUris) && activeInspectedNode.imageUris.length > 0
    ? activeInspectedNode.imageUris
    : (activeInspectedNode?.imageUri ? [activeInspectedNode.imageUri] : []);

  return (
    <View style={styles.outerContainer}>
      {/* Background Gradient */}
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>&lt; LOGS</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SURVEY DETAILS</Text>
        <View style={[styles.classBadge, { borderColor: accentColor }]}>
          <Text style={[styles.classBadgeText, { color: accentColor }]}>
            {lineTypeLabel}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainerWrapper} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
        {/* Project Summary Collapsible Card */}
        <TouchableOpacity
          style={styles.projectSummary}
          activeOpacity={0.85}
          onPress={() => setShowBasicDetails(v => !v)}
          accessibilityRole="button"
        >
          <View style={styles.projectAvatar}>
            <Svg width={23} height={26} viewBox="0 0 24 28">
              <Path d="M3 26V3H14V26M14 11H21V26M1 26H23M7 7H10M7 12H10M7 17H10M7 22H10M17 15H19M17 20H19" fill="none" stroke="white" strokeWidth="2" />
            </Svg>
          </View>
          <View style={styles.projectSummaryCopy}>
            <Text style={styles.projectCompany}>{contractorName}</Text>
            <Text style={styles.projectMeta}>Survey Code: {surveyCode}</Text>
            <Text style={styles.projectLocation}>
              {villageName || 'N/A'}{blockName ? `, ${blockName}` : ''}{districtName ? `, ${districtName}` : ''}
            </Text>
            {updatedDate ? <Text style={styles.projectMeta}>Updated: {String(updatedDate)}</Text> : null}
            <View style={styles.projectChips}>
              <View style={styles.projectVoltage}>
                <Text style={styles.projectVoltageText}>{lineTypeLabel}</Text>
              </View>
              <View style={[styles.statusPill, isLocked ? styles.statusPillCompleted : styles.statusPillPending]}>
                <Text style={[styles.statusPillText, isLocked ? styles.statusPillTextCompleted : styles.statusPillTextPending]}>
                  {statusLabel}
                </Text>
              </View>
            </View>
          </View>
          <Text style={styles.projectChevron}>{showBasicDetails ? '\u2303' : '\u203A'}</Text>
        </TouchableOpacity>

        {/* Collapsible Basic Survey Details Card */}
        {showBasicDetails && (
          <View style={styles.basicCard}>
            <View style={styles.basicHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.basicHeaderIcon}>📋</Text>
                <View>
                  <Text style={styles.basicHeaderTitle}>BASIC SURVEY DETAILS</Text>
                  <Text style={styles.basicHeaderSubtitle}>Administrative & Location Parameters</Text>
                </View>
              </View>
              <View style={[styles.statusPill, isLocked ? styles.statusPillCompleted : styles.statusPillPending]}>
                <Text style={[styles.statusPillText, isLocked ? styles.statusPillTextCompleted : styles.statusPillTextPending]}>
                  {statusLabel}
                </Text>
              </View>
            </View>

            <View style={styles.basicGrid}>
              <View style={styles.basicGridCol}>
                <View style={styles.basicField}>
                  <Text style={styles.basicLabel}>SURVEY ID</Text>
                  <Text style={styles.basicValueHighlight}>{surveyCode}</Text>
                </View>
                <View style={styles.basicField}>
                  <Text style={styles.basicLabel}>TYPE OF WORK</Text>
                  <Text style={styles.basicValue}>{lineTypeLabel}</Text>
                </View>
                {feederName ? (
                  <View style={styles.basicField}>
                    <Text style={styles.basicLabel}>FEEDER NAME</Text>
                    <Text style={styles.basicValue}>{feederName}</Text>
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
                  <Text style={styles.basicLabel}>TOTAL STRUCTURES</Text>
                  <Text style={styles.basicValueHighlight}>{nodes.length} Recorded</Text>
                </View>
              </View>
            </View>

            {remarksText && remarksText !== 'N/A' ? (
              <View style={styles.basicRemarksBox}>
                <Text style={styles.basicRemarksLabel}>REMARKS:</Text>
                <Text style={styles.basicRemarksText}>{remarksText}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* Section Tabs: Line Routing Layout vs Material Summary */}
        <View style={styles.sectionTabs}>
          {([
            { key: 'routing', label: 'Line Routing Layout' },
            { key: 'materials', label: 'Material Summary' },
          ] as const).map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.sectionTab, detailsTab === tab.key && styles.sectionTabActive]}
              onPress={() => setDetailsTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: detailsTab === tab.key }}
            >
              {detailsTab === tab.key && (
                <View style={[StyleSheet.absoluteFill, { borderRadius: 12, overflow: 'hidden' }]} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <LinearGradient id={`tab-${tab.key}`} x1="0%" y1="100%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#1744FF" />
                        <Stop offset="55%" stopColor="#783BFF" />
                        <Stop offset="100%" stopColor="#D348FA" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill={`url(#tab-${tab.key})`} />
                  </Svg>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                <Svg width={18} height={18} viewBox="0 0 24 24" stroke={detailsTab === tab.key ? '#FFFFFF' : '#7285AF'} strokeWidth={1.8} fill="none">
                  <Path d={tab.key === 'routing' ? 'M3 5L9 2L15 5L21 2V19L15 22L9 19L3 22ZM9 2V19M15 5V22' : 'M3 7L12 2L21 7V17L12 22L3 17ZM3 7L12 12L21 7M12 12V22M7 4L16 9'} />
                </Svg>
                <Text style={[styles.sectionTabText, detailsTab === tab.key && styles.sectionTabTextActive]}>
                  {tab.label}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ==================== TAB 1: LINE ROUTING LAYOUT ==================== */}
        <View style={{ display: detailsTab === 'routing' ? 'flex' : 'none' }}>
          {/* Status Banner */}
          {isLocked ? (
            <View style={styles.lockedBanner}>
              <View style={styles.bannerHeaderRow}>
                <Text style={styles.lockedTitle}>COMPLETED SURVEY - VIEW ONLY</Text>
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>COMPLETED</Text>
                </View>
              </View>
              <Text style={styles.lockedText}>
                This line was confirmed as complete. All parameters and structures are locked in read-only mode and can no longer be edited or continued.
              </Text>
            </View>
          ) : editMode ? (
            <View style={styles.editGuide}>
              <Text style={styles.editGuideTitle}>CHOOSE A POLE OR SPAN</Text>
              <Text style={styles.editGuideText}>
                Tap a span to edit it, or tap any pole to edit its details or continue the line from that point.
              </Text>
            </View>
          ) : null}

          {/* Diagram Canvas */}
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
                <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.liveText, { color: isLocked ? '#64748B' : accentColor }]}>
                  {isLocked ? 'VIEW ONLY' : 'INTERACTIVE'}
                </Text>
              </View>
            </View>
            <Text style={styles.canvasSubtitle}>
              {isLocked ? 'Routing layout is permanently locked.' : 'Tap a pole or span to edit physical parameters.'}
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
                showMixedVoltage={false}
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

          {/* Line Stats Card */}
          <View style={styles.lineStatsCard}>
            <Text style={styles.sectionHeading}>Line Details</Text>
            <View style={styles.lineStatsRow}>
              <View style={[styles.lineStat, { backgroundColor: '#EEF7FF' }]}>
                <Text style={styles.lineStatLabel}>Total Length</Text>
                <Text style={styles.lineStatValue}>{materialSummary.total_route_length_meters || 0} m</Text>
              </View>
              <View style={[styles.lineStat, { backgroundColor: '#FFF7ED' }]}>
                <Text style={styles.lineStatLabel}>HT Length</Text>
                <Text style={[styles.lineStatValue, { color: '#C2410C' }]}>{materialSummary.ht_route_length_meters || 0} m</Text>
              </View>
              <View style={[styles.lineStat, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.lineStatLabel}>LT Length</Text>
                <Text style={[styles.lineStatValue, { color: '#15803D' }]}>{materialSummary.lt_route_length_meters || 0} m</Text>
              </View>
              <View style={[styles.lineStat, { backgroundColor: '#EDFAF4' }]}>
                <Text style={styles.lineStatLabel}>Structures</Text>
                <Text style={styles.lineStatValue}>{nodes.length}</Text>
              </View>
              <View style={[styles.lineStat, { backgroundColor: '#F4EFFF' }]}>
                <Text style={styles.lineStatLabel}>Total Spans</Text>
                <Text style={styles.lineStatValue}>{Math.max(0, nodes.length - 1)}</Text>
              </View>
            </View>
          </View>

          {/* Read-Only Structure Inspector (when locked or viewing) */}
          {activeInspectedNode && (
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
                      {activeInspectedNode.nodeType} Structure • {activeAttrs.structureCondition || 'OLD'}
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
                    <Text style={styles.inspectorLabel}>POLE MASTER</Text>
                    <Text style={styles.inspectorValue}>
                      {activeAttrs.poleMasterName || (activeAttrs.poleMaster ? `Pole #${activeAttrs.poleMaster}` : 'N/A')}
                    </Text>
                  </View>
                  <View style={styles.inspectorItem}>
                    <Text style={styles.inspectorLabel}>EXISTING CONDUCTOR</Text>
                    <Text style={styles.inspectorValue}>
                      {activeAttrs.existingConductor || 'None'}
                    </Text>
                  </View>
                </View>

                <View style={styles.inspectorCol}>
                  <View style={styles.inspectorItem}>
                    <Text style={styles.inspectorLabel}>PROPOSED CONDUCTOR</Text>
                    <Text style={styles.inspectorValue}>
                      {activeAttrs.proposedConductorName || activeAttrs.cableSize || 'N/A'}
                    </Text>
                  </View>
                  {/* DTR details - only show when DTR info exists */}
                  {(activeInspectedNode.nodeType === 'DTR' || activeAttrs.existingDtrCapacity || activeAttrs.newDtrCapacity || activeAttrs.existingDtrCapacityName || activeAttrs.newDtrCapacityName) ? (
                    <>
                      <View style={styles.inspectorItem}>
                        <Text style={styles.inspectorLabel}>EXISTING DTR</Text>
                        <Text style={styles.inspectorValue}>
                          {activeAttrs.existingDtrCapacityName || (activeAttrs.existingDtrCapacity && activeAttrs.existingDtrCapacity !== 'NONE' ? (transformers.find(t => String(t.id) === String(activeAttrs.existingDtrCapacity))?.transformer_name || `${activeAttrs.existingDtrCapacity} KVA`) : 'None')}
                        </Text>
                      </View>
                      <View style={styles.inspectorItem}>
                        <Text style={styles.inspectorLabel}>NEW DTR</Text>
                        <Text style={styles.inspectorValueHighlight}>
                          {activeAttrs.newDtrCapacityName || (activeAttrs.newDtrCapacity && activeAttrs.newDtrCapacity !== 'NONE' ? (transformers.find(t => String(t.id) === String(activeAttrs.newDtrCapacity))?.transformer_name || `${activeAttrs.newDtrCapacity} KVA`) : 'None')}
                        </Text>
                      </View>
                    </>
                  ) : null}
                  <View style={styles.inspectorItem}>
                    <Text style={styles.inspectorLabel}>STAY SETS</Text>
                    <Text style={styles.inspectorValue}>
                      {activeAttrs.newStaySetQty ? `New: ${activeAttrs.newStaySetQty}` : ''}
                      {activeAttrs.existingStaySetQty ? ` | Exist: ${activeAttrs.existingStaySetQty}` : ''}
                      {!activeAttrs.newStaySetQty && !activeAttrs.existingStaySetQty ? 'None' : ''}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Photos */}
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

          {/* In-Line Editor */}
          {!isLocked && (
            <SurveyAttributeEditor
              appearance="erection"
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
              isSaving={savingSpanDistance}
              onCancel={() => { setSelectedNodeId(null); setSelectedSpanNodeId(null); }}
              onApply={handleSaveNodeUpdates}
            />
          )}

          {/* Continuation Panel */}
          {!isLocked && activeInspectedNode && (
            <View style={styles.continuationPanel}>
              <View style={styles.continuationCopy}>
                <Text style={styles.continuationTitle}>CONTINUE FROM {activeInspectedNode.nameLabel}</Text>
                <Text style={styles.continuationText}>Capture a new branch or extend the route from this pole.</Text>
              </View>
              <TouchableOpacity
                style={styles.continuationButton}
                onPress={() => handleContinueFromChosenPole(activeInspectedNode.nameLabel)}
              >
                <Text style={styles.continuationButtonText}>START HERE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ==================== TAB 2: MATERIAL SUMMARY ==================== */}
        <View style={{ display: detailsTab === 'materials' ? 'flex' : 'none' }}>
          <View style={styles.materialSection}>
            {/* Header */}
            <View style={styles.materialSectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.materialHeaderIcon}>📦</Text>
                <View>
                  <Text style={styles.materialHeaderTitle}>Material Summary</Text>
                  <Text style={styles.materialHeaderSubtitle}>
                    Computed Bill of Quantities across {nodes.length} surveyed structure(s)
                  </Text>
                </View>
              </View>
              <View style={styles.materialTotalBadge}>
                <Text style={styles.materialTotalBadgeText}>{nodes.length} STRUCTURES</Text>
              </View>
            </View>

            {/* Quick Metrics Bar */}
            <View style={styles.overviewMetrics}>
              <View style={[styles.metricChip, { backgroundColor: '#EFF8FF' }]}>
                <Text style={styles.metricChipNum}>{materialSummary.total_poles || materialSummary.total_poles_count || 0}</Text>
                <Text style={styles.metricChipLabel}>Poles</Text>
              </View>
              {Boolean((materialSummary.total_dtr || 0) > 0 || (materialSummary.dtr_summary?.total_dtr || 0) > 0) && (
                <View style={[styles.metricChip, { backgroundColor: '#EDFAF3' }]}>
                  <Text style={styles.metricChipNum}>{materialSummary.total_dtr || materialSummary.dtr_summary?.total_dtr || 0}</Text>
                  <Text style={styles.metricChipLabel}>DTRs</Text>
                </View>
              )}
              <View style={[styles.metricChip, { backgroundColor: '#F4EFFF' }]}>
                <Text style={styles.metricChipNum}>{materialSummary.stay_set_summary?.total_stay_set_count || 0}</Text>
                <Text style={styles.metricChipLabel}>Stay Sets</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[styles.metricChipNum, { color: '#C2410C' }]}>{materialSummary.ht_route_length_meters || 0}m</Text>
                <Text style={styles.metricChipLabel}>HT Route</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: '#F0FDF4' }]}>
                <Text style={[styles.metricChipNum, { color: '#15803D' }]}>{materialSummary.lt_route_length_meters || 0}m</Text>
                <Text style={styles.metricChipLabel}>LT Route</Text>
              </View>
              <View style={[styles.metricChip, { backgroundColor: '#FFF4EF' }]}>
                <Text style={styles.metricChipNum}>{materialSummary.total_route_length_meters || 0}m</Text>
                <Text style={styles.metricChipLabel}>Total Route</Text>
              </View>
            </View>

            {/* i. Total Pole Based on Type */}
            <View style={[styles.matCard, { borderLeftColor: '#FFAB45', borderColor: '#F3C99A' }]}>
              <View style={styles.matCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.matCardIcon}>🪵</Text>
                  <Text style={styles.matCardTitle}>1. Total Poles by Type</Text>
                </View>
                <View style={styles.matCardBadge}>
                  <Text style={styles.matCardBadgeText}>
                    {materialSummary.total_poles || materialSummary.total_poles_count || 0} TOTAL
                  </Text>
                </View>
              </View>

              {/* Subtotal Pills */}
              <View style={styles.poleGlobalPillsRow}>
                <View style={[styles.polePill, styles.polePillNew]}>
                  <Text style={styles.polePillLabel}>New Poles</Text>
                  <Text style={styles.polePillValue}>{materialSummary.new_poles_count ?? materialSummary.total_new_poles ?? 0}</Text>
                </View>
                <View style={[styles.polePill, styles.polePillOld]}>
                  <Text style={styles.polePillLabel}>Existing Poles</Text>
                  <Text style={styles.polePillValue}>{materialSummary.old_poles_count ?? materialSummary.total_existing_poles ?? 0}</Text>
                </View>
              </View>

              {/* Breakdown list */}
              {Array.isArray(materialSummary.poles_by_type) && materialSummary.poles_by_type.length > 0 ? (
                <View style={styles.breakdownList}>
                  {materialSummary.poles_by_type.map((poleItem: any, pIdx: number) => (
                    <View key={`${poleItem.pole_type_name}-${pIdx}`} style={styles.breakdownRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.breakdownRowTitle}>{poleItem.pole_type_name || 'Standard Pole'}</Text>
                      </View>
                      <View style={styles.breakdownBadges}>
                        <View style={styles.chipNew}>
                          <Text style={styles.chipNewText}>New: {poleItem.new_qty}</Text>
                        </View>
                        <View style={styles.chipOld}>
                          <Text style={styles.chipOldText}>Exist: {poleItem.existing_qty}</Text>
                        </View>
                        <View style={styles.chipTotal}>
                          <Text style={styles.chipTotalText}>Total: {poleItem.total_qty}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyMatRow}>
                  <Text style={styles.emptyMatText}>No categorized poles recorded yet.</Text>
                </View>
              )}
            </View>

            {/* ii. HT Cable / Conductor (New or Existing) */}
            <View style={[styles.matCard, { borderLeftColor: '#F59E0B', borderColor: '#FDE68A' }]}>
              <View style={styles.matCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.matCardIcon}>⚡</Text>
                  <Text style={styles.matCardTitle}>2. HT Cable / Conductor</Text>
                </View>
                <View style={[styles.matCardBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.matCardBadgeText, { color: '#B45309' }]}>
                    {materialSummary.ht_conductors?.total_length_meters || 0}m HT ROUTE
                  </Text>
                </View>
              </View>

              {/* Proposed / New HT */}
              <View style={styles.conductorSubSection}>
                <Text style={styles.subSectionTitle}>Proposed / New HT Conductor</Text>
                {Array.isArray(materialSummary.ht_conductors?.new) && materialSummary.ht_conductors.new.length > 0 ? (
                  materialSummary.ht_conductors.new.map((cItem: any, cIdx: number) => (
                    <View key={`ht-new-${cIdx}`} style={styles.conductorRow}>
                      <Text style={styles.conductorName}>{cItem.conductor_name}</Text>
                      <Text style={styles.conductorSpans}>{cItem.spans_count} Span(s) • {cItem.length_meters || 0}m</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySubText}>No proposed HT conductor specified.</Text>
                )}
              </View>

              {/* Existing HT */}
              <View style={styles.conductorSubSection}>
                <Text style={styles.subSectionTitle}>Existing HT Conductor / Cable</Text>
                {Array.isArray(materialSummary.ht_conductors?.existing) && materialSummary.ht_conductors.existing.length > 0 ? (
                  materialSummary.ht_conductors.existing.map((cItem: any, cIdx: number) => (
                    <View key={`ht-exist-${cIdx}`} style={styles.conductorRow}>
                      <Text style={styles.conductorName}>
                        {cItem.conductor_name}{cItem.phase ? ` (${cItem.phase})` : ''}
                      </Text>
                      <Text style={styles.conductorSpans}>{cItem.spans_count} Span(s) • {cItem.length_meters || 0}m</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySubText}>No existing HT conductor reported.</Text>
                )}
              </View>
            </View>

            {/* iii. LT Cable / Conductor (New or Existing) */}
            <View style={[styles.matCard, { borderLeftColor: '#0284C7', borderColor: '#BAE6FD' }]}>
              <View style={styles.matCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.matCardIcon}>🔌</Text>
                  <Text style={styles.matCardTitle}>3. LT Cable / Conductor</Text>
                </View>
                <View style={[styles.matCardBadge, { backgroundColor: '#E0F2FE' }]}>
                  <Text style={[styles.matCardBadgeText, { color: '#0369A1' }]}>
                    {materialSummary.lt_conductors?.total_length_meters || 0}m LT ROUTE
                  </Text>
                </View>
              </View>

              {/* Proposed / New LT */}
              <View style={styles.conductorSubSection}>
                <Text style={styles.subSectionTitle}>Proposed / New LT Conductor</Text>
                {Array.isArray(materialSummary.lt_conductors?.new) && materialSummary.lt_conductors.new.length > 0 ? (
                  materialSummary.lt_conductors.new.map((cItem: any, cIdx: number) => (
                    <View key={`lt-new-${cIdx}`} style={styles.conductorRow}>
                      <Text style={styles.conductorName}>{cItem.conductor_name}</Text>
                      <Text style={styles.conductorSpans}>{cItem.spans_count} Span(s) • {cItem.length_meters || 0}m</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySubText}>No proposed LT conductor specified.</Text>
                )}
              </View>

              {/* Existing LT */}
              <View style={styles.conductorSubSection}>
                <Text style={styles.subSectionTitle}>Existing LT Conductor / Cable</Text>
                {Array.isArray(materialSummary.lt_conductors?.existing) && materialSummary.lt_conductors.existing.length > 0 ? (
                  materialSummary.lt_conductors.existing.map((cItem: any, cIdx: number) => (
                    <View key={`lt-exist-${cIdx}`} style={styles.conductorRow}>
                      <Text style={styles.conductorName}>
                        {cItem.conductor_name}{cItem.phase ? ` (${cItem.phase})` : ''}
                      </Text>
                      <Text style={styles.conductorSpans}>{cItem.spans_count} Span(s) • {cItem.length_meters || 0}m</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptySubText}>No existing LT conductor reported.</Text>
                )}
              </View>
            </View>

            {/* iv. Distribution Transformers (DTR) - Existing or New KVA */}
            {Boolean((materialSummary.dtr_summary?.total_dtr || 0) > 0 || (materialSummary.total_dtr || 0) > 0) && (
              <View style={[styles.matCard, { borderLeftColor: '#7C3AED', borderColor: '#DDD6FE' }]}>
                <View style={styles.matCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.matCardIcon}>🔋</Text>
                    <Text style={styles.matCardTitle}>4. DTR Capacities (Existing & New)</Text>
                  </View>
                  <View style={[styles.matCardBadge, { backgroundColor: '#EDE9FE' }]}>
                    <Text style={[styles.matCardBadgeText, { color: '#6D28D9' }]}>
                      {materialSummary.dtr_summary?.total_dtr || materialSummary.total_dtr || 0} DTR(s)
                    </Text>
                  </View>
                </View>

                {/* New DTR Capacities */}
                <View style={styles.conductorSubSection}>
                  <Text style={styles.subSectionTitle}>Proposed / New DTR Capacity</Text>
                  {Array.isArray(materialSummary.dtr_summary?.new) && materialSummary.dtr_summary.new.length > 0 ? (
                    materialSummary.dtr_summary.new.map((dItem: any, dIdx: number) => (
                      <View key={`dtr-new-${dIdx}`} style={styles.dtrItemRow}>
                        <View style={styles.dtrCapacityBadge}>
                          <Text style={styles.dtrCapacityText}>{dItem.capacity_name}</Text>
                        </View>
                        <View style={styles.chipNew}>
                          <Text style={styles.chipNewText}>{dItem.qty} Unit(s)</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptySubText}>No new DTR capacity specified.</Text>
                  )}
                </View>

                {/* Existing DTR Capacities */}
                <View style={styles.conductorSubSection}>
                  <Text style={styles.subSectionTitle}>Existing DTR Capacity</Text>
                  {Array.isArray(materialSummary.dtr_summary?.existing) && materialSummary.dtr_summary.existing.length > 0 ? (
                    materialSummary.dtr_summary.existing.map((dItem: any, dIdx: number) => (
                      <View key={`dtr-exist-${dIdx}`} style={styles.dtrItemRow}>
                        <View style={[styles.dtrCapacityBadge, { backgroundColor: '#F1F5F9' }]}>
                          <Text style={[styles.dtrCapacityText, { color: '#475569' }]}>{dItem.capacity_name}</Text>
                        </View>
                        <View style={styles.chipOld}>
                          <Text style={styles.chipOldText}>{dItem.qty} Unit(s)</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.emptySubText}>No existing DTR capacity reported.</Text>
                  )}
                </View>
              </View>
            )}

            {/* v. Stay Set Support (HT & LT Count) */}
            <View style={[styles.matCard, { borderLeftColor: '#10B981', borderColor: '#A7F3D0' }]}>
              <View style={styles.matCardHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.matCardIcon}>⚓</Text>
                  <Text style={styles.matCardTitle}>5. Stay Sets (HT & LT Count)</Text>
                </View>
                <View style={[styles.matCardBadge, { backgroundColor: '#D1FAE5' }]}>
                  <Text style={[styles.matCardBadgeText, { color: '#047857' }]}>
                    {materialSummary.stay_set_summary?.total_stay_set_count || 0} TOTAL
                  </Text>
                </View>
              </View>

              <View style={styles.matGrid2Cols}>
                <View style={styles.matStatCard}>
                  <Text style={styles.matStatCardLabel}>HT Stay Sets</Text>
                  <Text style={styles.matStatCardValue}>{materialSummary.stay_set_summary?.total_ht_count || 0}</Text>
                  <Text style={styles.matStatCardUnit}>
                    New: {materialSummary.stay_set_summary?.ht?.new_qty || 0} • Exist: {materialSummary.stay_set_summary?.ht?.existing_qty || 0}
                  </Text>
                </View>
                <View style={styles.matStatCard}>
                  <Text style={styles.matStatCardLabel}>LT Stay Sets</Text>
                  <Text style={styles.matStatCardValue}>{materialSummary.stay_set_summary?.total_lt_count || 0}</Text>
                  <Text style={styles.matStatCardUnit}>
                    New: {materialSummary.stay_set_summary?.lt?.new_qty || 0} • Exist: {materialSummary.stay_set_summary?.lt?.existing_qty || 0}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Edit Structure Modal */}
      <Modal
        visible={confirmEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loadingPoleDetails) setConfirmEditModalVisible(false);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            if (!loadingPoleDetails) setConfirmEditModalVisible(false);
          }}
        >
          <Pressable style={styles.modalContainer} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>EDIT SURVEY STRUCTURE</Text>
            <Text style={styles.modalSubtitle}>
              Select a pole to load its saved details from the database, or continue line branching from it:
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.polePickerScroll}>
              {nodes.map((node: any) => {
                const isSelected = (selectedEditPole || '') === node.nameLabel;
                return (
                  <TouchableOpacity
                    key={node.id}
                    style={[styles.poleChip, isSelected && styles.poleChipSelected]}
                    onPress={() => setSelectedEditPole(node.nameLabel)}
                    disabled={loadingPoleDetails}
                  >
                    <Text style={[styles.poleChipText, isSelected && styles.poleChipTextSelected]}>
                      {node.nameLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingPoleDetails ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.loadingText}>
                  Fetching {selectedEditPole} details from DB...
                </Text>
              </View>
            ) : (
              <View style={styles.modalActionButtons}>
                <TouchableOpacity
                  style={[styles.modalButtonPrimary, (!selectedEditPole || loadingPoleDetails) && { opacity: 0.5 }]}
                  onPress={() => handleEditChosenPole(selectedEditPole)}
                  disabled={!selectedEditPole || loadingPoleDetails}
                >
                  <Text style={styles.modalButtonPrimaryText}>
                    EDIT STRUCTURE ({selectedEditPole || 'SELECT'})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButtonSecondary, (!selectedEditPole || loadingPoleDetails) && { opacity: 0.5 }]}
                  onPress={() => handleContinueFromChosenPole(selectedEditPole)}
                  disabled={!selectedEditPole || loadingPoleDetails}
                >
                  <Text style={styles.modalButtonSecondaryText}>
                    CONTINUE LINE BRANCH FROM HERE
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setConfirmEditModalVisible(false)}
              disabled={loadingPoleDetails}
            >
              <Text style={styles.modalCancelButtonText}>DISMISS</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Photo Zoom Modal */}
      <Modal
        visible={Boolean(selectedPhotoModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoModal(null)}
      >
        <Pressable style={styles.photoModalOverlay} onPress={() => setSelectedPhotoModal(null)}>
          <View style={styles.photoModalContent}>
            {selectedPhotoModal && (
              <Image source={{ uri: selectedPhotoModal }} style={styles.fullPhoto} resizeMode="contain" />
            )}
            <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setSelectedPhotoModal(null)}>
              <Text style={styles.closePhotoBtnText}>✕ CLOSE</Text>
            </TouchableOpacity>
          </View>
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
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  backText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 12,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  classBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContainerWrapper: {
    flex: 1,
    zIndex: 5,
  },
  scrollContent: {
    padding: 14,
  },

  /* Project Summary Card */
  projectSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  projectAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  projectSummaryCopy: {
    flex: 1,
  },
  projectCompany: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  projectMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  projectLocation: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
    marginTop: 2,
  },
  projectChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  projectVoltage: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  projectVoltageText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillPending: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  statusPillCompleted: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextPending: {
    color: '#1D4ED8',
  },
  statusPillTextCompleted: {
    color: '#047857',
  },
  projectChevron: {
    fontSize: 20,
    color: '#94A3B8',
    marginLeft: 8,
  },

  /* Basic Administrative Details Card */
  basicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  basicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  basicHeaderIcon: {
    fontSize: 18,
  },
  basicHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  basicHeaderSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  basicGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  basicGridCol: {
    flex: 1,
  },
  basicField: {
    marginBottom: 10,
  },
  basicLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  basicValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  basicValueHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0284C7',
  },
  basicRemarksBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  basicRemarksLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  basicRemarksText: {
    fontSize: 11,
    color: '#334155',
  },

  /* Section Tabs */
  sectionTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  sectionTabActive: {
    backgroundColor: '#1E293B',
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },

  /* Banners */
  lockedBanner: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 14,
  },
  bannerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  lockedTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#475569',
    letterSpacing: 0.5,
  },
  completedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  completedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  lockedText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  editGuide: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    marginBottom: 14,
  },
  editGuideTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 2,
  },
  editGuideText: {
    fontSize: 11,
    color: '#2563EB',
    lineHeight: 15,
  },

  /* Diagram Canvas Panel */
  canvasPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  editIconButton: {
    marginLeft: 8,
    padding: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  editIconText: {
    fontSize: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  canvasSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 10,
  },
  emptyCanvas: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyCanvasText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  legendBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  legendTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  legendGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDotSym: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },

  /* Line Stats Card */
  lineStatsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  lineStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  lineStat: {
    flex: 1,
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  lineStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  lineStatValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },

  /* Structure Inspector */
  inspectorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  inspectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  inspectorHeaderIcon: {
    fontSize: 18,
  },
  inspectorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  inspectorSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  tapToSelectHint: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tapToSelectText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
  },
  inspectorGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  inspectorCol: {
    flex: 1,
  },
  inspectorItem: {
    marginBottom: 8,
  },
  inspectorLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 1,
  },
  inspectorValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  inspectorValueMono: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0284C7',
    fontFamily: 'monospace',
  },
  inspectorValueHighlight: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7C3AED',
  },
  photosSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  photosScroll: {
    marginTop: 6,
  },
  photoThumbWrapper: {
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: {
    width: 60,
    height: 60,
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  photoIndexText: {
    color: '#FFFFFF',
    fontSize: 7.5,
    fontWeight: 'bold',
  },

  /* Continuation Panel */
  continuationPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  continuationCopy: {
    flex: 1,
    marginRight: 10,
  },
  continuationTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#0F172A',
  },
  continuationText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  continuationButton: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  continuationButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10.5,
  },

  /* ==================== MATERIAL SUMMARY TAB STYLES ==================== */
  materialSection: {
    marginTop: 2,
  },
  materialSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  materialHeaderIcon: {
    fontSize: 20,
  },
  materialHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  materialHeaderSubtitle: {
    fontSize: 10,
    color: '#64748B',
  },
  materialTotalBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  materialTotalBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369A1',
  },

  overviewMetrics: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  metricChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  metricChipNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  metricChipLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 1,
  },

  matCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.2,
    borderLeftWidth: 4,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  matCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  matCardIcon: {
    fontSize: 16,
  },
  matCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  matCardBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matCardBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },

  poleGlobalPillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  polePill: {
    flex: 1,
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  polePillNew: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  polePillOld: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  polePillLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#64748B',
  },
  polePillValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 1,
  },

  breakdownList: {
    gap: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  breakdownRowTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  breakdownBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  chipNew: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  chipNewText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#047857',
  },
  chipOld: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chipOldText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#475569',
  },
  chipTotal: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  chipTotalText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1D4ED8',
  },

  conductorSubSection: {
    marginBottom: 10,
  },
  subSectionTitle: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  conductorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 4,
  },
  conductorName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  conductorSpans: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  emptySubText: {
    fontSize: 10,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },

  dtrItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    marginBottom: 4,
  },
  dtrCapacityBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dtrCapacityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
  },

  matGrid2Cols: {
    flexDirection: 'row',
    gap: 8,
  },
  matStatCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  matStatCardLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  matStatCardValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  matStatCardUnit: {
    fontSize: 8.5,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  emptyMatRow: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  emptyMatText: {
    fontSize: 10.5,
    color: '#94A3B8',
    fontStyle: 'italic',
  },

  /* Edit Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  polePickerScroll: {
    marginBottom: 16,
  },
  poleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  poleChipSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  poleChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  poleChipTextSelected: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '600',
    color: '#0284C7',
  },
  modalActionButtons: {
    gap: 8,
    marginBottom: 10,
  },
  modalButtonPrimary: {
    backgroundColor: '#0284C7',
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11.5,
  },
  modalButtonSecondary: {
    backgroundColor: '#F0F9FF',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  modalButtonSecondaryText: {
    color: '#0284C7',
    fontWeight: '700',
    fontSize: 11,
  },
  modalCancelButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: '#94A3B8',
    fontWeight: '700',
    fontSize: 10.5,
  },

  /* Photo Modal */
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  photoModalContent: {
    width: '100%',
    height: '75%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  closePhotoBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  closePhotoBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
