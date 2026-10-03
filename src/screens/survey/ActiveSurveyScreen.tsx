import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Modal,
  ImageBackground,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useCameraPermissions } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import * as Location from 'expo-location';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, addNode, updateActiveNode, updateSurveyNode, finishSurvey, cancelSurvey, setContinuationParent, updateActiveLineId, SurveyNode } from '../../store';
import { useToast } from '../../components/ToastProvider';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';
import { fetchDomainsAction, fetchTransformersAction, fetchConductorsAction, fetchPolesAction } from '../../store/actions/masterAction';
import { 
  SaveErectionNodeService, 
  UploadErectionImageService,
  GetSignedUrlService,
  GetErectionPoleDetailsService,
  SaveSurveyNodeService,
  GetSurveyPoleDetailsService,
} from '../../services/erectionService';
import { fetchErectionListAction } from '../../store/actions/erectionAction';
import { compressImageIfNeeded } from '../../utils/imageCompressor';
import { extractBackendErrorMessage } from '../../utils/errorHandler';

import ActiveSurveyCamera from './components/ActiveSurveyCamera';
import ActiveSurveyForm, { checkIsHt11kv, checkIsHt33kv } from './components/ActiveSurveyForm';

const extractR2Key = (urlOrKey: string): string => {
  if (!urlOrKey) return '';
  if (urlOrKey.startsWith('GIS/')) return urlOrKey;
  if (urlOrKey.includes('/gis-image/')) {
    const afterBucket = urlOrKey.split('/gis-image/')[1];
    if (afterBucket) {
      return afterBucket.split('?')[0];
    }
  }
  if (urlOrKey.includes('GIS/erections/')) {
    const idx = urlOrKey.indexOf('GIS/erections/');
    const sub = urlOrKey.substring(idx);
    return sub.split('?')[0];
  }
  return urlOrKey;
};

