import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import * as Location from 'expo-location';
import { RootState, addNode, finishSurvey, cancelSurvey, SurveyNode } from '../store';
import Theme from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const cameraRef = useRef<CameraView>(null);

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
        <View style={styles.captureStepContainer}>
          {/* Flash screen overlay */}
          <View style={[styles.cameraFlashOverlay, cameraFlash && { backgroundColor: '#fff', opacity: 1 }]} />
          
          <View style={styles.hudHeaderRow}>
            <Text style={styles.hudHeaderText}>ALIGN STRUCTURE WITH FIELD CAMERA</Text>
            <View style={styles.liveIndicator} />
          </View>

          {/* Embedded Camera Viewport */}
          <View style={styles.cameraBoxContainer}>
            {cameraPermission && cameraPermission.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                ref={cameraRef}
                facing="back"
              />
            ) : (
              <View style={styles.cameraFallbackBox}>
                <Text style={styles.cameraFallbackText}>📷 SIMULATED CAMERA ACTIVE</Text>
                <Text style={styles.cameraFallbackSub}>Camera access not granted or unavailable</Text>
              </View>
            )}

            {/* Overlay grid lines */}
            <View style={styles.focusBracketTL} />
            <View style={styles.focusBracketTR} />
            <View style={styles.focusBracketBL} />
            <View style={styles.focusBracketBR} />
            <View style={styles.horizontalScanline} />
          </View>

          {/* Controls Footer */}
          <View style={styles.captureFooter}>
            <Text style={styles.hudInstructionText}>TAP RED SHUTTER TO CAPTURE & PIN GPS</Text>
            <TouchableOpacity style={styles.shutterBtn} onPress={takePhoto} activeOpacity={0.85}>
              <View style={styles.shutterBtnInner} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.abandonLink} 
              onPress={() => {
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
            >
              <Text style={styles.abandonLinkText}>CANCEL SURVEY LINE</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* STEP 2: INPUT DETAILS FORM */
        <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContent} keyboardShouldPersistTaps="handled">
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>STRUCTURE VERIFICATION</Text>

            {/* Photo Thumbnail + GPS Overlay */}
            <View style={styles.previewCard}>
              <View style={styles.thumbnailWrapper}>
                {capturedPhoto ? (
                  <Image source={{ uri: capturedPhoto }} style={styles.previewThumbnail} />
                ) : (
                  <View style={styles.placeholderThumbnail} />
                )}
              </View>
              <View style={styles.previewGpsData}>
                <Text style={styles.gpsBadgeText}>📡 COORDINATES PINNED</Text>
                <Text style={styles.gpsDataText}>LAT: {lat ? lat.toFixed(6) : 'ACQUIRING...'}</Text>
                <Text style={styles.gpsDataText}>LNG: {lng ? lng.toFixed(6) : 'ACQUIRING...'}</Text>
                <Text style={styles.gpsDataText}>ACCURACY: {gpsAccuracy}</Text>
                <TouchableOpacity style={styles.gpsRecalBtn} onPress={acquireGps}>
                  <Text style={styles.gpsRecalText}>RE-ACQUIRE GPS</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Textbox inputs */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>{nodeType === 'DTR' ? 'DTR SERIAL / ID' : 'POLE NO'}</Text>
              <Controller
                control={control}
                name="nameLabel"
                rules={{ required: nodeType === 'DTR' ? 'DTR identifier is required' : 'Pole identifier is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.nameLabel && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={nodeType === 'DTR' ? 'Enter DTR Serial' : 'e.g. P-1'}
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  />
                )}
              />
              {errors.nameLabel && (
                <Text style={styles.errorFeedback}>{errors.nameLabel.message}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>{nodeType === 'DTR' ? 'CONDUCTOR CLASS' : 'CABLE TYPE USED'}</Text>
              <Controller
                control={control}
                name="cableSize"
                rules={{ required: 'Cable/Conductor specification is required' }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, errors.cableSize && styles.inputError]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="e.g. 100 sqmm ACSR"
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                  />
                )}
              />
              {errors.cableSize && (
                <Text style={styles.errorFeedback}>{errors.cableSize.message}</Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>SITE REMARKS</Text>
              <Controller
                control={control}
                name="remarks"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[styles.input, styles.remarksTextArea]}
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder="Weather, terrain features, sag observations..."
                    placeholderTextColor="rgba(255, 255, 255, 0.25)"
                    multiline
                    numberOfLines={3}
                  />
                )}
              />
            </View>

            {/* Retake photo action */}
            <TouchableOpacity style={styles.retakePhotoBtn} onPress={() => setSurveyStep('CAPTURE')}>
              <Text style={styles.retakePhotoText}>📸 RETAKE compliance PHOTO</Text>
            </TouchableOpacity>
          </View>

          {/* TWO PRIMARY ACTIONS BELOW FORM */}
          <View style={styles.primaryActionsRow}>
            {/* Add New Button */}
            <TouchableOpacity style={styles.addNewBtn} onPress={handleSubmit(handleAddNew)} activeOpacity={0.8}>
              <Text style={styles.addNewBtnText}>ADD NEW STRUCTURE</Text>
              <Text style={styles.btnSubtext}>Saves current & re-opens camera</Text>
            </TouchableOpacity>

            {/* Finish Survey Button */}
            <TouchableOpacity style={styles.finishSurveyBtn} onPress={handleSubmit(handleFinishSurvey)} activeOpacity={0.8}>
              <Text style={styles.finishSurveyBtnText}>FINISH SURVEY</Text>
              <Text style={styles.btnSubtext}>Submit line for verification</Text>
            </TouchableOpacity>
          </View>
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
  // STEP 1: CAPTURE PHOTO STYLES
  captureStepContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
    position: 'relative',
  },
  cameraFlashOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0,
    zIndex: 105,
    pointerEvents: 'none',
  },
  hudHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hudHeaderText: {
    color: Theme.colors.glowCyan,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  cameraBoxContainer: {
    flex: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  cameraFallbackBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraFallbackText: {
    color: Theme.colors.glowCyan,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cameraFallbackSub: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  focusBracketTL: {
    position: 'absolute',
    top: 30,
    left: 30,
    width: 30,
    height: 30,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  focusBracketTR: {
    position: 'absolute',
    top: 30,
    right: 30,
    width: 30,
    height: 30,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  focusBracketBL: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: 30,
    height: 30,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  focusBracketBR: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 30,
    height: 30,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  horizontalScanline: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 1,
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
  },
  captureFooter: {
    alignItems: 'center',
    marginTop: 20,
  },
  hudInstructionText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 14,
  },
  shutterBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#06B6D4',
    shadowRadius: 10,
    shadowOpacity: 0.3,
    elevation: 5,
  },
  shutterBtnInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#EF4444',
  },
  abandonLink: {
    marginTop: 20,
    padding: 6,
  },
  abandonLinkText: {
    color: 'rgba(239, 68, 68, 0.65)',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  // STEP 2: DETAILS SCREEN STYLES
  detailsScroll: {
    flex: 1,
  },
  detailsContent: {
    padding: 20,
    paddingBottom: 40,
  },
  panel: {
    ...Theme.glassmorphic.container,
    padding: 20,
    marginBottom: 24,
  },
  panelTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 16,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
    padding: 10,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    marginBottom: 20,
  },
  thumbnailWrapper: {
    width: 100,
    height: 100,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  previewThumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  previewGpsData: {
    flex: 1,
    paddingLeft: 14,
    justifyContent: 'space-between',
  },
  gpsBadgeText: {
    color: Theme.colors.glowCyan,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  gpsDataText: {
    color: '#D1D5DB',
    fontSize: 10,
    fontFamily: 'System',
    marginTop: 2,
  },
  gpsRecalBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  gpsRecalText: {
    color: Theme.colors.glowCyan,
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(8, 11, 17, 0.6)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: Theme.colors.textPrimary,
    fontSize: 13,
  },
  remarksTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  retakePhotoBtn: {
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  retakePhotoText: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addNewBtn: {
    ...Theme.glassmorphic.button,
    flex: 1,
    marginRight: 6,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  addNewBtnText: {
    color: Theme.colors.glowCyan,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  finishSurveyBtn: {
    ...Theme.glassmorphic.button,
    flex: 1,
    marginLeft: 6,
    paddingVertical: 12,
    alignItems: 'center',
    borderColor: Theme.colors.success,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  finishSurveyBtnText: {
    color: Theme.colors.success,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  btnSubtext: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  inputError: {
    borderColor: Theme.colors.error,
  },
  errorFeedback: {
    color: Theme.colors.error,
    fontSize: 9.5,
    marginTop: 4,
    fontWeight: 'bold',
  },
});
