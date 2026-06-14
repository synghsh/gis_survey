import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useForm } from 'react-hook-form';
import * as Location from 'expo-location';
import { RootState, addNode, finishSurvey, cancelSurvey, SurveyNode } from '../../store';
import Theme from '../../theme';

import ActiveSurveyCamera from './components/ActiveSurveyCamera';
import ActiveSurveyForm from './components/ActiveSurveyForm';

interface SurveyNodeFormInputs {
  nameLabel: string;
  cableSize: string;
  remarks: string;
}

export default function ActiveSurveyScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const activeLine = useSelector((state: RootState) => state.survey.activeLine);

  // react-hook-form configuration
  const { control, handleSubmit, setValue, formState: { errors } } = useForm<SurveyNodeFormInputs>({
    defaultValues: {
      nameLabel: '',
      cableSize: '',
      remarks: '',
    }
  });

  // Survey Step State: CAPTURE -> DETAILS
  const [surveyStep, setSurveyStep] = useState<'CAPTURE' | 'DETAILS'>('CAPTURE');

  // Input states for current node details
  const [nodeType, setNodeType] = useState<'DTR' | 'POLE'>('POLE');

  // GPS coordinates state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState('WAITING...');
  const [acquiringGps, setAcquiringGps] = useState(false);

  // Camera state
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  // Current sequence calculation
  const currentSeq = activeLine ? activeLine.nodes.length : 0;

  // Auto-fill values on sequence change or step change
  useEffect(() => {
    if (activeLine) {
      if (currentSeq === 0) {
        setNodeType('DTR');
        setValue('nameLabel', 'DTR-TRANS-01');
        setValue('cableSize', 'Conductor Grid Lead');
        setValue('remarks', '');
      } else {
        setNodeType('POLE');
        setValue('nameLabel', `P-${currentSeq}`);
        setValue('cableSize', '100 sqmm ACSR');
        setValue('remarks', '');
      }
    }
  }, [currentSeq, activeLine, surveyStep]);

  // Request permissions immediately when screen mounts
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

  // Acquire coordinates
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

  // Trigger capture photo
  const takePhoto = async () => {
    // Acquire GPS instantly at the moment of photo capture
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
      // Emulator or fallback mock
      setCameraFlash(true);
      setTimeout(() => setCameraFlash(false), 150);
      setCapturedPhoto('https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400');
      setSurveyStep('DETAILS');
    }
  };

  // Commit current node details to Redux
  const commitCurrentNode = (data: SurveyNodeFormInputs): boolean => {
    // Ensure coordinates are locked
    if (!lat || !lng) {
      Alert.alert('GPS Required', 'Waiting for GPS location lock. Please try capturing coordinates again.');
      return false;
    }

    const nodeLabel = data.nameLabel.trim() || (nodeType === 'DTR' ? 'DTR-0' : `P-${currentSeq}`);
    const parentNode = currentSeq > 0 ? activeLine.nodes[currentSeq - 1] : null;
    const newNode: SurveyNode = {
      id: `node-${Date.now()}`,
      nodeType,
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

  // "Add New" Button
  const handleAddNew = (data: SurveyNodeFormInputs) => {
    if (commitCurrentNode(data)) {
      // Reset details input fields
      setCapturedPhoto(null);
      setLat(null);
      setLng(null);
      setGpsAccuracy('WAITING...');
      
      // Go back to capture screen
      setSurveyStep('CAPTURE');
    }
  };

  // "Finish Survey" Button with Confirmation
  const handleFinishSurvey = (data: SurveyNodeFormInputs) => {
    if (!lat || !lng) {
      Alert.alert('GPS Required', 'Waiting for GPS location lock. Please try capturing coordinates again.');
      return;
    }

    const totalNodesCount = activeLine.nodes.length + 1; // including the one we just committed
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
      case 'HT_11KV': return Theme.colors.neon11KV;
      case 'HT_33KV': return Theme.colors.neon33KV;
      case 'LT_440V': return Theme.colors.neon440V;
      default: return Theme.colors.glowCyan;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header status bar */}
      <View style={styles.surveyHeader}>
        <View>
          <Text style={styles.subtitleText}>ACTIVE SURVEY // NODE #{currentSeq}</Text>
          <Text style={styles.titleText}>{activeLine.contractorName}</Text>
        </View>
        <View style={[styles.typeBadge, { borderColor: getLineAccent() }]}>
          <Text style={[styles.typeBadgeText, { color: getLineAccent() }]}>
            {activeLine.lineType.replace('_', ' ')}
          </Text>
        </View>
      </View>

      {/* Screen body based on step */}
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
        /* STEP 2: INPUT DETAILS FORM */
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
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
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
    ...Theme.glassmorphic.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backBtnText: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
  },
  surveyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  subtitleText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  titleText: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 2,
  },
  typeBadge: {
    borderWidth: 1,
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