const resolvePhotoUrlAsync = async (urlOrKey: string): Promise<string> => {
  if (!urlOrKey) return '';
  if (
    urlOrKey.startsWith('http://') ||
    urlOrKey.startsWith('https://') ||
    urlOrKey.startsWith('file://') ||
    urlOrKey.startsWith('data:') ||
    urlOrKey.startsWith('content://')
  ) {
    return urlOrKey;
  }
  if (urlOrKey.startsWith('GIS/') || urlOrKey.includes('/erections/') || urlOrKey.includes('/surveys/')) {
    try {
      const cleanKey = extractR2Key(urlOrKey);
      const res = await GetSignedUrlService(cleanKey);
      const signedUrl = res?.data?.Data?.signed_url || res?.data?.data?.signed_url || res?.data?.signed_url;
      if (signedUrl) return signedUrl;
    } catch (e) {
      console.warn('Failed to sign R2 key:', urlOrKey, e);
    }
  }
  return urlOrKey;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SurveyNodeFormInputs {
  nameLabel: string;
  cableSize: string;
  remarks: string;
  assetStatus: 'OLD' | 'NEW' | '';
  dtrCapacity: string;
  conductor: string;
  earthingUsed: string;
  earthingQuantity: string;
  staySetUsed: string;
  staySetQuantity: string;
  poleDbTypes: string[];
  poleDbQuantities: Record<string, string>;
  poleType: string;
  poleMaster: string;
  poleQty: string;
  deadEndClampQty: string;
  suspensionClampQty: string;
  poleClampQty: string;
  ipcQty: string;
  serviceConnectionQty: string;
  extraConsumption: string;

  // Survey-specific structure verification fields
  existingConductor?: string;
  conductorPhaseNo?: string;
  proposedConductor?: string;
  existingDtrCapacity?: string;
  newDtrCapacity?: string;
  structureCondition?: string;
  earthingType?: string;
  earthingRequired?: string;
  existingStaySet?: string;
  existingStaySetQty?: string;
  proposedStaySet?: string;
  newStaySetQty?: string;
  newPoleRequired?: boolean;
}

export default function ActiveSurveyScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { confirm } = useConfirmation();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useDispatch();
  const activeLine = useSelector((state: RootState) => state.survey.activeLine);
  const userId = useSelector((state: RootState) => state.auth.userId);
  const domains = useSelector((state: RootState) => state.master.domains) || {};
  const transformers = useSelector((state: RootState) => state.master.transformers) || [];
  const conductors = useSelector((state: RootState) => state.master.conductors) || [];
  const poles = useSelector((state: RootState) => state.master.poles) || [];

  const isEditingParam = Boolean(route.params?.isEditingNode);
  const targetPoleLabelParam = route.params?.targetPoleLabel;
  const serverNodeDataParam = route.params?.serverNodeData;
  const isContinuationParam = Boolean(route.params?.isContinuation);

  const [isEditingNode, setIsEditingNode] = useState(isEditingParam);
  const [editingPoleLabel, setEditingPoleLabel] = useState<string | undefined>(targetPoleLabelParam);
  const [editingNodeSeq, setEditingNodeSeq] = useState<number | null>(null);
  const [continuationParentLabel, setContinuationParentLabel] = useState<string | null>(
    activeLine?.continuationParentLabel || (isContinuationParam ? targetPoleLabelParam : null)
  );
  const [continuationParentCoords, setContinuationParentCoords] = useState<{ lat: number; lng: number } | null>(null);

  const { control, handleSubmit, setValue, clearErrors, formState: { errors } } = useForm<SurveyNodeFormInputs>({
    defaultValues: {
      nameLabel: '',
      cableSize: '',
      remarks: '',
      assetStatus: '',
      dtrCapacity: '',
      conductor: '',
      poleType: '',
      poleMaster: '',
      poleQty: '',
      earthingUsed: '',
      earthingQuantity: '',
      staySetUsed: '',
      staySetQuantity: '',
      poleDbTypes: [],
      poleDbQuantities: {},
      deadEndClampQty: '',
      suspensionClampQty: '',
      poleClampQty: '',
      ipcQty: '',
      serviceConnectionQty: '',
      extraConsumption: '',
      existingConductor: '',
      conductorPhaseNo: '',
      proposedConductor: '',
      existingDtrCapacity: '',
      newDtrCapacity: '',
      structureCondition: '',
      earthingType: '',
      earthingRequired: '',
      existingStaySet: '',
      existingStaySetQty: '',
      proposedStaySet: '',
      newStaySetQty: '',
      newPoleRequired: false,
    }
  });

  const isHt11kv = checkIsHt11kv(activeLine?.lineType, domains?.['type_of_work']);
  const isHt33kv = checkIsHt33kv(activeLine?.lineType, domains?.['type_of_work']);
  const isHtLine = Boolean(isHt11kv || isHt33kv);

  const isErectionFlow = Boolean(
    route.params?.workflowType === 'ERECTION' ||
    activeLine?.workflowType === 'ERECTION' ||
    activeLine?.id?.startsWith('erect-') ||
    (activeLine?.drawingNo && !activeLine?.id?.startsWith('srv-'))
  );
  const [surveyStep, setSurveyStep] = useState<'CAPTURE' | 'DETAILS'>('DETAILS');
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [nodeType, setNodeType] = useState<'DTR' | 'POLE'>('POLE');
  const [dtrIsNext, setDtrIsNext] = useState(false);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState('WAITING...');
  const [acquiringGps, setAcquiringGps] = useState(false);

  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [polePhotos, setPolePhotos] = useState<string[]>([]);
  const [earthingPhotos, setEarthingPhotos] = useState<string[]>([]);
  const [staySetPhotos, setStaySetPhotos] = useState<string[]>([]);
  const [poleDbPhotos, setPoleDbPhotos] = useState<string[]>([]);
  const [existingConductorPhotos, setExistingConductorPhotos] = useState<string[]>([]);
  const [commonPhotos, setCommonPhotos] = useState<string[]>([]);
  const [photoCategory, setPhotoCategory] = useState<'POLE' | 'EARTHING' | 'STAY_SET' | 'POLE_DB' | 'EXISTING_CONDUCTOR' | 'COMMON'>('POLE');
  const [savingNode, setSavingNode] = useState(false);

  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const lastInitializedSeqRef = useRef<number | null>(null);
  const lastInitializedDtrIsNextRef = useRef<boolean | null>(null);

  const currentSeq = isEditingNode && editingNodeSeq != null
    ? editingNodeSeq
    : (activeLine ? activeLine.nodes.length : 0);
  const isHtTapSurvey = activeLine?.lineType === 'LT_440V' && activeLine.ltStartingPoint === 'HT_TAPPING_POINT';
  const isExistingLtStart = activeLine?.lineType === 'LT_440V' && activeLine.ltStartingPoint === 'EXISTING_LT_LINE';
  const hasDtr = activeLine?.nodes.some(node => node.nodeType === 'DTR') ?? false;
  const isHtPhase = Boolean(isHtTapSurvey && !hasDtr && !dtrIsNext);

  const rawTypeOfWork = domains['type_of_work'];
  const lt440vCode = Array.isArray(rawTypeOfWork) ? rawTypeOfWork.find((d: any) => d.domain_value === 'LT_440V')?.domain_code : undefined;

  const isLt440v = !isHtLine && (activeLine?.lineType === 'LT_440V' || activeLine?.lineType === lt440vCode);

  const rawLtStart = domains['lt_starting_point'];
  const existingLtCodeVal = Array.isArray(rawLtStart) ? rawLtStart.find((d: any) => d.domain_value === 'EXISTING_LT_LINE')?.domain_code : undefined;
  const isExistingLt = activeLine?.ltStartingPoint === 'EXISTING_LT_LINE' || activeLine?.ltStartingPoint === existingLtCodeVal;

  const lineSectionVal = isHtLine
    ? 'HT'
    : (isLt440v
        ? (isExistingLt ? 'LT' : (hasDtr ? 'LT' : 'HT'))
        : undefined);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const spanDistance = (continuationParentCoords && lat && lng)
    ? calculateDistance(continuationParentCoords.lat, continuationParentCoords.lng, lat, lng)
    : null;

  const getDerivedHeight = (poleId?: any) => {
    if (!poleId) return '9m';
    const selectedPoleObj = Array.isArray(poles) ? poles.find(p => String(p.id) === String(poleId)) : undefined;
    const poleNameStr = (selectedPoleObj?.pole_name || '').toUpperCase();
    const poleCodeStr = (selectedPoleObj?.pole_code || '').toUpperCase();
    if (poleNameStr.includes('11M') || poleNameStr.includes('11 M') || poleCodeStr.includes('11M') || poleCodeStr.includes('11P')) {
      return '11m';
    }
    if (poleNameStr.includes('8M') || poleNameStr.includes('8 M') || poleCodeStr.includes('8M') || poleCodeStr.includes('8P')) {
      return '8m';
    }
    if (poleNameStr.includes('9M') || poleNameStr.includes('9 M') || poleCodeStr.includes('9M') || poleCodeStr.includes('9P')) {
      return '9m';
    }
    return '9m';
  };

  // Pre-fill node data when entering in edit mode or continuation mode
  useEffect(() => {
    if (!activeLine) return;

    if (isEditingParam || activeLine.editingNodeId) {
      setIsEditingNode(true);
      const targetLabel = targetPoleLabelParam || activeLine.continuationParentLabel;
      setEditingPoleLabel(targetLabel);

      const localNode = activeLine.nodes.find(n => 
        (targetLabel && n.nameLabel === targetLabel) || 
        (activeLine.editingNodeId && String(n.id) === String(activeLine.editingNodeId))
      );

      const targetData: any = serverNodeDataParam || localNode;
      if (targetData) {
        const seq = localNode ? localNode.sequenceNumber : (serverNodeDataParam?.sequence_number ?? serverNodeDataParam?.sequenceNumber ?? 0);
        setEditingNodeSeq(seq);

        const nameVal = targetData.nameLabel || targetData.name_label || targetLabel || '';
        setValue('nameLabel', nameVal);

        const cableVal = targetData.cableSize || targetData.cable_size || targetData.attributes?.cableSize || '';
        setValue('cableSize', cableVal);

        const remarksVal = targetData.remarks || targetData.attributes?.remarks || '';
        setValue('remarks', remarksVal);

        const assetStatusVal = targetData.assetStatus || targetData.asset_status || targetData.structureCondition || targetData.structure_condition || targetData.attributes?.assetStatus || '';
        setValue('assetStatus', (assetStatusVal === 'NEW' || assetStatusVal === 'OLD') ? assetStatusVal : '');

        const dtrCapVal = targetData.dtrCapacity ?? targetData.dtr_capacity ?? targetData.transformer ?? targetData.attributes?.dtrCapacity;
        setValue('dtrCapacity', dtrCapVal != null && dtrCapVal !== '' ? String(dtrCapVal) : '');

        const conductorVal = targetData.conductor ?? targetData.conductor_type ?? targetData.attributes?.conductor;
        setValue('conductor', conductorVal != null && conductorVal !== '' ? String(conductorVal) : '');

        const rawAttrPoleType = targetData.attributes?.poleType ?? targetData.attributes?.pole_type;
        const rawRootPoleType = targetData.poleType ?? (Number(targetData.pole_type) <= 2 ? targetData.pole_type : undefined);
        let resolvedPoleType = '1';
        const candidatePoleType = rawAttrPoleType ?? rawRootPoleType;
        if (candidatePoleType != null && candidatePoleType !== '') {
          const rawStr = String(candidatePoleType).trim().toLowerCase();
          if (rawStr === '1' || rawStr === 'concrete' || rawStr.includes('concrete pole') || (rawStr.includes('concrete') && !rawStr.includes('non'))) {
            resolvedPoleType = '1';
          } else if (rawStr === '2' || rawStr === 'non-concrete' || rawStr.includes('non')) {
            resolvedPoleType = '2';
          } else if (!isNaN(Number(rawStr)) && Number(rawStr) <= 2) {
            resolvedPoleType = String(Number(rawStr));
          } else {
            resolvedPoleType = '1';
          }
        }
        setValue('poleType', resolvedPoleType);

        const poleMasterVal = targetData.poleMaster ?? 
                              targetData.pole_master ?? 
                              targetData.pole_type_id ?? 
                              targetData.pole_master_id ?? 
                              targetData.attributes?.poleMaster ?? 
                              targetData.attributes?.pole_master ?? 
                              targetData.attributes?.pole_type_id ?? 
                              (Number(targetData.pole_type) > 2 ? targetData.pole_type : '') ??
                              (Number(targetData.poleType) > 2 ? targetData.poleType : '');
        setValue('poleMaster', poleMasterVal != null && poleMasterVal !== '' ? String(poleMasterVal) : '');

        const erectionPoleQtyVal = targetData.poleQty ?? targetData.pole_quantity ?? targetData.attributes?.poleQty;
        setValue('poleQty', erectionPoleQtyVal != null && erectionPoleQtyVal !== '' ? String(erectionPoleQtyVal) : '1');

        const earthingVal = targetData.earthingUsed ?? targetData.earthing ?? targetData.attributes?.earthingUsed;
        setValue('earthingUsed', earthingVal != null && earthingVal !== '' ? String(earthingVal) : '');

        const earthingQtyVal = targetData.earthingQuantity ?? targetData.earthing_quantity ?? targetData.attributes?.earthingQuantity;
        setValue('earthingQuantity', earthingQtyVal != null && earthingQtyVal !== '' ? String(earthingQtyVal) : '');

        const staySetVal = targetData.staySetUsed ?? targetData.stay_set ?? targetData.attributes?.staySetUsed;
        setValue('staySetUsed', staySetVal != null && staySetVal !== '' ? String(staySetVal) : '');

        const staySetQtyVal = targetData.staySetQuantity ?? targetData.stay_set_quantity ?? targetData.attributes?.staySetQuantity;
        setValue('staySetQuantity', staySetQtyVal != null && staySetQtyVal !== '' ? String(staySetQtyVal) : '');

        let dbs: string[] = [];
        const rawDbs = targetData.poleDbTypes || targetData.pole_db || targetData.attributes?.poleDbTypes;
        if (rawDbs) {
          if (Array.isArray(rawDbs)) {
            dbs = rawDbs;
          } else if (typeof rawDbs === 'string') {
            try {
              dbs = JSON.parse(rawDbs);
            } catch {
              dbs = [rawDbs];
            }
          }
        }
        setValue('poleDbTypes', Array.isArray(dbs) ? dbs : []);

        let dbQtys: Record<string, string> = {};
        const rawDbQtys = targetData.poleDbQuantities || targetData.pole_db_quantity || targetData.attributes?.poleDbQuantities;
        if (rawDbQtys) {
          if (typeof rawDbQtys === 'object' && !Array.isArray(rawDbQtys)) {
            dbQtys = rawDbQtys;
          } else if (typeof rawDbQtys === 'string') {
            try {
              dbQtys = JSON.parse(rawDbQtys);
            } catch {
              dbQtys = {};
            }
          }
        }
        setValue('poleDbQuantities', dbQtys);

        const deadEndVal = targetData.deadEndClampQty ?? targetData.dead_end_clamp_qty ?? targetData.dead_end_clamp_quantity ?? targetData.attributes?.deadEndClampQty;
        setValue('deadEndClampQty', deadEndVal != null && deadEndVal !== '' ? String(deadEndVal) : '');

        const suspensionVal = targetData.suspensionClampQty ?? targetData.suspension_clamp_qty ?? targetData.suspension_clamp_quantity ?? targetData.attributes?.suspensionClampQty;
        setValue('suspensionClampQty', suspensionVal != null && suspensionVal !== '' ? String(suspensionVal) : '');

        const poleClampVal = targetData.poleClampQty ?? targetData.pole_clamp_qty ?? targetData.pole_clamp_quantity ?? targetData.attributes?.poleClampQty;
        setValue('poleClampQty', poleClampVal != null && poleClampVal !== '' ? String(poleClampVal) : '');

        const ipcVal = targetData.ipcQty ?? targetData.ipc_qty ?? targetData.ipc_quantity ?? targetData.attributes?.ipcQty;
        setValue('ipcQty', ipcVal != null && ipcVal !== '' ? String(ipcVal) : '');

        const serviceConnVal = targetData.service_connection_qty ?? targetData.serviceConnectionQty ?? targetData.service_connection_quantity ?? targetData.attributes?.service_connection_qty ?? targetData.attributes?.serviceConnectionQty;
        setValue('serviceConnectionQty', serviceConnVal != null && serviceConnVal !== '' ? String(serviceConnVal) : '');

        const extraConsVal = targetData.extraConsumption ?? targetData.extra_consumption ?? targetData.attributes?.extraConsumption;
        setValue('extraConsumption', extraConsVal != null && extraConsVal !== '' ? String(extraConsVal) : '');

        // Pre-fill survey-specific fields
        const existCond = targetData.existingConductor || targetData.attributes?.existingConductor || '';
        setValue('existingConductor', existCond != null ? String(existCond) : '');

        const phaseVal = targetData.conductorPhaseNo || targetData.attributes?.conductorPhaseNo || '';
        setValue('conductorPhaseNo', phaseVal != null ? String(phaseVal) : '');

        const propCond = targetData.proposedConductor || targetData.attributes?.proposedConductor || targetData.conductor || targetData.attributes?.conductor || '';
        setValue('proposedConductor', propCond != null ? String(propCond) : '');

        const structCond = targetData.structureCondition || targetData.structure_condition || targetData.attributes?.structureCondition || targetData.assetStatus || '';
        setValue('structureCondition', structCond != null ? String(structCond) : '');

        const earthType = targetData.earthingType || targetData.earthing_type || targetData.attributes?.earthingType || targetData.earthingUsed || targetData.attributes?.earthingUsed || '';
        setValue('earthingType', earthType != null ? String(earthType) : '');

        const earthReq = targetData.earthingRequired || targetData.earthing_required || targetData.attributes?.earthingRequired || '';
        setValue('earthingRequired', earthReq != null ? String(earthReq) : '');

        const existStay = targetData.existingStaySet || targetData.existing_stay_set || targetData.attributes?.existingStaySet || '';
        setValue('existingStaySet', existStay != null ? String(existStay) : '');

        const existStayQty = targetData.existingStaySetQty || targetData.attributes?.existingStaySetQty || '';
        setValue('existingStaySetQty', existStayQty != null ? String(existStayQty) : '');

        const propStay = targetData.proposedStaySet || targetData.proposed_stay_set || targetData.attributes?.proposedStaySet || targetData.staySetUsed || targetData.attributes?.staySetUsed || '';
        setValue('proposedStaySet', propStay != null ? String(propStay) : '');

        const newStayQty = targetData.newStaySetQty || targetData.attributes?.newStaySetQty || targetData.staySetQuantity || targetData.attributes?.staySetQuantity || '';
        setValue('newStaySetQty', newStayQty != null ? String(newStayQty) : '');

        const existDtr = targetData.existingDtrCapacity || targetData.existing_dtr_capacity || targetData.structure_detail?.existing_dtr_capacity_id || targetData.attributes?.existingDtrCapacity || '';
        setValue('existingDtrCapacity', existDtr != null ? String(existDtr) : '');

        const newDtr = targetData.newDtrCapacity || targetData.new_dtr_capacity || targetData.structure_detail?.new_dtr_capacity_id || targetData.dtrCapacity || targetData.attributes?.newDtrCapacity || '';
        setValue('newDtrCapacity', newDtr != null ? String(newDtr) : '');

        const surveyPoleQtyVal = targetData.poleQty || targetData.pole_qty || targetData.structure_detail?.pole_qty || targetData.attributes?.poleQty || '';
        setValue('poleQty', surveyPoleQtyVal != null && surveyPoleQtyVal !== '' ? String(surveyPoleQtyVal) : '1');

        const newPoleVal = Boolean(targetData.newPoleRequired ?? targetData.attributes?.newPoleRequired ?? (targetData.poleMaster != null && targetData.poleMaster !== ''));
        setValue('newPoleRequired', newPoleVal);

        const nLat = targetData.latitude ?? localNode?.latitude;
        const nLng = targetData.longitude ?? localNode?.longitude;
        if (nLat && nLng) {
          setLat(Number(nLat));
          setLng(Number(nLng));
          setGpsAccuracy('DATABASE LOCKED');
        }

        const parsePhotoArray = (val: any): string[] => {
          if (!val) return [];
          if (Array.isArray(val)) return val.filter(Boolean).map(String);
          if (typeof val === 'string') {
            try {
              const parsed = JSON.parse(val);
              if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
            } catch {
              return [val];
            }
          }
          return [];
        };

        const poleImgs = parsePhotoArray(
          targetData.polePhotos || targetData.pole_photo_urls || targetData.attributes?.polePhotos ||
          (targetData.imageUri ? [targetData.imageUri] : (targetData.photo_url ? [targetData.photo_url] : []))
        );
        if (poleImgs.length) setPolePhotos(poleImgs);

        const earthingImgs = parsePhotoArray(
          targetData.earthingPhotos || targetData.earthing_photo_urls || targetData.attributes?.earthingPhotos
        );
        if (earthingImgs.length) setEarthingPhotos(earthingImgs);

        const staySetImgs = parsePhotoArray(
          targetData.staySetPhotos || targetData.stay_set_photo_urls || targetData.attributes?.staySetPhotos
        );
        if (staySetImgs.length) setStaySetPhotos(staySetImgs);

        const poleDbImgs = parsePhotoArray(
          targetData.poleDbPhotos || targetData.pole_db_photo_urls || targetData.attributes?.poleDbPhotos
        );
        if (poleDbImgs.length) setPoleDbPhotos(poleDbImgs);

        const existCondImgs = parsePhotoArray(
          targetData.existingConductorPhotos || targetData.existing_conductor_photos || targetData.attributes?.existingConductorPhotos
        );
        if (existCondImgs.length) setExistingConductorPhotos(existCondImgs);

        const commonImgs = parsePhotoArray(
          targetData.commonPhotos || targetData.common_photos || targetData.attributes?.commonPhotos
        );
        if (commonImgs.length) setCommonPhotos(commonImgs);

        const allImgs = parsePhotoArray(
          targetData.imageUris || targetData.image_uris || targetData.images || targetData.image_path
        );
        if (allImgs.length) {
          setCapturedPhotos(allImgs);
          if (!poleImgs.length) {
            setPolePhotos(allImgs);
          }
        } else if (poleImgs.length) {
          setCapturedPhotos(poleImgs);
        }

        // Asynchronously resolve any raw R2 storage keys to signed Cloudflare R2 URLs
        const resolveBatch = async (list: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
          const hasRawKeys = list.some(item => item.startsWith('GIS/') || (!item.startsWith('http') && !item.startsWith('file')));
          if (hasRawKeys) {
            const resolved = await Promise.all(list.map(resolvePhotoUrlAsync));
            setter(resolved.filter(Boolean));
          }
        };
        if (poleImgs.length) resolveBatch(poleImgs, setPolePhotos);
        if (earthingImgs.length) resolveBatch(earthingImgs, setEarthingPhotos);
        if (staySetImgs.length) resolveBatch(staySetImgs, setStaySetPhotos);
        if (poleDbImgs.length) resolveBatch(poleDbImgs, setPoleDbPhotos);
        if (existCondImgs.length) resolveBatch(existCondImgs, setExistingConductorPhotos);
        if (commonImgs.length) resolveBatch(commonImgs, setCommonPhotos);
        if (allImgs.length) resolveBatch(allImgs, setCapturedPhotos);

        setNodeType(targetData.node_type || targetData.nodeType || 'POLE');
        setSurveyStep('DETAILS');
      }
    } else if (isContinuationParam || activeLine.continuationParentLabel) {
      const parentLabel = targetPoleLabelParam || activeLine.continuationParentLabel;
      setContinuationParentLabel(parentLabel);
      const parentNode = activeLine.nodes.find(n => n.nameLabel === parentLabel);
      if (parentNode) {
        setContinuationParentCoords({ lat: parentNode.latitude, lng: parentNode.longitude });
      }
    }
  }, [activeLine?.id, isEditingParam, targetPoleLabelParam, serverNodeDataParam, isContinuationParam]);

  useEffect(() => {
    if (activeLine) {
      if (isEditingNode) return;
      if (lastInitializedSeqRef.current === currentSeq && lastInitializedDtrIsNextRef.current === dtrIsNext) {
        return;
      }
      lastInitializedSeqRef.current = currentSeq;
      lastInitializedDtrIsNextRef.current = dtrIsNext;

      // Clear/Reset all the new conditional structure verification fields first
      setValue('dtrCapacity', '');
      setValue('conductor', '');
      setValue('poleType', '');
      setValue('poleMaster', '');
      setValue('poleQty', '');
      setValue('earthingUsed', '');
      setValue('earthingQuantity', '');
      setValue('staySetUsed', '');
      setValue('staySetQuantity', '');
      setValue('poleDbTypes', []);
      setValue('poleDbQuantities', {});
      setValue('deadEndClampQty', '');
      setValue('suspensionClampQty', '');
      setValue('poleClampQty', '');
      setValue('ipcQty', '');
      setValue('serviceConnectionQty', '');
      setValue('extraConsumption', '');
      setValue('newPoleRequired', false);

      const rawTypeOfWorkSeq = domains['type_of_work'];
      const lt440vCode = Array.isArray(rawTypeOfWorkSeq) ? rawTypeOfWorkSeq.find((d: any) => d.domain_value === 'LT_440V')?.domain_code : undefined;

      const isHt11kvSeq = checkIsHt11kv(activeLine.lineType, rawTypeOfWorkSeq);
      const isHt33kvSeq = checkIsHt33kv(activeLine.lineType, rawTypeOfWorkSeq);
      const isHtLineSeq = isHt11kvSeq || isHt33kvSeq;
      const isLt440vSeq = !isHtLineSeq && (activeLine.lineType === 'LT_440V' || activeLine.lineType === lt440vCode);

      if (isLt440vSeq) {
        if (isHtTapSurvey && dtrIsNext) {
          setNodeType('DTR');
          setValue('nameLabel', 'DTR-TRANS-01');
          setValue('cableSize', 'Conductor Grid Lead');
          setValue('remarks', '');
          setValue('assetStatus', '');
        } else if (isHtTapSurvey && !hasDtr) {
          setNodeType('POLE');
          setValue('nameLabel', currentSeq === 0 ? 'TAP-1' : `HT-P-${currentSeq}`);
          setValue('cableSize', '100 sqmm ACSR');
          setValue('remarks', '');
          setValue('assetStatus', '');
        } else if (isExistingLtStart) {
          setNodeType('POLE');
          setValue('nameLabel', currentSeq === 0 ? 'LT-TAP-1' : `LT-P-${currentSeq}`);
          setValue('cableSize', '90 sqmm ABC');
          setValue('remarks', '');
          setValue('assetStatus', '');
        } else if (currentSeq === 0) {
          setNodeType('DTR');
          setValue('nameLabel', 'DTR-TRANS-01');
          setValue('cableSize', 'Conductor Grid Lead');
          setValue('remarks', '');
          setValue('assetStatus', '');
        } else {
          setNodeType('POLE');
          const ltSequence = isHtTapSurvey
            ? activeLine.nodes.filter(node => node.lineSection === 'LT').length + 1
            : currentSeq;
          setValue('nameLabel', `P-${ltSequence}`);
          setValue('cableSize', isHtTapSurvey ? '90 sqmm ABC' : '100 sqmm ACSR');
          setValue('remarks', '');
          setValue('assetStatus', '');
        }
      } else if (isHtLineSeq) {
        setNodeType('POLE');
        setValue('nameLabel', `HT-P-${currentSeq + 1}`);
        setValue('cableSize', '100 sqmm ACSR');
        setValue('remarks', '');
        setValue('assetStatus', '');
      } else {
        if (currentSeq === 0) {
          setNodeType('DTR');
          setValue('nameLabel', 'DTR-TRANS-01');
          setValue('cableSize', 'Conductor Grid Lead');
        } else {
          setNodeType('POLE');
          setValue('nameLabel', `P-${currentSeq}`);
          setValue('cableSize', '100 sqmm ACSR');
        }
        setValue('remarks', '');
        setValue('assetStatus', '');
      }
    }
  }, [currentSeq, activeLine, dtrIsNext, hasDtr, isHtTapSurvey, isExistingLtStart, setValue, domains]);

  const useMockGps = () => {
    const baseLat = 22.5726; 
    const baseLng = 88.3639;
    const offsetLat = (Math.random() - 0.5) * 0.003;
    const offsetLng = (Math.random() - 0.5) * 0.003;
    setLat(parseFloat((baseLat + offsetLat).toFixed(6)));
    setLng(parseFloat((baseLng + offsetLng).toFixed(6)));
    setGpsAccuracy('1.8m (MOCK LOCK)');
  };

  const acquireGps = async () => {
    setAcquiringGps(true);
    setGpsAccuracy('ACQUIRING SIGNAL...');
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsAccuracy('DENIED - MOCKED');
        useMockGps();
        setAcquiringGps(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLat(parseFloat(location.coords.latitude.toFixed(6)));
      setLng(parseFloat(location.coords.longitude.toFixed(6)));
      setGpsAccuracy(`${location.coords.accuracy?.toFixed(1) || '2.0'}m (RTK FIXED)`);
    } catch (error) {
      console.log('GPS error, falling back to mock:', error);
      setGpsAccuracy('ERROR - MOCKED');
      useMockGps();
    } finally {
      setAcquiringGps(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (!cameraPermission || !cameraPermission.granted) {
        await requestCameraPermission();
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        acquireGps();
      }
    })();

    // Fetch master list data for transformers, conductors, poles, and domains via Redux thunk actions
    dispatch(fetchTransformersAction(undefined, (err) => console.log('fetchTransformersAction error:', err)) as any);
    dispatch(fetchConductorsAction(undefined, (err) => console.log('fetchConductorsAction error:', err)) as any);
    dispatch(fetchPolesAction(undefined, (err) => console.log('fetchPolesAction error:', err)) as any);
    dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point', 'earthing', 'stay_set', 'pole_db', 'pole_type', 'structure_condition', 'cond_phase']) as any);

    // If editing pole in erection workflow, fetch fresh certified R2 signed URLs in background
    if (isEditingNode && activeLine) {
      const targetLabel = targetPoleLabelParam || activeLine.continuationParentLabel;
      const rawErectionId = activeLine.id.replace('erect-', '').replace('srv-', '');
      const erectionDbId = !isNaN(Number(rawErectionId)) ? Number(rawErectionId) : undefined;
      const drawingNum = activeLine.drawingNo || undefined;

      if (drawingNum || erectionDbId) {
        GetErectionPoleDetailsService({
          drawing_no: drawingNum,
          erection_id: erectionDbId,
          pole_no: targetLabel,
        })
          .then(res => {
            const resData = res?.data?.Data?.Data || res?.data?.Data?.data || res?.data?.Data || res?.data?.data || res?.data;
            const serverNode = resData?.selected_node;
            if (serverNode) {
              if (Array.isArray(serverNode.polePhotos) && serverNode.polePhotos.length > 0) {
                setPolePhotos(serverNode.polePhotos.filter(Boolean));
              }
              if (Array.isArray(serverNode.earthingPhotos) && serverNode.earthingPhotos.length > 0) {
                setEarthingPhotos(serverNode.earthingPhotos.filter(Boolean));
              }
              if (Array.isArray(serverNode.staySetPhotos) && serverNode.staySetPhotos.length > 0) {
                setStaySetPhotos(serverNode.staySetPhotos.filter(Boolean));
              }
              if (Array.isArray(serverNode.poleDbPhotos) && serverNode.poleDbPhotos.length > 0) {
                setPoleDbPhotos(serverNode.poleDbPhotos.filter(Boolean));
              }
              if (Array.isArray(serverNode.imageUris) && serverNode.imageUris.length > 0) {
                setCapturedPhotos(serverNode.imageUris.filter(Boolean));
              }

              // Ensure poleType and poleMaster are synced from server details
              const sRawAttrPoleType = serverNode.attributes?.poleType ?? serverNode.attributes?.pole_type;
              const sRawRootPoleType = serverNode.poleType ?? (Number(serverNode.pole_type) <= 2 ? serverNode.pole_type : undefined);
              const sPoleType = sRawAttrPoleType ?? sRawRootPoleType;
              if (sPoleType != null && sPoleType !== '') {
                const sStr = String(sPoleType).trim().toLowerCase();
                const resolvedS = (sStr === '2' || sStr === 'non-concrete' || sStr.includes('non')) ? '2' : '1';
                setValue('poleType', resolvedS);
              }
              const sPoleMaster = serverNode.poleMaster ?? 
                                  serverNode.pole_master ?? 
                                  serverNode.pole_type_id ?? 
                                  serverNode.pole_master_id ?? 
                                  serverNode.attributes?.poleMaster ?? 
                                  serverNode.attributes?.pole_master ?? 
                                  serverNode.attributes?.pole_type_id;
              if (sPoleMaster != null && sPoleMaster !== '') {
                setValue('poleMaster', String(sPoleMaster));
              }
            }
          })
          .catch(err => {
            console.log('Background fetch pole details error:', err);
          });
      }

      if (!isErectionFlow) {
        const rawSurveyId = activeLine.id.replace('srv-', '');
        const surveyDbId = !isNaN(Number(rawSurveyId)) ? Number(rawSurveyId) : undefined;
        if (targetLabel || surveyDbId) {
          GetSurveyPoleDetailsService({
            survey_id: surveyDbId || activeLine.id,
            pole_no: targetLabel,
          })
            .then(res => {
              const resData = res?.data?.Data || res?.data?.data || res?.data;
              if (resData) {
                if (Array.isArray(resData.existing_conductor_photos) && resData.existing_conductor_photos.length > 0) {
                  setExistingConductorPhotos(resData.existing_conductor_photos.filter(Boolean));
                }
                if (Array.isArray(resData.common_photos) && resData.common_photos.length > 0) {
                  setCommonPhotos(resData.common_photos.filter(Boolean));
                }
                if (Array.isArray(resData.images) && resData.images.length > 0) {
                  setCapturedPhotos(resData.images.filter(Boolean));
                }
                if (resData.new_pole_required != null) setValue('newPoleRequired', Boolean(resData.new_pole_required));
                if (resData.pole_master_id) setValue('poleMaster', String(resData.pole_master_id));
                if (resData.pole_qty) setValue('poleQty', String(resData.pole_qty));
                if (resData.structure_condition) setValue('structureCondition', String(resData.structure_condition));
                if (resData.existing_conductor) setValue('existingConductor', String(resData.existing_conductor));
                if (resData.conductor_phase_no) setValue('conductorPhaseNo', String(resData.conductor_phase_no));
                if (resData.proposed_conductor_id) setValue('proposedConductor', String(resData.proposed_conductor_id));
                if (resData.existing_dtr_capacity_id) setValue('existingDtrCapacity', String(resData.existing_dtr_capacity_id));
                if (resData.new_dtr_capacity_id) setValue('newDtrCapacity', String(resData.new_dtr_capacity_id));
                if (resData.earthing_type) setValue('earthingType', String(resData.earthing_type));
                if (resData.earthing_required) setValue('earthingRequired', String(resData.earthing_required));
                if (resData.existing_stay_set) setValue('existingStaySet', String(resData.existing_stay_set));
                if (resData.existing_stay_set_qty) setValue('existingStaySetQty', String(resData.existing_stay_set_qty));
                if (resData.proposed_stay_set) setValue('proposedStaySet', String(resData.proposed_stay_set));
                if (resData.new_stay_set_qty) setValue('newStaySetQty', String(resData.new_stay_set_qty));
                if (resData.remarks) setValue('remarks', String(resData.remarks));
              }
            })
            .catch(err => console.log('Background fetch survey pole details error:', err));
        }
      }
    }
  }, [dispatch, isEditingNode]);

  if (!activeLine) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No active survey line found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('MainTabs')}>
          <Text style={styles.backBtnText}>RETURN TO DASHBOARD</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const saveCategorizedPhoto = (uri: string) => {
    if (photoCategory === 'POLE') setPolePhotos(prev => [...prev, uri]);
    else if (photoCategory === 'EARTHING') setEarthingPhotos(prev => [...prev, uri]);
    else if (photoCategory === 'STAY_SET') setStaySetPhotos(prev => [...prev, uri]);
    else if (photoCategory === 'POLE_DB') setPoleDbPhotos(prev => [...prev, uri]);
    else if (photoCategory === 'EXISTING_CONDUCTOR') setExistingConductorPhotos(prev => [...prev, uri]);
    else if (photoCategory === 'COMMON') setCommonPhotos(prev => [...prev, uri]);
  };

  const takePhoto = async () => {
    acquireGps();

    if (cameraRef.current) {
      try {
        setCameraFlash(true);
        setTimeout(() => setCameraFlash(false), 150);
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
        });
        
        if (photo && photo.uri) {
          saveCategorizedPhoto(photo.uri);
          setCapturedPhotos(prev => [...prev, photo.uri]);
          setCameraModalVisible(false);
          setSurveyStep('DETAILS');
        }
      } catch (err) {
        console.log('Camera capture error, falling back to mock:', err);
        const mockUri = 'https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400';
        saveCategorizedPhoto(mockUri);
        setCapturedPhotos(prev => [...prev, mockUri]);
        setCameraModalVisible(false);
        setSurveyStep('DETAILS');
      }
    } else {
      setCameraFlash(true);
      setTimeout(() => setCameraFlash(false), 150);
      const mockUri = 'https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400';
      saveCategorizedPhoto(mockUri);
      setCapturedPhotos(prev => [...prev, mockUri]);
      setCameraModalVisible(false);
      setSurveyStep('DETAILS');
    }
  };

  const handleDeletePhoto = (index: number) => {
    setCapturedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const resetPhotos = () => {
    setCapturedPhotos([]);
    setPolePhotos([]);
    setEarthingPhotos([]);
    setStaySetPhotos([]);
    setPoleDbPhotos([]);
    setExistingConductorPhotos([]);
    setCommonPhotos([]);
  };

  const commitCurrentNode = (data: SurveyNodeFormInputs): boolean => {
    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return false;
    }

    const isMultiCategoryPhotos = true;

    const allPhotos = [
      ...polePhotos,
      ...earthingPhotos,
      ...staySetPhotos,
      ...poleDbPhotos,
      ...existingConductorPhotos,
      ...commonPhotos,
      ...capturedPhotos,
    ];

    // Photo compliance validation: enforced on Erection, flexible on Survey
    if (isErectionFlow) {
      if (polePhotos.length === 0 && capturedPhotos.length === 0) {
        toast.warning('At least 1 compliance image for the Pole/Structure is mandatory.', { title: 'Pole Image required' });
        return false;
      }
      if (data.earthingUsed && earthingPhotos.length === 0) {
        toast.warning('At least 1 compliance image for Earthing is mandatory.', { title: 'Earthing Image required' });
        return false;
      }
      if (data.staySetUsed && staySetPhotos.length === 0) {
        toast.warning('At least 1 compliance image for Stay Set is mandatory.', { title: 'Stay Set Image required' });
        return false;
      }
      const showLtAccessories = !isHtLine && (nodeType === 'DTR' || (nodeType === 'POLE' && lineSectionVal === 'LT'));
      if (showLtAccessories && data.poleDbTypes && data.poleDbTypes.length > 0 && poleDbPhotos.length === 0) {
        toast.warning('At least 1 compliance image for Pole DB is mandatory.', { title: 'Pole DB Image required' });
        return false;
      }
    } else {
      // Survey validation: If user chose Existing Conductor, at least 1 photo is mandatory
      const hasExistingConductor = Boolean(
        data.existingConductor &&
        data.existingConductor !== 'NONE' &&
        data.existingConductor !== ''
      );
      if (hasExistingConductor && existingConductorPhotos.length === 0) {
        toast.warning('At least 1 photo for Existing Conductor / Cable is mandatory.', { title: 'Photo required' });
        return false;
      }
    }

    const defaultNodeLabel = nodeType === 'DTR' ? 'DTR-0' : (isHtLine ? `HT-P-${currentSeq + 1}` : `P-${currentSeq}`);
    const nodeLabel = data.nameLabel.trim() || defaultNodeLabel;
    const parentNode = currentSeq > 0 ? activeLine.nodes[currentSeq - 1] : null;
    const parentLabel = continuationParentLabel || activeLine.continuationParentLabel || parentNode?.nameLabel;

    const isNewPoleReq = !isErectionFlow ? Boolean(data.newPoleRequired) : true;
    const selectedPoleMasterId = (!isErectionFlow && !isNewPoleReq)
      ? null
      : ((data.poleMaster != null && data.poleMaster !== '' && !isNaN(Number(data.poleMaster)))
        ? Number(data.poleMaster)
        : (data.poleType != null && data.poleType !== '' && !isNaN(Number(data.poleType)) ? Number(data.poleType) : null));
    const derivedHeight = getDerivedHeight(selectedPoleMasterId);

    const newNode: SurveyNode = {
      id: `node-${Date.now()}`,
      nodeType,
      assetStatus: data.assetStatus || undefined,
      lineSection: lineSectionVal,
      structureRole: (isHtTapSurvey || isExistingLtStart) && currentSeq === 0 ? 'TAP' : undefined,
      sequenceNumber: isEditingNode && editingNodeSeq != null ? editingNodeSeq : (isHtLine ? currentSeq + 1 : currentSeq),
      nameLabel: nodeLabel,
      latitude: lat,
      longitude: lng,
      attributes: {
        height: derivedHeight,
        tilt: '0°',
        sag: '0.4m',
        newPoleRequired: isNewPoleReq,
        pole_type_id: selectedPoleMasterId,
        poleType: nodeType === 'DTR'
          ? (data.assetStatus === 'NEW' ? (data.poleType ? Number(data.poleType) : null) : 'Transformer platform')
          : (data.poleType ? Number(data.poleType) : null),
        poleMaster: (!isErectionFlow && !isNewPoleReq) ? null : (data.poleMaster ? Number(data.poleMaster) : null),
        cableSize: (() => {
          const selectedConductor = conductors.find(c => String(c.id) === String(data.conductor));
          return selectedConductor ? selectedConductor.conductor_name : (data.conductor || '100 sqmm ACSR');
        })(),
        conductor: data.conductor ? Number(data.conductor) : null,
        earthingUsed: data.earthingUsed || null,
        earthingQuantity: data.earthingQuantity ? Number(data.earthingQuantity) : null,
        staySetUsed: data.staySetUsed || null,
        staySetQuantity: data.staySetQuantity ? Number(data.staySetQuantity) : null,
        poleDbTypes: !isHtLine && data.poleDbTypes && data.poleDbTypes.length > 0 ? JSON.stringify(data.poleDbTypes) : null,
        poleDbQuantities: (() => {
          if (isHtLine) return null;
          const qtyMap: Record<string, string> = {};
          (data.poleDbTypes || []).forEach((type) => {
            qtyMap[type] = data.poleDbQuantities[type] || '0';
          });
          return data.poleDbTypes && data.poleDbTypes.length > 0 ? JSON.stringify(qtyMap) : null;
        })(),
        deadEndClampQty: !isHtLine && data.deadEndClampQty ? Number(data.deadEndClampQty) : null,
        suspensionClampQty: !isHtLine && data.suspensionClampQty ? Number(data.suspensionClampQty) : null,
        poleClampQty: !isHtLine && data.poleClampQty ? Number(data.poleClampQty) : null,
        ipcQty: !isHtLine && data.ipcQty ? Number(data.ipcQty) : null,
        serviceConnectionQty: !isHtLine && (data.serviceConnectionQty != null && data.serviceConnectionQty !== '' && !isNaN(Number(data.serviceConnectionQty))) ? Number(data.serviceConnectionQty) : null,
        service_connection_qty: !isHtLine && (data.serviceConnectionQty != null && data.serviceConnectionQty !== '' && !isNaN(Number(data.serviceConnectionQty))) ? Number(data.serviceConnectionQty) : null,
        extraConsumption: !isHtLine && data.extraConsumption ? Number(data.extraConsumption) : null,
        dtrCapacity: nodeType === 'DTR' ? (data.dtrCapacity ? Number(data.dtrCapacity) : null) : null,
        poleQty: data.newPoleRequired ? (data.poleQty ? Number(data.poleQty) : 1) : ((nodeType === 'DTR' && data.assetStatus === 'NEW') ? (data.poleQty ? Number(data.poleQty) : null) : null),
        remarks: data.remarks || '',
        existingConductor: data.existingConductor || null,
        conductorPhaseNo: data.conductorPhaseNo || null,
        proposedConductor: data.proposedConductor || null,
        proposedConductorName: conductors.find(c => String(c.id) === String(data.proposedConductor || data.conductor))?.conductor_name || null,
        existingDtrCapacity: (data.existingDtrCapacity && data.existingDtrCapacity !== 'NONE') ? data.existingDtrCapacity : null,
        existingDtrCapacityName: transformers.find(t => String(t.id) === String(data.existingDtrCapacity))?.transformer_name || null,
        newDtrCapacity: (data.newDtrCapacity && data.newDtrCapacity !== 'NONE') ? data.newDtrCapacity : null,
        newDtrCapacityName: transformers.find(t => String(t.id) === String(data.newDtrCapacity))?.transformer_name || null,
        poleMasterName: poles.find(p => String(p.id) === String(selectedPoleMasterId))?.pole_name || null,
        structureCondition: data.structureCondition || null,
        earthingType: data.earthingType || null,
        earthingRequired: data.earthingRequired || null,
        existingStaySet: data.existingStaySet || null,
        existingStaySetQty: data.existingStaySetQty ? Number(data.existingStaySetQty) : null,
        proposedStaySet: data.proposedStaySet || null,
        newStaySetQty: data.newStaySetQty ? Number(data.newStaySetQty) : null,
        existingConductorPhotos,
        commonPhotos,
        polePhotos: isMultiCategoryPhotos ? polePhotos : [],
        earthingPhotos: isMultiCategoryPhotos ? earthingPhotos : [],
        staySetPhotos: isMultiCategoryPhotos ? staySetPhotos : [],
        poleDbPhotos: !isHtLine ? poleDbPhotos : [],
      },
      imageUri: isMultiCategoryPhotos ? (commonPhotos[0] || existingConductorPhotos[0] || polePhotos[0] || allPhotos[0] || null) : (capturedPhotos[0] || null),
      imageUris: allPhotos,
      capturedAt: new Date().toISOString(),
      parentLabel,
    };

    dispatch(addNode(newNode));
    return true;
  };
  const uploadSinglePhoto = async (
    uri: string,
    category: string,
    targetNodeLabel: string,
    workflowId: string | number,
    isSurvey: boolean = false
  ): Promise<string> => {
    if (!uri) return '';
    // If already an R2 key, return directly
    if (uri.startsWith('GIS/')) {
      return uri;
    }
    // If it's a Cloudflare R2 presigned URL, extract the canonical storage key
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      const extractedKey = extractR2Key(uri);
      if (extractedKey && extractedKey.startsWith('GIS/')) {
        return extractedKey;
      }
      return uri;
    }
    // Only process local file paths
    if (!uri.startsWith('file://') && !uri.startsWith('content://') && !uri.startsWith('ph://')) {
      return uri;
    }
    try {
      console.log(`[Upload] Compressing ${category} photo... (URI: ${uri})`);
      const compressedUri = await compressImageIfNeeded(uri, 5 * 1024 * 1024);
      console.log(`[Upload] Compressed ${category} photo ready at: ${compressedUri}`);

      const formData = new FormData();
      const filename = compressedUri.split('/').pop() || `${category.toLowerCase()}_${Date.now()}.jpg`;
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1].toLowerCase()}` : 'image/jpeg';

      formData.append('file', {
        uri: compressedUri,
        name: filename,
        type,
      } as any);
      formData.append('category', category);
      formData.append('prefix', isSurvey ? 'GIS/surveys' : 'GIS/erections');
      if (isSurvey) {
        formData.append('survey_id', String(workflowId || ''));
      } else {
        formData.append('erection_id', String(workflowId || ''));
      }
      formData.append('pole_label', targetNodeLabel);
      formData.append('bucket', 'gis-image');

      console.log(`[Upload] Uploading ${category} photo to Cloudflare R2...`);
      const res = await UploadErectionImageService(formData);

      // Django FinalResponseMiddleware envelopes responses in capitalized 'Data'
      const responseData = res?.data?.Data || res?.data?.data || res?.data;
      const uploadedKey = responseData?.key || responseData?.signed_url;

      if (uploadedKey) {
        console.log(`✅ [Upload] Successfully uploaded ${category} photo to Cloudflare R2:`, uploadedKey);
        return uploadedKey;
      }

      console.warn(`⚠️ [Upload] Response did not contain R2 key for ${category}:`, res?.data);
      return uri;
    } catch (uploadErr: any) {
      const errorMsg = extractBackendErrorMessage(uploadErr);
      console.error(`🚨 [Upload] Failed to upload ${category} photo to R2:`, {
        category,
        status: uploadErr?.response?.status,
        backendMessage: errorMsg,
        rawResponse: uploadErr?.response?.data,
      });
      toast.error(`Failed to upload ${category} photo: ${errorMsg}`, { title: 'Upload Failed' });
      return uri;
    }
  };

  const saveErectionNodeToServer = (data: SurveyNodeFormInputs, onSuccess: () => void) => {
    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return;
    }

    if (polePhotos.length === 0) {
      toast.warning('At least 1 compliance image for the Pole/Structure is mandatory.', { title: 'Pole Image required' });
      return;
    }
    if (data.earthingUsed && earthingPhotos.length === 0) {
      toast.warning('At least 1 compliance image for Earthing is mandatory.', { title: 'Earthing Image required' });
      return;
    }
    if (data.staySetUsed && staySetPhotos.length === 0) {
      toast.warning('At least 1 compliance image for Stay Set is mandatory.', { title: 'Stay Set Image required' });
      return;
    }
    const showLtAccessories = nodeType === 'DTR' || (nodeType === 'POLE' && lineSectionVal === 'LT');
    if (showLtAccessories && data.poleDbTypes && data.poleDbTypes.length > 0 && poleDbPhotos.length === 0) {
      toast.warning('At least 1 compliance image for Pole DB is mandatory.', { title: 'Pole DB Image required' });
      return;
    }

    const allPhotos = [...polePhotos, ...earthingPhotos, ...staySetPhotos, ...poleDbPhotos];
    const defaultNodeLabel = nodeType === 'DTR' ? 'DTR-0' : (isHtLine ? `HT-P-${currentSeq + 1}` : `P-${currentSeq}`);
    const nodeLabel = data.nameLabel?.trim() || editingPoleLabel || defaultNodeLabel;
    const parentNode = currentSeq > 0 ? activeLine.nodes[currentSeq - 1] : null;
    const parentLabel = continuationParentLabel || activeLine.continuationParentLabel || parentNode?.nameLabel;

    const resolvedPoleTypeId = (data.poleMaster != null && data.poleMaster !== '' && !isNaN(Number(data.poleMaster)))
      ? Number(data.poleMaster)
      : (data.poleType != null && data.poleType !== '' && !isNaN(Number(data.poleType)) ? Number(data.poleType) : null);
    const derivedHeight = getDerivedHeight(resolvedPoleTypeId);

    const mappedAttrs: any = {
      height: derivedHeight,
      tilt: '0°',
      sag: '0.4m',
    };

    if (isErectionFlow) {
      mappedAttrs.lineSection = lineSectionVal;

      const resolvedPoleTypeId = (data.poleMaster != null && data.poleMaster !== '' && !isNaN(Number(data.poleMaster)))
        ? Number(data.poleMaster)
        : (data.poleType != null && data.poleType !== '' && !isNaN(Number(data.poleType)) ? Number(data.poleType) : null);

      const resolvedServiceConnQty = (data.serviceConnectionQty != null && data.serviceConnectionQty !== '' && !isNaN(Number(data.serviceConnectionQty)))
        ? Number(data.serviceConnectionQty)
        : null;

      mappedAttrs.pole_type_id = resolvedPoleTypeId;
      mappedAttrs.poleTypeId = resolvedPoleTypeId;
      mappedAttrs.pole_master_id = resolvedPoleTypeId;
      mappedAttrs.pole_master = resolvedPoleTypeId;
      mappedAttrs.poleMaster = resolvedPoleTypeId;
      mappedAttrs.service_connection_qty = resolvedServiceConnQty;
      mappedAttrs.serviceConnectionQty = resolvedServiceConnQty;
      mappedAttrs.service_connection_quantity = resolvedServiceConnQty;

      if (nodeType === 'DTR') {
        mappedAttrs.poleType = data.assetStatus === 'NEW' 
          ? (data.poleType ? Number(data.poleType) : null) 
          : 'Transformer platform';
        mappedAttrs.dtrCapacity = data.dtrCapacity ? Number(data.dtrCapacity) : null;
        if (data.assetStatus === 'NEW') {
          mappedAttrs.poleQty = data.poleQty ? Number(data.poleQty) : null;
        }
      } else {
        mappedAttrs.poleType = data.poleType ? Number(data.poleType) : null;
        mappedAttrs.poleQty = data.poleQty ? Number(data.poleQty) : 1;
      }

      // Conductor mapping
      const selectedConductor = conductors.find(c => String(c.id) === String(data.conductor));
      mappedAttrs.cableSize = selectedConductor ? selectedConductor.conductor_name : (data.conductor || '100 sqmm ACSR');
      mappedAttrs.conductor = data.conductor ? Number(data.conductor) : null;
      
      mappedAttrs.earthingUsed = data.earthingUsed || null;
      mappedAttrs.earthingQuantity = data.earthingQuantity ? Number(data.earthingQuantity) : null;
      mappedAttrs.staySetUsed = data.staySetUsed || null;
      mappedAttrs.staySetQuantity = data.staySetQuantity ? Number(data.staySetQuantity) : null;

      if (!isHtLine) {
        mappedAttrs.poleDbTypes = (data.poleDbTypes && data.poleDbTypes.length > 0) ? JSON.stringify(data.poleDbTypes) : null;
        const qtyMap: Record<string, string> = {};
        (data.poleDbTypes || []).forEach((type) => {
          qtyMap[type] = data.poleDbQuantities?.[type] || '0';
        });
        mappedAttrs.poleDbQuantities = (data.poleDbTypes && data.poleDbTypes.length > 0) ? JSON.stringify(qtyMap) : null;

        mappedAttrs.deadEndClampQty = data.deadEndClampQty ? Number(data.deadEndClampQty) : null;
        mappedAttrs.suspensionClampQty = data.suspensionClampQty ? Number(data.suspensionClampQty) : null;
        mappedAttrs.poleClampQty = data.poleClampQty ? Number(data.poleClampQty) : null;
        mappedAttrs.ipcQty = data.ipcQty ? Number(data.ipcQty) : null;
        mappedAttrs.extraConsumption = data.extraConsumption ? Number(data.extraConsumption) : null;
      } else {
        mappedAttrs.poleDbTypes = null;
        mappedAttrs.poleDbQuantities = null;
        mappedAttrs.deadEndClampQty = null;
        mappedAttrs.suspensionClampQty = null;
        mappedAttrs.poleClampQty = null;
        mappedAttrs.ipcQty = null;
        mappedAttrs.extraConsumption = null;
        mappedAttrs.service_connection_qty = null;
        mappedAttrs.serviceConnectionQty = null;
        mappedAttrs.service_connection_quantity = null;
      }
      
      mappedAttrs.assetStatus = data.assetStatus || null;
      mappedAttrs.polePhotos = polePhotos;
      mappedAttrs.earthingPhotos = earthingPhotos;
      mappedAttrs.staySetPhotos = staySetPhotos;
      mappedAttrs.poleDbPhotos = isHtLine ? [] : poleDbPhotos;
    } else {
      mappedAttrs.poleType = 'Concrete';
      mappedAttrs.cableSize = data.cableSize?.trim() || '100 sqmm ACSR';
    }

    const rawErectionId = activeLine.id.replace('erect-', '');
    const validErectionId = !isNaN(Number(rawErectionId)) ? Number(rawErectionId) : null;

    const targetLocalNode = isEditingNode
      ? activeLine.nodes.find(n => n.nameLabel === (editingPoleLabel || nodeLabel) || (editingNodeSeq != null && n.sequenceNumber === editingNodeSeq))
      : null;
    const targetNodeDbId = serverNodeDataParam?.id || (!isNaN(Number(targetLocalNode?.id)) ? Number(targetLocalNode?.id) : null);

    const payload: any = {
      erection_execution_id: validErectionId || rawErectionId,
      drawing_no: activeLine.drawingNo || undefined,
      node_id: isEditingNode ? (targetNodeDbId || undefined) : undefined,
      id: isEditingNode ? (targetNodeDbId || undefined) : undefined,
      node_type: nodeType,
      sequence_number: isEditingNode && editingNodeSeq != null ? editingNodeSeq : (isHtLine ? currentSeq + 1 : currentSeq),
      name_label: nodeLabel,
      latitude: lat,
      longitude: lng,
      parent_label: parentLabel,
      attributes: mappedAttrs,
      images: allPhotos,
      captured_at: new Date().toISOString(),
      user_id: userId || null,
      dtr_capacity: mappedAttrs.dtrCapacity,
      dtr_serial_no: nodeType === 'DTR' ? (data.nameLabel || nodeLabel) : null,
      conductor: mappedAttrs.conductor,
      pole_type_id: mappedAttrs.pole_type_id,
      pole_type: mappedAttrs.pole_type_id,
      pole_master_id: mappedAttrs.pole_type_id,
      pole_master: mappedAttrs.pole_type_id,
      poleMaster: mappedAttrs.pole_type_id,
      poleType: mappedAttrs.poleType,
      pole_qty: mappedAttrs.poleQty,
      structure_condition: data.assetStatus || null,
      earthing_used: mappedAttrs.earthingUsed,
      earthing_quantity: mappedAttrs.earthingQuantity,
      stay_set_used: mappedAttrs.staySetUsed,
      stay_set_quantity: mappedAttrs.staySetQuantity,
      pole_db_type_codes: data.poleDbTypes || [],
      pole_db_quantities: mappedAttrs.poleDbQuantities ? JSON.parse(mappedAttrs.poleDbQuantities) : {},
      dead_end_clamp_qty: mappedAttrs.deadEndClampQty,
      suspension_clamp_qty: mappedAttrs.suspensionClampQty,
      pole_clamp_qty: mappedAttrs.poleClampQty,
      ipc_qty: mappedAttrs.ipcQty,
      service_connection_qty: mappedAttrs.service_connection_qty,
      serviceConnectionQty: mappedAttrs.service_connection_qty,
      service_connection_quantity: mappedAttrs.service_connection_qty,
      extra_consumption: mappedAttrs.extraConsumption,
      remarks: data.remarks || '',
    };

    setSavingNode(true);
    toast.info('Uploading compliance photos to Cloudflare R2...', { title: 'Cloudflare R2' });

    (async () => {
      try {
        const targetErectionId = validErectionId || rawErectionId;
        const uploadedPolePhotos = await Promise.all(polePhotos.map(p => uploadSinglePhoto(p, 'POLE', nodeLabel, targetErectionId)));
        const uploadedEarthingPhotos = await Promise.all(earthingPhotos.map(p => uploadSinglePhoto(p, 'EARTHING', nodeLabel, targetErectionId)));
        const uploadedStaySetPhotos = await Promise.all(staySetPhotos.map(p => uploadSinglePhoto(p, 'STAY_SET', nodeLabel, targetErectionId)));
        const uploadedPoleDbPhotos = isHtLine ? [] : await Promise.all(poleDbPhotos.map(p => uploadSinglePhoto(p, 'POLE_DB', nodeLabel, targetErectionId)));

        mappedAttrs.polePhotos = uploadedPolePhotos;
        mappedAttrs.earthingPhotos = uploadedEarthingPhotos;
        mappedAttrs.staySetPhotos = uploadedStaySetPhotos;
        mappedAttrs.poleDbPhotos = uploadedPoleDbPhotos;

        const allUploadedPhotos = [
          ...uploadedPolePhotos,
          ...uploadedEarthingPhotos,
          ...uploadedStaySetPhotos,
          ...uploadedPoleDbPhotos,
        ];
        payload.images = allUploadedPhotos;
        payload.attributes = mappedAttrs;

        const res = await SaveErectionNodeService(payload);
        setSavingNode(false);
        if (res.status === 200 && res.data && !res.data.Exception) {
          toast.success(res.data.Message || 'Structure and photos saved successfully to server.');
          onSuccess();
        } else {
          const errorMsg = extractBackendErrorMessage(res.data) || 'Failed to save structure';
          console.error('🚨 [Save Structure] Backend reported error:', errorMsg);
          toast.error(errorMsg, { title: 'Server error' });
        }
      } catch (err: any) {
        setSavingNode(false);
        const errorMsg = extractBackendErrorMessage(err);
        console.error('🚨 [Save Structure] Network/Server exception:', {
          message: errorMsg,
          status: err?.response?.status,
          response: err?.response?.data,
        });
        toast.error(errorMsg, { title: 'Network error' });
      }
    })();
  };

  const formatSurveyPayload = (action: 'ADD_STRUCTURE' | 'FINISH_SURVEY', data: SurveyNodeFormInputs) => {
    const isNewPoleReq = !isErectionFlow ? Boolean(data.newPoleRequired) : true;
    const selectedPoleMasterId = (!isErectionFlow && !isNewPoleReq)
      ? null
      : ((data.poleMaster != null && data.poleMaster !== '' && !isNaN(Number(data.poleMaster)))
        ? Number(data.poleMaster)
        : (data.poleType != null && data.poleType !== '' && !isNaN(Number(data.poleType)) ? Number(data.poleType) : null));
    const derivedHeight = getDerivedHeight(selectedPoleMasterId);

    const defaultNodeLabel = nodeType === 'DTR' ? 'DTR-0' : (isHtLine ? `HT-P-${currentSeq + 1}` : `P-${currentSeq}`);
    const nodeLabel = data.nameLabel?.trim() || editingPoleLabel || defaultNodeLabel;

    return {
      action,
      timestamp: new Date().toISOString(),
      workflow: isErectionFlow ? 'ERECTION' : 'SURVEY',
      node_type: nodeType,
      pole_no: nodeLabel,
      sequence_number: isEditingNode && editingNodeSeq != null ? editingNodeSeq : (isHtLine ? currentSeq + 1 : currentSeq),
      latitude: lat,
      longitude: lng,
      gps_accuracy: gpsAccuracy,
      continuation_parent: continuationParentLabel || activeLine?.continuationParentLabel || null,
      details: {
        // Section 1: Pole Identification & Condition (Mandatory)
        new_pole_required: isNewPoleReq,
        pole_master_id: selectedPoleMasterId,
        pole_qty: isNewPoleReq ? (data.poleQty ? Number(data.poleQty) : 1) : null,
        pole_no: nodeLabel,
        structure_condition: data.structureCondition || null,
        derived_height: derivedHeight,

        // Section 2: Conductor & Cable Specifications
        existing_conductor: data.existingConductor || null,
        conductor_phase_no: data.conductorPhaseNo || null,
        existing_conductor_photos: existingConductorPhotos,
        proposed_conductor_id: data.proposedConductor ? Number(data.proposedConductor) : (data.conductor ? Number(data.conductor) : null),

        // Section 3: Distribution Transformer (DTR) Specifications
        existing_dtr_capacity_id: (data.existingDtrCapacity && data.existingDtrCapacity !== 'NONE') ? Number(data.existingDtrCapacity) : null,
        new_dtr_capacity_id: (data.newDtrCapacity && data.newDtrCapacity !== 'NONE') ? Number(data.newDtrCapacity) : null,

        // Section 4: Earthing Specifications
        earthing_type: data.earthingType || null,
        earthing_required: data.earthingRequired || null,

        // Section 5: Stay Set Support
        existing_stay_set: data.existingStaySet || null,
        existing_stay_set_qty: data.existingStaySetQty ? Number(data.existingStaySetQty) : null,
        proposed_stay_set: data.proposedStaySet || null,
        new_stay_set_qty: data.newStaySetQty ? Number(data.newStaySetQty) : null,

        // Section 6: Common Site Photos
        common_photos: commonPhotos,

        // Section 7: Site Remarks
        remarks: data.remarks || '',
      },
      all_photos: [
        ...existingConductorPhotos,
        ...commonPhotos,
        ...polePhotos,
        ...earthingPhotos,
        ...staySetPhotos,
        ...capturedPhotos,
      ],
    };
  };

  const saveSurveyNodeToServer = (data: SurveyNodeFormInputs, onSuccess: () => void) => {
    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return;
    }

    if (data.newPoleRequired) {
      if (!data.poleMaster) {
        toast.warning('Pole Master is required when New Pole is selected.', { title: 'Pole Master required' });
        return;
      }
      if (!data.poleQty) {
        toast.warning('Pole Quantity is required when New Pole is selected.', { title: 'Pole Qty required' });
        return;
      }
    }

    const hasExistingConductor = Boolean(
      data.existingConductor &&
      data.existingConductor !== 'NONE' &&
      data.existingConductor !== ''
    );
    if (hasExistingConductor && existingConductorPhotos.length === 0) {
      toast.warning('At least 1 photo for Existing Conductor / Cable is mandatory.', { title: 'Photo required' });
      return;
    }

    const defaultNodeLabel = nodeType === 'DTR' ? 'DTR-0' : (isHtLine ? `HT-P-${currentSeq + 1}` : `P-${currentSeq}`);
    const nodeLabel = data.nameLabel?.trim() || editingPoleLabel || defaultNodeLabel;
    const parentNode = currentSeq > 0 ? activeLine.nodes[currentSeq - 1] : null;
    const parentLabel = continuationParentLabel || activeLine.continuationParentLabel || parentNode?.nameLabel;

    const rawSurveyId = activeLine.id.replace('srv-', '');
    const validSurveyId = !isNaN(Number(rawSurveyId)) ? Number(rawSurveyId) : null;
    const targetNodeDbId = serverNodeDataParam?.id || undefined;

    setSavingNode(true);
    toast.info('Uploading survey photos to Cloudflare R2...', { title: 'Cloudflare R2' });

    (async () => {
      try {
        const uploadedExistingCondPhotos = await Promise.all(
          existingConductorPhotos.map(p => uploadSinglePhoto(p, 'EXISTING_CONDUCTOR', nodeLabel, validSurveyId || activeLine.id, true))
        );
        const uploadedCommonPhotos = await Promise.all(
          commonPhotos.map(p => uploadSinglePhoto(p, 'COMMON', nodeLabel, validSurveyId || activeLine.id, true))
        );

        const allUploadedPhotos = [
          ...uploadedExistingCondPhotos,
          ...uploadedCommonPhotos,
        ];

        const isNewPoleReq = Boolean(data.newPoleRequired);
        const selectedPoleMasterId = isNewPoleReq && data.poleMaster ? Number(data.poleMaster) : null;
        const selectedPoleQty = isNewPoleReq ? (data.poleQty ? Number(data.poleQty) : 1) : null;

        const payload: any = {
          survey_line_id: validSurveyId || activeLine.id,
          node_id: targetNodeDbId,
          id: targetNodeDbId,
          node_type: nodeType,
          sequence_number: isEditingNode && editingNodeSeq != null ? editingNodeSeq : (isHtLine ? currentSeq + 1 : currentSeq),
          name_label: nodeLabel,
          latitude: lat,
          longitude: lng,
          parent_label: parentLabel,
          line_type: activeLine.lineType,
          contractor_name: activeLine.contractorName,
          feeder_name: activeLine.feederName,
          details: {
            new_pole_required: isNewPoleReq,
            pole_master_id: selectedPoleMasterId,
            pole_qty: selectedPoleQty,
            structure_condition: data.structureCondition || null,
            existing_conductor: data.existingConductor || null,
            conductor_phase_no: data.conductorPhaseNo || null,
            proposed_conductor_id: data.proposedConductor ? Number(data.proposedConductor) : (data.conductor ? Number(data.conductor) : null),
            existing_dtr_capacity_id: (data.existingDtrCapacity && data.existingDtrCapacity !== 'NONE') ? Number(data.existingDtrCapacity) : null,
            new_dtr_capacity_id: (data.newDtrCapacity && data.newDtrCapacity !== 'NONE') ? Number(data.newDtrCapacity) : null,
            earthing_type: data.earthingType || null,
            earthing_required: data.earthingRequired || null,
            existing_stay_set: data.existingStaySet || null,
            existing_stay_set_qty: data.existingStaySetQty ? Number(data.existingStaySetQty) : null,
            proposed_stay_set: data.proposedStaySet || null,
            new_stay_set_qty: data.newStaySetQty ? Number(data.newStaySetQty) : null,
            remarks: data.remarks || '',
          },
          existing_conductor_photos: uploadedExistingCondPhotos,
          common_photos: uploadedCommonPhotos,
          images: allUploadedPhotos,
        };

        console.log('🚀 [Save Survey Structure] Submitting payload to server:', JSON.stringify(payload, null, 2));
        const res = await SaveSurveyNodeService(payload);
        setSavingNode(false);

        if (res.status === 200 && res.data && !res.data.Exception) {
          const serverSid = res.data?.Data?.survey_line_id;
          if (serverSid) {
            dispatch(updateActiveLineId(String(serverSid)));
            if (activeLine) {
              activeLine.id = String(serverSid);
            }
          }
          toast.success(res.data.Message || 'Survey structure details saved successfully.');
          onSuccess();
        } else {
          const errorMsg = extractBackendErrorMessage(res.data) || 'Failed to save survey structure';
          console.error('🚨 [Save Survey Structure] Backend reported error:', errorMsg);
          toast.error(errorMsg, { title: 'Server error' });
        }
      } catch (err: any) {
        setSavingNode(false);
        const errorMsg = extractBackendErrorMessage(err);
        console.error('🚨 [Save Survey Structure] Network/Server exception:', errorMsg);
        toast.warning('Server unreachable. Saved to local queue.', { title: 'Offline Mode' });
        onSuccess();
      }
    })();
  };

  const handleAddNew = (data: SurveyNodeFormInputs) => {
    const surveyPayload = formatSurveyPayload('ADD_STRUCTURE', data);
    console.log('📋 [SURVEY PAYLOAD - ADD STRUCTURE]:\n', JSON.stringify(surveyPayload, null, 2));

    const proceed = () => {
      if (commitCurrentNode(data)) {
        if (nodeType === 'DTR') setDtrIsNext(false);
        const defaultAddedLabel = nodeType === 'DTR' ? 'DTR-0' : (isHtLine ? `HT-P-${currentSeq + 1}` : `P-${currentSeq}`);
        const addedPoleLabel = data.nameLabel.trim() || defaultAddedLabel;
        setContinuationParentLabel(addedPoleLabel);
        if (lat && lng) {
          setContinuationParentCoords({ lat, lng });
        }
        setIsEditingNode(false);
        setEditingPoleLabel(undefined);
        setEditingNodeSeq(null);
        resetPhotos();
        setValue('nameLabel', '');
        setValue('newPoleRequired', false);
        setValue('poleMaster', '');
        setValue('poleQty', '');
        setValue('existingConductor', '');
        setValue('conductorPhaseNo', '');
        setValue('proposedConductor', '');
        setValue('existingDtrCapacity', '');
        setValue('newDtrCapacity', '');
        setValue('structureCondition', '');
        setValue('earthingType', '');
        setValue('earthingRequired', '');
        setValue('existingStaySet', '');
        setValue('existingStaySetQty', '');
        setValue('proposedStaySet', '');
        setValue('newStaySetQty', '');
        setValue('remarks', '');
        setLat(null);
        setLng(null);
        setGpsAccuracy('WAITING...');
        setSurveyStep('DETAILS');
        acquireGps();
      }
    };

    if (isErectionFlow) {
      saveErectionNodeToServer(data, proceed);
    } else {
      saveSurveyNodeToServer(data, proceed);
    }
  };

  const handleUpdateCurrentPole = async (data: SurveyNodeFormInputs, onDone?: () => void) => {
    if (!activeLine) return;
    if (!lat || !lng) {
      toast.warning('Waiting for valid GPS location coordinates.', { title: 'GPS required' });
      return;
    }

    const defaultNodeLabel = nodeType === 'DTR' ? 'DTR-0' : (isHtLine ? `HT-P-${currentSeq + 1}` : `P-${currentSeq}`);
    const nodeLabel = data.nameLabel.trim() || editingPoleLabel || defaultNodeLabel;

    const resolvedPoleTypeId = (data.poleMaster != null && data.poleMaster !== '' && !isNaN(Number(data.poleMaster)))
      ? Number(data.poleMaster)
      : (data.poleType != null && data.poleType !== '' && !isNaN(Number(data.poleType)) ? Number(data.poleType) : null);
    const derivedHeight = getDerivedHeight(resolvedPoleTypeId);

    const mappedAttrs: any = {
      height: derivedHeight,
      tilt: '0°',
      sag: '0.4m',
    };

    if (isErectionFlow || isHtLine) {
      mappedAttrs.lineSection = lineSectionVal;

      const resolvedPoleTypeId = (data.poleMaster != null && data.poleMaster !== '' && !isNaN(Number(data.poleMaster)))
        ? Number(data.poleMaster)
        : (data.poleType != null && data.poleType !== '' && !isNaN(Number(data.poleType)) ? Number(data.poleType) : null);

      const resolvedServiceConnQty = (data.serviceConnectionQty != null && data.serviceConnectionQty !== '' && !isNaN(Number(data.serviceConnectionQty)))
        ? Number(data.serviceConnectionQty)
        : null;

      mappedAttrs.pole_type_id = resolvedPoleTypeId;
      mappedAttrs.poleTypeId = resolvedPoleTypeId;
      mappedAttrs.pole_master_id = resolvedPoleTypeId;
      mappedAttrs.pole_master = resolvedPoleTypeId;
      mappedAttrs.poleMaster = resolvedPoleTypeId;
      mappedAttrs.service_connection_qty = resolvedServiceConnQty;
      mappedAttrs.serviceConnectionQty = resolvedServiceConnQty;
      mappedAttrs.service_connection_quantity = resolvedServiceConnQty;

      if (nodeType === 'DTR') {
        mappedAttrs.poleType = data.assetStatus === 'NEW' 
          ? (data.poleType ? Number(data.poleType) : null) 
          : 'Transformer platform';
        mappedAttrs.dtrCapacity = data.dtrCapacity ? Number(data.dtrCapacity) : null;
        if (data.assetStatus === 'NEW') {
          mappedAttrs.poleQty = data.poleQty ? Number(data.poleQty) : null;
        }
      } else {
        mappedAttrs.poleType = data.poleType ? Number(data.poleType) : null;
        mappedAttrs.poleQty = data.poleQty ? Number(data.poleQty) : 1;
      }

      const selectedConductor = conductors.find(c => String(c.id) === String(data.conductor));
      mappedAttrs.cableSize = selectedConductor ? selectedConductor.conductor_name : (data.conductor || '100 sqmm ACSR');
      mappedAttrs.conductor = data.conductor ? Number(data.conductor) : null;
      
      mappedAttrs.earthingUsed = data.earthingUsed || null;
      mappedAttrs.earthingQuantity = data.earthingQuantity ? Number(data.earthingQuantity) : null;
      mappedAttrs.staySetUsed = data.staySetUsed || null;
      mappedAttrs.staySetQuantity = data.staySetQuantity ? Number(data.staySetQuantity) : null;

      if (!isHtLine) {
        mappedAttrs.poleDbTypes = data.poleDbTypes.length > 0 ? JSON.stringify(data.poleDbTypes) : null;
        const qtyMap: Record<string, string> = {};
        data.poleDbTypes.forEach((type) => {
          qtyMap[type] = data.poleDbQuantities[type] || '0';
        });
        mappedAttrs.poleDbQuantities = data.poleDbTypes.length > 0 ? JSON.stringify(qtyMap) : null;

        mappedAttrs.deadEndClampQty = data.deadEndClampQty ? Number(data.deadEndClampQty) : null;
        mappedAttrs.suspensionClampQty = data.suspensionClampQty ? Number(data.suspensionClampQty) : null;
        mappedAttrs.poleClampQty = data.poleClampQty ? Number(data.poleClampQty) : null;
        mappedAttrs.ipcQty = data.ipcQty ? Number(data.ipcQty) : null;
        mappedAttrs.extraConsumption = data.extraConsumption ? Number(data.extraConsumption) : null;
      } else {
        mappedAttrs.poleDbTypes = null;
        mappedAttrs.poleDbQuantities = null;
        mappedAttrs.deadEndClampQty = null;
        mappedAttrs.suspensionClampQty = null;
        mappedAttrs.poleClampQty = null;
        mappedAttrs.ipcQty = null;
        mappedAttrs.extraConsumption = null;
        mappedAttrs.service_connection_qty = null;
        mappedAttrs.serviceConnectionQty = null;
        mappedAttrs.service_connection_quantity = null;
      }
      mappedAttrs.assetStatus = data.assetStatus || null;
      mappedAttrs.remarks = data.remarks || '';
      mappedAttrs.polePhotos = polePhotos;
      mappedAttrs.earthingPhotos = earthingPhotos;
      mappedAttrs.staySetPhotos = staySetPhotos;
      mappedAttrs.poleDbPhotos = isHtLine ? [] : poleDbPhotos;
    } else {
      mappedAttrs.poleType = 'Concrete';
      mappedAttrs.cableSize = data.cableSize.trim() || '100 sqmm ACSR';
    }

    const targetLocalNode = activeLine.nodes.find(n => n.nameLabel === (editingPoleLabel || nodeLabel) || (editingNodeSeq != null && n.sequenceNumber === editingNodeSeq));

    if (isErectionFlow) {
      const rawErectionId = activeLine.id.replace('erect-', '');
      const validErectionId = !isNaN(Number(rawErectionId)) ? Number(rawErectionId) : null;
      const targetNodeDbId = serverNodeDataParam?.id || (!isNaN(Number(targetLocalNode?.id)) ? Number(targetLocalNode?.id) : null);
      const targetErectionId = validErectionId || rawErectionId;

      setSavingNode(true);
      toast.info('Uploading compliance photos to Cloudflare R2...', { title: 'Cloudflare R2' });

      try {
        const uploadedPolePhotos = await Promise.all(polePhotos.map(p => uploadSinglePhoto(p, 'POLE', nodeLabel, targetErectionId)));
        const uploadedEarthingPhotos = await Promise.all(earthingPhotos.map(p => uploadSinglePhoto(p, 'EARTHING', nodeLabel, targetErectionId)));
        const uploadedStaySetPhotos = await Promise.all(staySetPhotos.map(p => uploadSinglePhoto(p, 'STAY_SET', nodeLabel, targetErectionId)));
        const uploadedPoleDbPhotos = isHtLine ? [] : await Promise.all(poleDbPhotos.map(p => uploadSinglePhoto(p, 'POLE_DB', nodeLabel, targetErectionId)));

        mappedAttrs.polePhotos = uploadedPolePhotos;
        mappedAttrs.earthingPhotos = uploadedEarthingPhotos;
        mappedAttrs.staySetPhotos = uploadedStaySetPhotos;
        mappedAttrs.poleDbPhotos = uploadedPoleDbPhotos;

        const allUploadedPhotos = [
          ...uploadedPolePhotos,
          ...uploadedEarthingPhotos,
          ...uploadedStaySetPhotos,
          ...uploadedPoleDbPhotos,
        ];

        const updatedNode: SurveyNode = {
          id: targetLocalNode?.id || `node-${Date.now()}`,
          nodeType,
          assetStatus: data.assetStatus || undefined,
          lineSection: lineSectionVal,
          sequenceNumber: editingNodeSeq != null ? editingNodeSeq : currentSeq,
          nameLabel: nodeLabel,
          latitude: lat,
          longitude: lng,
          attributes: mappedAttrs,
          imageUri: uploadedPolePhotos[0] || allUploadedPhotos[0] || null,
          imageUris: allUploadedPhotos,
          capturedAt: targetLocalNode?.capturedAt || new Date().toISOString(),
          parentLabel: targetLocalNode?.parentLabel,
        };

        dispatch(updateActiveNode(updatedNode));
        dispatch(updateSurveyNode({
          lineId: activeLine.id,
          nodeId: updatedNode.id,
          nameLabel: updatedNode.nameLabel,
          latitude: updatedNode.latitude,
          longitude: updatedNode.longitude,
          parentLabel: updatedNode.parentLabel,
          attributes: mappedAttrs,
        }));

        const payload: any = {
          erection_execution_id: targetErectionId,
          drawing_no: activeLine.drawingNo || undefined,
          node_id: targetNodeDbId || undefined,
          id: targetNodeDbId || undefined,
          node_type: nodeType,
          sequence_number: editingNodeSeq != null ? editingNodeSeq : currentSeq,
          name_label: nodeLabel,
          latitude: lat,
          longitude: lng,
          parent_label: updatedNode.parentLabel,
          attributes: mappedAttrs,
          images: allUploadedPhotos,
          captured_at: new Date().toISOString(),
          user_id: userId || null,
          dtr_capacity: mappedAttrs.dtrCapacity,
          dtr_serial_no: nodeType === 'DTR' ? data.nameLabel : null,
          conductor: mappedAttrs.conductor,
          pole_type_id: mappedAttrs.pole_type_id,
          pole_type: mappedAttrs.pole_type_id,
          pole_master_id: mappedAttrs.pole_type_id,
          pole_master: mappedAttrs.pole_type_id,
          poleMaster: mappedAttrs.pole_type_id,
          poleType: mappedAttrs.poleType,
          pole_qty: mappedAttrs.poleQty,
          structure_condition: data.assetStatus || null,
          earthing_used: mappedAttrs.earthingUsed,
          earthing_quantity: mappedAttrs.earthingQuantity,
          stay_set_used: mappedAttrs.staySetUsed,
          stay_set_quantity: mappedAttrs.staySetQuantity,
          pole_db_type_codes: data.poleDbTypes,
          pole_db_quantities: mappedAttrs.poleDbQuantities ? JSON.parse(mappedAttrs.poleDbQuantities) : {},
          dead_end_clamp_qty: mappedAttrs.deadEndClampQty,
          suspension_clamp_qty: mappedAttrs.suspensionClampQty,
          pole_clamp_qty: mappedAttrs.poleClampQty,
          ipc_qty: mappedAttrs.ipcQty,
          service_connection_qty: mappedAttrs.service_connection_qty,
          serviceConnectionQty: mappedAttrs.service_connection_qty,
          service_connection_quantity: mappedAttrs.service_connection_qty,
          extra_consumption: mappedAttrs.extraConsumption,
          remarks: data.remarks || '',
        };

        const res = await SaveErectionNodeService(payload);
        setSavingNode(false);
        if (res.status === 200 && res.data && !res.data.Exception) {
          toast.success(`Pole ${nodeLabel} updated successfully in database.`);
          if (onDone) onDone();
        } else {
          const errorMsg = extractBackendErrorMessage(res.data) || 'Failed to update pole on server';
          console.error('🚨 [Update Pole] Server error:', errorMsg);
          toast.error(errorMsg, { title: 'Server error' });
        }
      } catch (err: any) {
        setSavingNode(false);
        const errorMsg = extractBackendErrorMessage(err);
        console.error('🚨 [Update Pole] Server exception:', errorMsg);
        toast.warning('Updated locally, but server update failed.');
      }
    } else {
      const allPhotos = [...existingConductorPhotos, ...commonPhotos, ...polePhotos, ...earthingPhotos, ...staySetPhotos, ...capturedPhotos];
      const updatedNode: SurveyNode = {
        id: targetLocalNode?.id || `node-${Date.now()}`,
        nodeType,
        assetStatus: data.assetStatus || undefined,
        lineSection: lineSectionVal,
        sequenceNumber: editingNodeSeq != null ? editingNodeSeq : currentSeq,
        nameLabel: nodeLabel,
        latitude: lat,
        longitude: lng,
        attributes: mappedAttrs,
        imageUri: commonPhotos[0] || existingConductorPhotos[0] || polePhotos[0] || allPhotos[0] || null,
        imageUris: allPhotos,
        capturedAt: targetLocalNode?.capturedAt || new Date().toISOString(),
        parentLabel: targetLocalNode?.parentLabel,
      };

      dispatch(updateActiveNode(updatedNode));
      dispatch(updateSurveyNode({
        lineId: activeLine.id,
        nodeId: updatedNode.id,
        nameLabel: updatedNode.nameLabel,
        latitude: updatedNode.latitude,
        longitude: updatedNode.longitude,
        parentLabel: updatedNode.parentLabel,
        attributes: mappedAttrs,
      }));

      saveSurveyNodeToServer(data, () => {
        toast.success(`Structure ${nodeLabel} updated.`);
        if (onDone) onDone();
      });
    }
  };

  const handleContinueFromCurrentPole = (data: SurveyNodeFormInputs) => {
    if (!activeLine) return;
    const parentLabel = data.nameLabel.trim() || editingPoleLabel || `P-${currentSeq}`;
    
    confirm({
      title: 'Continue Line from this Pole?',
      message: `New structures will connect from ${parentLabel} via GPS connecting line.`,
      confirmLabel: 'START CONTINUATION',
      onConfirm: async () => {
        await handleUpdateCurrentPole(data, () => {
          setIsEditingNode(false);
          setEditingPoleLabel(undefined);
          setEditingNodeSeq(null);
          setContinuationParentLabel(parentLabel);
          if (lat && lng) {
            setContinuationParentCoords({ lat, lng });
          }
          dispatch(setContinuationParent(parentLabel));

          // Reset form for next node
          resetPhotos();
          setLat(null);
          setLng(null);
          setGpsAccuracy('WAITING...');
          lastInitializedSeqRef.current = null;
          acquireGps();

          toast.info(`Continuation active from ${parentLabel}. Move to next pole location.`);
        });
      },
    });
  };

  const handleAddDtrNext = (data: SurveyNodeFormInputs) => {
    const proceed = () => {
      if (commitCurrentNode(data)) {
        setDtrIsNext(true);
        resetPhotos();
        setLat(null);
        setLng(null);
        setGpsAccuracy('WAITING...');
        setSurveyStep('DETAILS');
        acquireGps();
      }
    };

    if (isErectionFlow) {
      saveErectionNodeToServer(data, proceed);
    } else {
      saveSurveyNodeToServer(data, proceed);
    }
  };

  const handleFinishSurvey = (data: SurveyNodeFormInputs) => {
    if (data && (data.nameLabel || data.poleMaster)) {
      const surveyPayload = formatSurveyPayload('FINISH_SURVEY', data);
      console.log('📋 [SURVEY PAYLOAD - FINISH SURVEY]:\n', JSON.stringify(surveyPayload, null, 2));
    }

    // Check if the current form has a structure with photos and GPS
    const hasStructureData = Boolean(data?.nameLabel?.trim() || data?.poleMaster);
    const hasPhotos = isErectionFlow 
      ? polePhotos.length > 0 
      : (commonPhotos.length > 0 || existingConductorPhotos.length > 0 || polePhotos.length > 0 || capturedPhotos.length > 0);
    const isCurrentNodeFilled = Boolean((hasStructureData || hasPhotos) && lat && lng);
    const hasPreviousSavedNodes = activeLine.nodes.length > 0;

    // If user already saved previous structures (via ADD STRUCTURE) and the current form is empty, allow finishing session without requiring dummy data for un-erected pole
    if (!isCurrentNodeFilled && hasPreviousSavedNodes && !isEditingNode) {
      confirm({
        title: `Finish Today's ${isErectionFlow ? 'Erection' : 'Survey'} Session?`,
        message: `${activeLine.nodes.length} structure(s) already saved in database. Finish today's work session? The line will remain active so you can resume tomorrow.`,
        confirmLabel: 'FINISH SESSION',
        tone: 'warning',
        onConfirm: () => {
          dispatch(finishSurvey());
          if (isErectionFlow) {
            dispatch(fetchErectionListAction() as any);
          }
          toast.success(
            isErectionFlow 
              ? 'Progress saved to server. Erection line remains in progress.' 
              : 'Survey session finished and queued.'
          );
          navigation.navigate('MainTabs');
        },
      });
      return;
    }

    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return;
    }

    if (isErectionFlow && polePhotos.length === 0) {
      toast.warning('At least 1 compliance image for the Pole/Structure is mandatory.', { title: 'Pole Image required' });
      return;
    }

    const totalNodesCount = activeLine.nodes.length + (isEditingNode ? 0 : 1);
    const defaultFinishLabel = nodeType === 'DTR' ? 'DTR-0' : (isHtLine ? `HT-P-${currentSeq + 1}` : `P-${currentSeq}`);
    const currentLabel = data.nameLabel?.trim() || editingPoleLabel || defaultFinishLabel;

    confirm({
      title: isErectionFlow ? `Finish Today's Erection Session?` : `Finish Survey Line?`,
      message: isErectionFlow
        ? `Save structure ${currentLabel} to database and finish today's session? Total ${totalNodesCount} structure(s) saved. The line will remain in progress for continuation.`
        : `${totalNodesCount} structures, including the current one, will be saved to the offline upload queue.`,
      confirmLabel: 'FINISH LINE',
      tone: 'warning',
      onConfirm: () => {
        const proceed = () => {
          if (commitCurrentNode(data)) {
            dispatch(finishSurvey());
            if (isErectionFlow) {
              dispatch(fetchErectionListAction() as any);
            }
            toast.success(
              isErectionFlow 
                ? 'Structure saved to server and session finished. Line remains in progress.' 
                : 'Survey line saved.'
            );
            navigation.navigate('MainTabs');
          }
        };

        if (isEditingNode) {
          handleUpdateCurrentPole(data, () => {
            dispatch(finishSurvey());
            if (isErectionFlow) {
              dispatch(fetchErectionListAction() as any);
            }
            toast.success('Structure updated and session finished. Line remains in progress.');
            navigation.navigate('MainTabs');
          });
        } else if (isErectionFlow) {
          saveErectionNodeToServer(data, proceed);
        } else {
          saveSurveyNodeToServer(data, proceed);
        }
      },
    });
  };

  const onFormSubmitFinish = () => {
    const hasPhotos = isErectionFlow 
      ? polePhotos.length > 0 
      : (commonPhotos.length > 0 || existingConductorPhotos.length > 0 || polePhotos.length > 0 || capturedPhotos.length > 0);
    const currentName = control._formValues?.nameLabel;
    if (activeLine && activeLine.nodes.length > 0 && !currentName?.trim() && !hasPhotos && !isEditingNode) {
      handleFinishSurvey({} as any);
      return;
    }

    handleSubmit(
      (data) => handleFinishSurvey(data),
      (formErrors) => {
        const firstError = Object.values(formErrors)[0];
        const errorMsg = firstError?.message ? String(firstError.message) : 'Please fill all mandatory fields.';
        toast.warning(errorMsg, { title: 'Required field missing' });
      }
    )();
  };

  const onFormSubmitAddNew = () => {
    handleSubmit(
      (data) => handleAddNew(data),
      (formErrors) => {
        const firstError = Object.values(formErrors)[0];
        const errorMsg = firstError?.message ? String(firstError.message) : 'Please fill all mandatory fields.';
        toast.warning(errorMsg, { title: 'Required field missing' });
      }
    )();
  };

  const onFormSubmitDtrNext = () => {
    handleSubmit(
      (data) => handleAddDtrNext(data),
      (formErrors) => {
        const firstError = Object.values(formErrors)[0];
        const errorMsg = firstError?.message ? String(firstError.message) : 'Please fill all mandatory fields.';
        toast.warning(errorMsg, { title: 'Required field missing' });
      }
    )();
  };

  const getLineAccent = () => {
    switch (activeLine.lineType) {
      case 'HT_11KV': return '#F59E0B';
      case 'HT_33KV': return '#EF4444';
      case 'LT_440V': return '#0284C7';
      default: return '#0284C7';
    }
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

      {/* 2. HEADER */}
      <View style={styles.headerWrapper}>
        <View style={[styles.surveyHeader, surveyStep !== 'CAPTURE' && { backgroundColor: '#116DBE', paddingTop: insets.top + 22, paddingBottom: 32, minHeight: 150, borderBottomWidth: 0, overflow: 'hidden' }]}>
          {surveyStep !== 'CAPTURE' && <View style={StyleSheet.absoluteFill} pointerEvents="none"><ImageBackground source={require('../../../assets/erection-details-hero.png')} style={StyleSheet.absoluteFill} resizeMode="stretch" /></View>}
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: surveyStep !== 'CAPTURE' ? 1 : undefined }}>
            <TouchableOpacity 
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}
              onPress={() => {
                if (activeLine?.nodes && activeLine.nodes.length > 0) {
                  confirm({
                    title: `Exit Active ${isErectionFlow ? 'Erection' : 'Survey'}?`,
                    message: 'Your active session has saved nodes. You can resume anytime from the list.',
                    confirmLabel: 'EXIT TO RUNS',
                    tone: 'warning',
                    onConfirm: () => navigation.navigate('MainTabs'),
                  });
                } else {
                  navigation.goBack();
                }
              }}
            >
              <Text style={{ fontSize: 21, fontWeight: '800', color: '#1677E8' }}>{"\u2039"}</Text>
            </TouchableOpacity>
            <View style={{ flex: surveyStep !== 'CAPTURE' ? 1 : undefined }}>
              <Text style={[styles.subtitleText, surveyStep !== 'CAPTURE' && { color: '#D4E8FF', fontSize: 8, letterSpacing: 1 }]} >
                {isEditingNode 
                  ? `EDITING // ${editingPoleLabel || `NODE #${currentSeq}`}`
                  : (continuationParentLabel 
                      ? `FROM ${continuationParentLabel} // NODE #${currentSeq}`
                      : `ACTIVE ${isErectionFlow ? 'ERECTION' : 'SURVEY'} // NODE #${currentSeq}`)}
              </Text>
              <Text style={[styles.titleText, surveyStep !== 'CAPTURE' && { color: '#FFFFFF', fontSize: 17, flexShrink: 1 }]}>{activeLine.contractorName || activeLine.drawingNo || 'Active Line'}</Text>
              {surveyStep !== 'CAPTURE' && <Text style={{ color: '#D1E6FF', fontSize: 10, marginTop: 4 }}>Project location & assignment</Text>}
            </View>
          </View>
          <View style={[styles.typeBadge, { borderColor: getLineAccent() }, surveyStep !== 'CAPTURE' && { backgroundColor: '#F2F8FF', marginLeft: 8, paddingHorizontal: 6 }]}>
            <Text style={[styles.typeBadgeText, { color: getLineAccent() }]}>
              {getLineTypeLabel(activeLine.lineType)}
            </Text>
          </View>
        </View>
      </View>

      {/* 3. SCREEN BODY */}
      <View style={styles.bodyWrapper}>
        {surveyStep === 'CAPTURE' ? (
          <ActiveSurveyCamera
            cameraPermission={cameraPermission}
            requestCameraPermission={requestCameraPermission}
            cameraRef={cameraRef}
            cameraFlash={cameraFlash}
            currentSeq={currentSeq}
            onTakePhoto={takePhoto}
            onAbandon={() => {
              confirm({
                title: `Abandon ${isErectionFlow ? 'Erection' : 'Survey'}?`,
                message: 'All structures captured in this active session will be discarded.',
                confirmLabel: 'DISCARD SESSION',
                tone: 'destructive',
                onConfirm: () => {
                  dispatch(cancelSurvey());
                  navigation.navigate('MainTabs');
                },
              });
            }}
          />
        ) : (
          <ScrollView style={styles.detailsScroll} contentContainerStyle={[styles.detailsContent, { padding: 12, paddingBottom: Math.max(insets.bottom, 20) }]} keyboardShouldPersistTaps="handled">
            <ActiveSurveyForm
              control={control}
              setValue={setValue}
              errors={errors}
              clearErrors={clearErrors}
              nodeType={nodeType}
              lat={lat}
              lng={lng}
              gpsAccuracy={gpsAccuracy}
              capturedPhotos={capturedPhotos}
              onDeletePhoto={handleDeletePhoto}
              polePhotos={polePhotos}
              onDeletePolePhoto={(index) => setPolePhotos(prev => prev.filter((_, i) => i !== index))}
              earthingPhotos={earthingPhotos}
              onDeleteEarthingPhoto={(index) => setEarthingPhotos(prev => prev.filter((_, i) => i !== index))}
              staySetPhotos={staySetPhotos}
              onDeleteStaySetPhoto={(index) => setStaySetPhotos(prev => prev.filter((_, i) => i !== index))}
              poleDbPhotos={poleDbPhotos}
              onDeletePoleDbPhoto={(index) => setPoleDbPhotos(prev => prev.filter((_, i) => i !== index))}
              existingConductorPhotos={existingConductorPhotos}
              onDeleteExistingConductorPhoto={(index) => setExistingConductorPhotos(prev => prev.filter((_, i) => i !== index))}
              commonPhotos={commonPhotos}
              onDeleteCommonPhoto={(index) => setCommonPhotos(prev => prev.filter((_, i) => i !== index))}
              onTakePhoto={(category) => {
                setPhotoCategory(category);
                setCameraModalVisible(true);
              }}
              lineSection={lineSectionVal}
              acquiringGps={acquiringGps}
              onAcquireGps={acquireGps}
              onRetakePhoto={() => {
                setPhotoCategory('POLE');
                setCameraModalVisible(true);
              }}
              onSubmitAddNew={onFormSubmitAddNew}
              onSubmitFinish={onFormSubmitFinish}
              onSubmitDtrNext={onFormSubmitDtrNext}
              canSetDtrNext={!isHtLine && isHtPhase}
              structureContext={
                isHtLine
                  ? isHt33kv
                    ? '33KV HT LINE // POLE'
                    : '11KV HT LINE // POLE'
                  : isHtTapSurvey
                  ? nodeType === 'DTR'
                    ? 'HT TO LT TRANSITION // DTR'
                    : isHtPhase
                      ? currentSeq === 0 ? '11KV HT // TAP POLE' : '11KV HT // POLE'
                      : 'LT LINE // POLE'
                  : isExistingLtStart
                    ? currentSeq === 0 ? 'LT LINE // EXISTING LINE TAP POLE' : 'LT LINE // POLE'
                  : undefined
              }
              workflowType={isErectionFlow ? 'ERECTION' : 'SURVEY'}
              lineType={activeLine.lineType}
              ltStartingPoint={activeLine.ltStartingPoint}
              transformers={transformers}
              conductors={conductors}
              poles={poles}
              domains={domains}
              isEditingNode={isEditingNode}
              editingPoleLabel={editingPoleLabel}
              continuationParentLabel={continuationParentLabel || undefined}
              spanDistance={spanDistance}
              onUpdatePole={handleSubmit((data) => handleUpdateCurrentPole(data))}
              onContinueFromPole={handleSubmit(handleContinueFromCurrentPole)}
            />
          </ScrollView>
        )}

        {/* Modal-based Camera view for inline compliance capture to prevent unmounting details form */}
        <Modal
          visible={cameraModalVisible}
          animationType="slide"
          onRequestClose={() => setCameraModalVisible(false)}
        >
          <ActiveSurveyCamera
            cameraPermission={cameraPermission}
            requestCameraPermission={requestCameraPermission}
            cameraRef={cameraRef}
            cameraFlash={cameraFlash}
            currentSeq={currentSeq}
            onTakePhoto={takePhoto}
            onAbandon={() => setCameraModalVisible(false)}
            abandonLabel="CLOSE CAMERA"
            hudTitle={`CAPTURE ${photoCategory ? photoCategory.replace(/_/g, ' ') : 'POLE'} PHOTO`}
          />
        </Modal>
      </View>
      {savingNode && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0284C7" />
          <Text style={styles.loadingOverlayText}>Saving structure...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerWrapper: {
    zIndex: 20,
  },
  bodyWrapper: {
    flex: 1,
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  backBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  subtitleText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
  },
  titleText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  typeBadge: {
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingOverlayText: {
    marginTop: 12,
    color: '#0F172A',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
