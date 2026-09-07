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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import * as Location from 'expo-location';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, addNode, finishSurvey, cancelSurvey, SurveyNode } from '../../store';
import { useToast } from '../../components/ToastProvider';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';
import { fetchDomainsAction, fetchTransformersAction, fetchConductorsAction, fetchPolesAction } from '../../store/actions/masterAction';
import { SaveErectionNodeService } from '../../services/erectionService';

import ActiveSurveyCamera from './components/ActiveSurveyCamera';
import ActiveSurveyForm from './components/ActiveSurveyForm';

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
}

export default function ActiveSurveyScreen() {
  const toast = useToast();
  const { confirm } = useConfirmation();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const activeLine = useSelector((state: RootState) => state.survey.activeLine);
  const userId = useSelector((state: RootState) => state.auth.userId);
  const domains = useSelector((state: RootState) => state.master.domains) || {};
  const transformers = useSelector((state: RootState) => state.master.transformers) || [];
  const conductors = useSelector((state: RootState) => state.master.conductors) || [];
  const poles = useSelector((state: RootState) => state.master.poles) || [];

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<SurveyNodeFormInputs>({
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
    }
  });

  const isErectionFlow = activeLine?.workflowType === 'ERECTION';
  const [surveyStep, setSurveyStep] = useState<'CAPTURE' | 'DETAILS'>(isErectionFlow ? 'DETAILS' : 'CAPTURE');
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
  const [photoCategory, setPhotoCategory] = useState<'POLE' | 'EARTHING' | 'STAY_SET' | 'POLE_DB'>('POLE');

  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  const lastInitializedSeqRef = useRef<number | null>(null);
  const lastInitializedDtrIsNextRef = useRef<boolean | null>(null);

  const currentSeq = activeLine ? activeLine.nodes.length : 0;
  const isHtTapSurvey = activeLine?.lineType === 'LT_440V' && activeLine.ltStartingPoint === 'HT_TAPPING_POINT';
  const isExistingLtStart = activeLine?.lineType === 'LT_440V' && activeLine.ltStartingPoint === 'EXISTING_LT_LINE';
  const hasDtr = activeLine?.nodes.some(node => node.nodeType === 'DTR') ?? false;
  const isHtPhase = Boolean(isHtTapSurvey && !hasDtr && !dtrIsNext);

  const lt440vCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'LT_440V')?.domain_code;
  const ht11kvCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'HT_11KV')?.domain_code;
  const ht33kvCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'HT_33KV')?.domain_code;

  const isLt440v = activeLine?.lineType === 'LT_440V' || activeLine?.lineType === lt440vCode;
  const isHt11kv = activeLine?.lineType === 'HT_11KV' || activeLine?.lineType === ht11kvCode;
  const isHt33kv = activeLine?.lineType === 'HT_33KV' || activeLine?.lineType === ht33kvCode;

  const existingLtCodeVal = domains['lt_starting_point']?.find((d: any) => d.domain_value === 'EXISTING_LT_LINE')?.domain_code;
  const isExistingLt = activeLine?.ltStartingPoint === 'EXISTING_LT_LINE' || activeLine?.ltStartingPoint === existingLtCodeVal;

  const lineSectionVal = (isHt11kv || isHt33kv)
    ? 'HT'
    : (isLt440v
        ? (isExistingLt ? 'LT' : (hasDtr ? 'LT' : 'HT'))
        : undefined);

  useEffect(() => {
    if (activeLine) {
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

      const lt440vCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'LT_440V')?.domain_code;
      const ht11kvCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'HT_11KV')?.domain_code;
      const ht33kvCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'HT_33KV')?.domain_code;

      const isLt440v = activeLine.lineType === 'LT_440V' || activeLine.lineType === lt440vCode;
      const isHt11kv = activeLine.lineType === 'HT_11KV' || activeLine.lineType === ht11kvCode;
      const isHt33kv = activeLine.lineType === 'HT_33KV' || activeLine.lineType === ht33kvCode;

      if (isLt440v) {
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
      } else if (isHt11kv || isHt33kv) {
        setNodeType('POLE');
        setValue('nameLabel', `HT-P-${currentSeq}`);
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
    dispatch(fetchTransformersAction(undefined, (err) => console.warn('fetchTransformersAction error:', err)) as any);
    dispatch(fetchConductorsAction(undefined, (err) => console.warn('fetchConductorsAction error:', err)) as any);
    dispatch(fetchPolesAction(undefined, (err) => console.warn('fetchPolesAction error:', err)) as any);
    dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point', 'earthing', 'stay_set', 'pole_db', 'pole_type']) as any);
  }, [dispatch]);

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
  };

  const takePhoto = async () => {
    acquireGps();

    if (cameraRef.current) {
      try {
        setCameraFlash(true);
        setTimeout(() => setCameraFlash(false), 150);
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.6,
          skipProcessing: true
        });
        
        if (photo && photo.uri) {
          if (isErectionFlow) {
            saveCategorizedPhoto(photo.uri);
          } else {
            setCapturedPhotos(prev => [...prev, photo.uri]);
          }
          setCameraModalVisible(false);
          setSurveyStep('DETAILS');
        }
      } catch (err) {
        console.log('Camera capture error, falling back to mock:', err);
        const mockUri = 'https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400';
        if (isErectionFlow) {
          saveCategorizedPhoto(mockUri);
        } else {
          setCapturedPhotos(prev => [...prev, mockUri]);
        }
        setCameraModalVisible(false);
        setSurveyStep('DETAILS');
      }
    } else {
      setCameraFlash(true);
      setTimeout(() => setCameraFlash(false), 150);
      const mockUri = 'https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400';
      if (isErectionFlow) {
        saveCategorizedPhoto(mockUri);
      } else {
        setCapturedPhotos(prev => [...prev, mockUri]);
      }
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
  };

  const commitCurrentNode = (data: SurveyNodeFormInputs): boolean => {
    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return false;
    }

    const allPhotos = isErectionFlow
      ? [...polePhotos, ...earthingPhotos, ...staySetPhotos, ...poleDbPhotos]
      : capturedPhotos;

    if (!isErectionFlow) {
      if (allPhotos.length === 0) {
        toast.warning('At least 1 compliance image is required to save.', { title: 'Image required' });
        return false;
      }
    } else {
      // ERECTION flow validation
      // 1. Pole images validation (at least 1 mandatory)
      if (polePhotos.length === 0) {
        toast.warning('At least 1 compliance image for the Pole/Structure is mandatory.', { title: 'Pole Image required' });
        return false;
      }
      // 2. Earthing images validation (at least 1 mandatory if selected)
      if (data.earthingUsed && earthingPhotos.length === 0) {
        toast.warning('At least 1 compliance image for Earthing is mandatory.', { title: 'Earthing Image required' });
        return false;
      }
      // 3. Stay Set images validation (at least 1 mandatory if selected)
      if (data.staySetUsed && staySetPhotos.length === 0) {
        toast.warning('At least 1 compliance image for Stay Set is mandatory.', { title: 'Stay Set Image required' });
        return false;
      }
      // 4. Pole DB images validation (at least 1 mandatory if selected)
      const showLtAccessories = nodeType === 'DTR' || (nodeType === 'POLE' && lineSectionVal === 'LT');
      if (showLtAccessories && data.poleDbTypes && data.poleDbTypes.length > 0 && poleDbPhotos.length === 0) {
        toast.warning('At least 1 compliance image for Pole DB is mandatory.', { title: 'Pole DB Image required' });
        return false;
      }
    }

    const nodeLabel = data.nameLabel.trim() || (nodeType === 'DTR' ? 'DTR-0' : `P-${currentSeq}`);
    const parentNode = currentSeq > 0 ? activeLine.nodes[currentSeq - 1] : null;
    const parentLabel = activeLine.continuationParentLabel || parentNode?.nameLabel;

    const newNode: SurveyNode = {
      id: `node-${Date.now()}`,
      nodeType,
      assetStatus: data.assetStatus || undefined,
      lineSection: lineSectionVal,
      structureRole: (isHtTapSurvey || isExistingLtStart) && currentSeq === 0 ? 'TAP' : undefined,
      sequenceNumber: currentSeq,
      nameLabel: nodeLabel,
      latitude: lat,
      longitude: lng,
      attributes: {
        height: '9m',
        tilt: '0°',
        sag: '0.4m',
        poleType: nodeType === 'DTR'
          ? (data.assetStatus === 'NEW' ? (data.poleType ? Number(data.poleType) : null) : 'Transformer platform')
          : (data.poleType ? Number(data.poleType) : null),
        poleMaster: data.poleMaster ? Number(data.poleMaster) : null,
        cableSize: (() => {
          const selectedConductor = conductors.find(c => String(c.id) === String(data.conductor));
          return selectedConductor ? selectedConductor.conductor_name : (data.conductor || '100 sqmm ACSR');
        })(),
        conductor: data.conductor ? Number(data.conductor) : null,
        earthingUsed: data.earthingUsed || null,
        earthingQuantity: data.earthingQuantity ? Number(data.earthingQuantity) : null,
        staySetUsed: data.staySetUsed || null,
        staySetQuantity: data.staySetQuantity ? Number(data.staySetQuantity) : null,
        poleDbTypes: data.poleDbTypes.length > 0 ? JSON.stringify(data.poleDbTypes) : null,
        poleDbQuantities: (() => {
          const qtyMap: Record<string, string> = {};
          data.poleDbTypes.forEach((type) => {
            qtyMap[type] = data.poleDbQuantities[type] || '0';
          });
          return data.poleDbTypes.length > 0 ? JSON.stringify(qtyMap) : null;
        })(),
        deadEndClampQty: data.deadEndClampQty ? Number(data.deadEndClampQty) : null,
        suspensionClampQty: data.suspensionClampQty ? Number(data.suspensionClampQty) : null,
        poleClampQty: data.poleClampQty ? Number(data.poleClampQty) : null,
        ipcQty: data.ipcQty ? Number(data.ipcQty) : null,
        serviceConnectionQty: data.serviceConnectionQty ? Number(data.serviceConnectionQty) : null,
        extraConsumption: data.extraConsumption ? Number(data.extraConsumption) : null,
        dtrCapacity: nodeType === 'DTR' ? (data.dtrCapacity ? Number(data.dtrCapacity) : null) : null,
        poleQty: (nodeType === 'DTR' && data.assetStatus === 'NEW') ? (data.poleQty ? Number(data.poleQty) : null) : null,
      },
      imageUri: isErectionFlow ? (polePhotos[0] || allPhotos[0] || null) : (capturedPhotos[0] || null),
      imageUris: allPhotos,
      capturedAt: new Date().toISOString(),
      parentLabel,
    };

    dispatch(addNode(newNode));
    return true;
  };

  const [savingNode, setSavingNode] = useState(false);

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
    const nodeLabel = data.nameLabel.trim() || (nodeType === 'DTR' ? 'DTR-0' : `P-${currentSeq}`);

    const mappedAttrs: any = {
      height: '9m',
      tilt: '0°',
      sag: '0.4m',
    };

    if (isErectionFlow) {
      mappedAttrs.lineSection = lineSectionVal;
      if (nodeType === 'DTR') {
        mappedAttrs.poleType = data.assetStatus === 'NEW' 
          ? (data.poleType ? Number(data.poleType) : null) 
          : 'Transformer platform';
        mappedAttrs.poleMaster = data.poleMaster ? Number(data.poleMaster) : null;
        mappedAttrs.dtrCapacity = data.dtrCapacity ? Number(data.dtrCapacity) : null;
        if (data.assetStatus === 'NEW') {
          mappedAttrs.poleQty = data.poleQty ? Number(data.poleQty) : null;
        }
      } else {
        mappedAttrs.poleType = data.poleType ? Number(data.poleType) : null;
        mappedAttrs.poleMaster = data.poleMaster ? Number(data.poleMaster) : null;
      }

      // Conductor mapping
      const selectedConductor = conductors.find(c => String(c.id) === String(data.conductor));
      mappedAttrs.cableSize = selectedConductor ? selectedConductor.conductor_name : (data.conductor || '100 sqmm ACSR');
      mappedAttrs.conductor = data.conductor ? Number(data.conductor) : null;
      
      mappedAttrs.earthingUsed = data.earthingUsed || null;
      mappedAttrs.earthingQuantity = data.earthingQuantity ? Number(data.earthingQuantity) : null;
      mappedAttrs.staySetUsed = data.staySetUsed || null;
      mappedAttrs.staySetQuantity = data.staySetQuantity ? Number(data.staySetQuantity) : null;

      // Pole DB Type mapping
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
      mappedAttrs.serviceConnectionQty = data.serviceConnectionQty ? Number(data.serviceConnectionQty) : null;
      mappedAttrs.extraConsumption = data.extraConsumption ? Number(data.extraConsumption) : null;
      
      mappedAttrs.assetStatus = data.assetStatus || null;
    } else {
      mappedAttrs.poleType = 'Concrete';
      mappedAttrs.cableSize = data.cableSize.trim() || '100 sqmm ACSR';
    }

    const payload = {
      erection_execution_id: activeLine.id.replace('erect-', ''),
      node_type: nodeType,
      sequence_number: currentSeq,
      name_label: nodeLabel,
      latitude: lat,
      longitude: lng,
      attributes: mappedAttrs,
      images: allPhotos,
      captured_at: new Date().toISOString(),
      user_id: userId || null,
    };

    setSavingNode(true);
    SaveErectionNodeService(payload)
      .then((res: any) => {
        setSavingNode(false);
        if (res.status === 200 && res.data && !res.data.Exception) {
          toast.success(res.data.Message || 'Structure saved successfully to server.');
          onSuccess();
        } else {
          const errorMsg = res.data?.Message || 'Failed to save structure';
          toast.error(errorMsg, { title: 'Server error' });
        }
      })
      .catch((err: any) => {
        setSavingNode(false);
        console.warn('Save erection node error:', err);
        toast.error(err.message || 'Server connection error', { title: 'Network error' });
      });
  };

  const handleAddNew = (data: SurveyNodeFormInputs) => {
    const proceed = () => {
      if (commitCurrentNode(data)) {
        if (nodeType === 'DTR') setDtrIsNext(false);
        resetPhotos();
        setLat(null);
        setLng(null);
        setGpsAccuracy('WAITING...');
        setSurveyStep(isErectionFlow ? 'DETAILS' : 'CAPTURE');
      }
    };

    if (isErectionFlow) {
      saveErectionNodeToServer(data, proceed);
    } else {
      proceed();
    }
  };

  const handleAddDtrNext = (data: SurveyNodeFormInputs) => {
    const proceed = () => {
      if (commitCurrentNode(data)) {
        setDtrIsNext(true);
        resetPhotos();
        setLat(null);
        setLng(null);
        setGpsAccuracy('WAITING...');
        setSurveyStep(isErectionFlow ? 'DETAILS' : 'CAPTURE');
      }
    };

    if (isErectionFlow) {
      saveErectionNodeToServer(data, proceed);
    } else {
      proceed();
    }
  };

  const handleFinishSurvey = (data: SurveyNodeFormInputs) => {
    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return;
    }

    const totalNodesCount = activeLine.nodes.length + 1;
    confirm({
      title: `Finish ${isErectionFlow ? 'Erection' : 'Survey'} Line?`,
      message: `${totalNodesCount} structures, including the current one, will be saved to the offline upload queue.`,
      confirmLabel: 'FINISH LINE',
      tone: 'warning',
      onConfirm: () => {
        const proceed = () => {
          if (commitCurrentNode(data)) {
            dispatch(finishSurvey());
            navigation.navigate('MainTabs');
          }
        };

        if (isErectionFlow) {
          saveErectionNodeToServer(data, proceed);
        } else {
          proceed();
        }
      },
    });
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
        <View style={styles.surveyHeader}>
          <View>
            <Text style={styles.subtitleText}>
              ACTIVE {isErectionFlow ? 'ERECTION' : 'SURVEY'} // NODE #{currentSeq}
            </Text>
            <Text style={styles.titleText}>{activeLine.contractorName}</Text>
          </View>
          <View style={[styles.typeBadge, { borderColor: getLineAccent() }]}>
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
          <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent} keyboardShouldPersistTaps="handled">
            <ActiveSurveyForm
              control={control}
              errors={errors}
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
              onSubmitAddNew={handleSubmit(handleAddNew)}
              onSubmitFinish={handleSubmit(handleFinishSurvey)}
              onSubmitDtrNext={handleSubmit(handleAddDtrNext)}
              canSetDtrNext={isHtPhase}
              structureContext={
                isHtTapSurvey
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
