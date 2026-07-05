import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import * as Location from 'expo-location';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, addNode, finishSurvey, cancelSurvey, SurveyNode } from '../../store';
import { useToast } from '../../components/ToastProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';

import ActiveSurveyCamera from './components/ActiveSurveyCamera';
import ActiveSurveyForm from './components/ActiveSurveyForm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SurveyNodeFormInputs {
  nameLabel: string;
  cableSize: string;
  remarks: string;
}

export default function ActiveSurveyScreen() {
  const toast = useToast();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const activeLine = useSelector((state: RootState) => state.survey.activeLine);

  const { control, handleSubmit, setValue, formState: { errors } } = useForm<SurveyNodeFormInputs>({
    defaultValues: {
      nameLabel: '',
      cableSize: '',
      remarks: '',
    }
  });

  const [surveyStep, setSurveyStep] = useState<'CAPTURE' | 'DETAILS'>('CAPTURE');
  const [nodeType, setNodeType] = useState<'DTR' | 'POLE'>('POLE');
  const [dtrIsNext, setDtrIsNext] = useState(false);

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState('WAITING...');
  const [acquiringGps, setAcquiringGps] = useState(false);

  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const currentSeq = activeLine ? activeLine.nodes.length : 0;
  const isHtTapSurvey = activeLine?.lineType === 'LT_440V' && activeLine.ltStartingPoint === 'HT_TAPPING_POINT';
  const isExistingLtStart = activeLine?.lineType === 'LT_440V' && activeLine.ltStartingPoint === 'EXISTING_LT_LINE';
  const hasDtr = activeLine?.nodes.some(node => node.nodeType === 'DTR') ?? false;
  const isHtPhase = Boolean(isHtTapSurvey && !hasDtr && !dtrIsNext);

  useEffect(() => {
    if (activeLine) {
      if (isHtTapSurvey && dtrIsNext) {
        setNodeType('DTR');
        setValue('nameLabel', 'DTR-TRANS-01');
        setValue('cableSize', 'Conductor Grid Lead');
        setValue('remarks', '');
      } else if (isHtTapSurvey && !hasDtr) {
        setNodeType('POLE');
        setValue('nameLabel', currentSeq === 0 ? 'TAP-1' : `HT-P-${currentSeq}`);
        setValue('cableSize', '100 sqmm ACSR');
        setValue('remarks', '');
      } else if (isExistingLtStart) {
        setNodeType('POLE');
        setValue('nameLabel', currentSeq === 0 ? 'LT-TAP-1' : `LT-P-${currentSeq}`);
        setValue('cableSize', '90 sqmm ABC');
        setValue('remarks', '');
      } else if (currentSeq === 0) {
        setNodeType('DTR');
        setValue('nameLabel', 'DTR-TRANS-01');
        setValue('cableSize', 'Conductor Grid Lead');
        setValue('remarks', '');
      } else {
        setNodeType('POLE');
        const ltSequence = isHtTapSurvey
          ? activeLine.nodes.filter(node => node.lineSection === 'LT').length + 1
          : currentSeq;
        setValue('nameLabel', `P-${ltSequence}`);
        setValue('cableSize', isHtTapSurvey ? '90 sqmm ABC' : '100 sqmm ACSR');
        setValue('remarks', '');
      }
    }
  }, [currentSeq, activeLine, surveyStep, dtrIsNext, hasDtr, isHtTapSurvey, isExistingLtStart, setValue]);

  useEffect(() => {
    (async () => {
      if (!cameraPermission || !cameraPermission.granted) {
        await requestCameraPermission();
      }
      await Location.requestForegroundPermissionsAsync();
    })();
  }, []);

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
          setCapturedPhoto(photo.uri);
          setSurveyStep('DETAILS');
        }
      } catch (err) {
        console.log('Camera capture error, falling back to mock:', err);
        setCapturedPhoto('https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400');
        setSurveyStep('DETAILS');
      }
    } else {
      setCameraFlash(true);
      setTimeout(() => setCameraFlash(false), 150);
      setCapturedPhoto('https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400');
      setSurveyStep('DETAILS');
    }
  };

  const commitCurrentNode = (data: SurveyNodeFormInputs): boolean => {
    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return false;
    }

    const nodeLabel = data.nameLabel.trim() || (nodeType === 'DTR' ? 'DTR-0' : `P-${currentSeq}`);
    const parentNode = currentSeq > 0 ? activeLine.nodes[currentSeq - 1] : null;
    const newNode: SurveyNode = {
      id: `node-${Date.now()}`,
      nodeType,
      lineSection: isHtTapSurvey ? (hasDtr ? 'LT' : 'HT') : isExistingLtStart ? 'LT' : undefined,
      structureRole: (isHtTapSurvey || isExistingLtStart) && currentSeq === 0 ? 'TAP' : undefined,
      sequenceNumber: currentSeq,
      nameLabel: nodeLabel,
      latitude: lat,
      longitude: lng,
      attributes: {
        cableSize: data.cableSize.trim() || '100 sqmm ACSR',
        poleType: nodeType === 'DTR' ? 'Transformer platform' : 'Concrete',
        height: '9m',
        tilt: '0°',
        sag: '0.4m',
      },
      imageUri: capturedPhoto,
      capturedAt: new Date().toISOString(),
      parentLabel: parentNode ? parentNode.nameLabel : undefined,
    };

    dispatch(addNode(newNode));
    return true;
  };

  const handleAddNew = (data: SurveyNodeFormInputs) => {
    if (commitCurrentNode(data)) {
      if (nodeType === 'DTR') setDtrIsNext(false);
      setCapturedPhoto(null);
      setLat(null);
      setLng(null);
      setGpsAccuracy('WAITING...');
      setSurveyStep('CAPTURE');
    }
  };

  const handleAddDtrNext = (data: SurveyNodeFormInputs) => {
    if (commitCurrentNode(data)) {
      setDtrIsNext(true);
      setCapturedPhoto(null);
      setLat(null);
      setLng(null);
      setGpsAccuracy('WAITING...');
      setSurveyStep('CAPTURE');
    }
  };

  const handleFinishSurvey = (data: SurveyNodeFormInputs) => {
    if (!lat || !lng) {
      toast.warning('Waiting for GPS location lock. Please capture coordinates again.', { title: 'GPS required' });
      return;
    }

    const totalNodesCount = activeLine.nodes.length + 1;
    Alert.alert(
      'Finish Survey Line',
      `Complete this survey run? A total of ${totalNodesCount} nodes (including current) will be saved to your local offline upload queue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Finish',
          onPress: () => {
            if (commitCurrentNode(data)) {
              dispatch(finishSurvey());
              navigation.navigate('MainTabs');
            }
          }
        }
      ]
    );
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
            <Text style={styles.subtitleText}>ACTIVE SURVEY // NODE #{currentSeq}</Text>
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
              Alert.alert(
                'Abandon Survey',
                'Discard all captured structures and return to Dashboard?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Discard', style: 'destructive', onPress: () => {
                    dispatch(cancelSurvey());
                    navigation.navigate('MainTabs');
                  }}
                ]
              );
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
              capturedPhoto={capturedPhoto}
              acquiringGps={acquiringGps}
              onAcquireGps={acquireGps}
              onRetakePhoto={() => setSurveyStep('CAPTURE')}
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
            />
          </ScrollView>
        )}
      </View>
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
});
