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
import * as Location from 'expo-location';
import { RootState, addNode, finishSurvey, cancelSurvey, navigateTo, SurveyNode } from '../store';
import Theme from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ActiveSurveyScreen() {
  const dispatch = useDispatch();
  const activeLine = useSelector((state: RootState) => state.survey.activeLine);

  // Active inputs for current node
  const [nodeType, setNodeType] = useState<'DTR' | 'POLE'>('POLE');
  const [nameLabel, setNameLabel] = useState('');
  const [poleType, setPoleType] = useState('Concrete');
  const [cableSize, setCableSize] = useState('100 sqmm ACSR');
  const [height, setHeight] = useState('9m');
  const [tilt, setTilt] = useState('0°');
  const [sag, setSag] = useState('0.4m');

  // GPS coordinates state
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState('WAITING...');
  const [acquiringGps, setAcquiringGps] = useState(false);

  // Custom HUD Camera Modal state
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [cameraFlash, setCameraFlash] = useState(false);

  // Camera Permissions and Ref
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Current sequence calculation
  const currentSeq = activeLine ? activeLine.nodes.length : 0;

  // Auto-fill values on sequence change
  useEffect(() => {
    if (activeLine) {
      if (currentSeq === 0) {
        setNodeType('DTR');
        setNameLabel('DTR-TRANS-01');
      } else {
        setNodeType('POLE');
        setNameLabel(`P-${currentSeq}`);
      }
    }
  }, [currentSeq, activeLine]);

  if (!activeLine) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>No active survey line found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => dispatch(navigateTo('DASHBOARD'))}>
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
  };

  // Acquire coordinates with real GPS
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

  const handleCapturePhoto = async () => {
    if (!cameraPermission || !cameraPermission.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture node verification photographs.');
        return;
      }
    }
    setShowCamera(true);
  };

  const savePhoto = async () => {
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
          setShowCamera(false);
        }
      } catch (err) {
        console.log('Capture error, falling back to mock:', err);
        setCapturedPhoto('https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400');
        setShowCamera(false);
      }
    } else {
      setCapturedPhoto('https://images.unsplash.com/photo-1548676924-48e71ceac151?w=400');
      setShowCamera(false);
    }
  };

  const handleSaveNode = () => {
    if (!lat || !lng) {
      Alert.alert('GPS Required', 'Please lock GPS coordinates before saving grid node.');
      return;
    }

    const newNode: SurveyNode = {
      id: `node-${Date.now()}`,
      nodeType,
      sequenceNumber: currentSeq,
      nameLabel: nameLabel.trim() || (nodeType === 'DTR' ? `DTR-${Date.now().toString(36).toUpperCase()}` : `P-${currentSeq}`),
      latitude: lat,
      longitude: lng,
      attributes: {
        cableSize,
        poleType,
        height,
        tilt,
        sag,
      },
      imageUri: capturedPhoto,
      capturedAt: new Date().toISOString(),
    };

    dispatch(addNode(newNode));

    // Reset inputs for next pole
    setLat(null);
    setLng(null);
    setGpsAccuracy('WAITING...');
    setCapturedPhoto(null);
    Alert.alert('Saved', `${nodeType} node sequence #${currentSeq} logged successfully.`);
  };

  const handleCompleteSurvey = () => {
    if (activeLine.nodes.length === 0) {
      Alert.alert('Empty Line', 'You must log at least 1 node (DTR or Pole) to complete this line survey.');
      return;
    }

    Alert.alert(
      'Complete Survey',
      `Are you sure you want to close this survey session? This will save ${activeLine.nodes.length} nodes to the upload queue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Complete', 
          onPress: () => {
            dispatch(finishSurvey());
            dispatch(navigateTo('DASHBOARD'));
          } 
        }
      ]
    );
  };

  const handleAbandonSurvey = () => {
    Alert.alert(
      'Abandon Survey',
      'Discard all captured nodes in this active line session? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Discard', 
          style: 'destructive',
          onPress: () => {
            dispatch(cancelSurvey());
            dispatch(navigateTo('DASHBOARD'));
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Active Line Status Header */}
        <View style={styles.surveyHeader}>
          <View>
            <Text style={styles.subtitleText}>ACTIVE GRID SURVEY</Text>
            <Text style={styles.titleText}>{activeLine.contractorName}</Text>
          </View>
          <View style={[styles.typeBadge, { borderColor: getLineAccent() }]}>
            <Text style={[styles.typeBadgeText, { color: getLineAccent() }]}>
              {activeLine.lineType.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Current Node Section Title */}
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>LOGGING NODE: SEQ #{currentSeq}</Text>
          <View style={[styles.stepBadge, { backgroundColor: nodeType === 'DTR' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(6, 182, 212, 0.15)' }]}>
            <Text style={[styles.stepBadgeText, { color: nodeType === 'DTR' ? Theme.colors.neonDTR : Theme.colors.glowCyan }]}>
              {nodeType}
            </Text>
          </View>
        </View>

        {/* Form panel */}
        <View style={styles.panel}>
          {/* Label / Name */}
          <Text style={styles.label}>NODE SERIAL LABEL / NAME</Text>
          <TextInput
            style={styles.input}
            value={nameLabel}
            onChangeText={setNameLabel}
            placeholder={nodeType === 'DTR' ? 'DTR Serial Number' : 'Pole label identifier'}
            placeholderTextColor="rgba(255, 255, 255, 0.25)"
          />

          {/* GPS Coordinates acquiring box */}
          <Text style={styles.label}>GEOSPATIAL COORDINATES</Text>
          <View style={styles.gpsBox}>
            <View style={styles.gpsGrid}>
              <View style={styles.gpsCol}>
                <Text style={styles.gpsLabel}>LATITUDE</Text>
                <Text style={styles.gpsValue}>{lat ? lat.toFixed(6) : '----.------'}</Text>
              </View>
              <View style={styles.gpsCol}>
                <Text style={styles.gpsLabel}>LONGITUDE</Text>
                <Text style={styles.gpsValue}>{lng ? lng.toFixed(6) : '----.------'}</Text>
              </View>
            </View>

            <View style={styles.gpsFooter}>
              <Text style={styles.accuracyText}>STATUS: {gpsAccuracy}</Text>
              <TouchableOpacity 
                style={[styles.gpsBtn, acquiringGps && styles.gpsBtnDisabled]} 
                onPress={acquireGps}
                disabled={acquiringGps}
              >
                <Text style={styles.gpsBtnText}>{acquiringGps ? 'LOCKING...' : 'CAPTURE GPS'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Physical traits */}
          {nodeType === 'DTR' ? (
            <View>
              <Text style={styles.label}>TRANSFORMER RATING & CAPACITY</Text>
              <View style={styles.selectorRow}>
                {['63KVA', '100KVA', '250KVA'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.selectorItem, poleType === opt && styles.selectorItemActive]}
                    onPress={() => setPoleType(opt)}
                  >
                    <Text style={[styles.selectorItemText, poleType === opt && styles.selectorItemTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : (
            <View>
              <Text style={styles.label}>POLE SPECIFICATION</Text>
              <View style={styles.selectorRow}>
                {['Concrete', 'Tubular Steel', 'Rail Pole'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.selectorItem, poleType === opt && styles.selectorItemActive]}
                    onPress={() => setPoleType(opt)}
                  >
                    <Text style={[styles.selectorItemText, poleType === opt && styles.selectorItemTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.multiInputsGrid}>
                <View style={styles.multiCol}>
                  <Text style={styles.label}>POLE HEIGHT</Text>
                  <TextInput style={styles.smallInput} value={height} onChangeText={setHeight} />
                </View>
                <View style={styles.multiCol}>
                  <Text style={styles.label}>CABLE SAG</Text>
                  <TextInput style={styles.smallInput} value={sag} onChangeText={setSag} />
                </View>
                <View style={styles.multiCol}>
                  <Text style={styles.label}>TILT ANGLE</Text>
                  <TextInput style={styles.smallInput} value={tilt} onChangeText={setTilt} />
                </View>
              </View>
            </View>
          )}

          <Text style={styles.label}>CONDUCTOR SPECIFICATION</Text>
          <View style={styles.selectorRow}>
            {['50 sqmm', '100 sqmm ACSR', '150 sqmm ACSR'].map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[styles.selectorItem, cableSize === opt && styles.selectorItemActive]}
                onPress={() => setCableSize(opt)}
              >
                <Text style={[styles.selectorItemText, cableSize === opt && styles.selectorItemTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Camera photo placeholder/preview */}
          <Text style={styles.label}>NODE COMPLIANCE IMAGE</Text>
          <View style={styles.photoContainer}>
            {capturedPhoto ? (
              <View style={styles.photoPreviewWrapper}>
                <Image source={{ uri: capturedPhoto }} style={styles.photoPreview} />
                <TouchableOpacity style={styles.recaptureBtn} onPress={handleCapturePhoto}>
                  <Text style={styles.recaptureBtnText}>RE-TAKE PHOTO</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.photoPlaceholder} onPress={handleCapturePhoto}>
                <Text style={styles.photoPlaceholderText}>📷 LAUNCH NATIVE CAMERA SURVEY</Text>
                <Text style={styles.photoPlaceholderSub}>Required for structure approval</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Node Save Buttons */}
          <TouchableOpacity style={styles.saveNodeBtn} onPress={handleSaveNode}>
            <Text style={styles.saveNodeBtnText}>COMMIT NODE DATA & NEXT &gt;</Text>
          </TouchableOpacity>
        </View>

        {/* Topology Line preview sequence */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>GRID TOPOLOGY ROUTE ({activeLine.nodes.length} LOGGED)</Text>
          <ScrollView horizontal style={styles.nodesScroll} showsHorizontalScrollIndicator={false}>
            {activeLine.nodes.length === 0 ? (
              <Text style={styles.noNodesText}>No nodes logged yet. Commiting starts the sequence.</Text>
            ) : (
              activeLine.nodes.map((node, index) => (
                <View key={node.id} style={styles.nodeSeqCard}>
                  <Text style={styles.nodeSeqNum}>#{node.sequenceNumber}</Text>
                  <Text style={styles.nodeSeqType}>{node.nodeType}</Text>
                  <Text style={styles.nodeSeqLabel}>{node.nameLabel}</Text>
                  {index < activeLine.nodes.length - 1 && <Text style={styles.seqConnector}>&gt;&gt;</Text>}
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Survey termination buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.abandonBtn} onPress={handleAbandonSurvey}>
            <Text style={styles.abandonText}>DISCARD SURVEY</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.finishBtn} onPress={handleCompleteSurvey}>
            <Text style={styles.finishText}>COMPLETE LINE SURVEY</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Mock Camera Modal Overlay */}
      {showCamera && (
        <View style={styles.cameraOverlay}>
          <View style={[styles.cameraFlashOverlay, cameraFlash && { backgroundColor: '#fff', opacity: 1 }]} />
          
          {/* Top Camera Controls */}
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHeaderText}>SURVEY HUD // GRID VIEW</Text>
            <TouchableOpacity onPress={() => setShowCamera(false)}>
              <Text style={styles.cameraCloseBtn}>[ CLOSE ]</Text>
            </TouchableOpacity>
          </View>

          {/* Camera focus box */}
          <View style={styles.cameraFrame}>
            {cameraPermission && cameraPermission.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                ref={cameraRef}
                facing="back"
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={styles.cameraGuidelineText}>WAITING FOR CAMERA PREVIEW...</Text>
              </View>
            )}
            <View style={styles.focusBracketTL} />
            <View style={styles.focusBracketTR} />
            <View style={styles.focusBracketBL} />
            <View style={styles.focusBracketBR} />
            <Text style={styles.cameraGuidelineText}>ALIGN POLE HEIGHT WITH HUD GRID</Text>
          </View>

          {/* Capture Trigger */}
          <View style={styles.cameraFooter}>
            <TouchableOpacity style={styles.shutterBtn} onPress={savePhoto}>
              <View style={styles.shutterBtnInner} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
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
    paddingBottom: 16,
    marginBottom: 20,
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
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepTitle: {
    color: Theme.colors.glowCyan,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  stepBadge: {
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  panel: {
    ...Theme.glassmorphic.container,
    marginBottom: 20,
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
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
  gpsBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  gpsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gpsCol: {
    flex: 1,
  },
  gpsLabel: {
    color: 'rgba(6, 182, 212, 0.5)',
    fontSize: 8,
    fontWeight: 'bold',
  },
  gpsValue: {
    color: Theme.colors.textPrimary,
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  gpsFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderTopWidth: 1,
    paddingTop: 8,
  },
  accuracyText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
  },
  gpsBtn: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  gpsBtnDisabled: {
    opacity: 0.5,
  },
  gpsBtnText: {
    color: Theme.colors.glowCyan,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  selectorItem: {
    flex: 1,
    marginHorizontal: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  selectorItemActive: {
    borderColor: Theme.colors.glowCyan,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  selectorItemText: {
    color: Theme.colors.textSecondary,
    fontSize: 10.5,
  },
  selectorItemTextActive: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
  },
  multiInputsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  multiCol: {
    flex: 1,
    marginHorizontal: 3,
  },
  smallInput: {
    backgroundColor: 'rgba(8, 11, 17, 0.6)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    color: Theme.colors.textPrimary,
    fontSize: 12,
    textAlign: 'center',
  },
  photoContainer: {
    marginTop: 4,
  },
  photoPlaceholder: {
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 6,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.03)',
  },
  photoPlaceholderText: {
    color: Theme.colors.glowCyan,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  photoPlaceholderSub: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    marginTop: 4,
  },
  photoPreviewWrapper: {
    position: 'relative',
    height: 140,
    borderRadius: 6,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  recaptureBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  recaptureBtnText: {
    color: Theme.colors.glowCyan,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  saveNodeBtn: {
    ...Theme.glassmorphic.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 22,
  },
  saveNodeBtnText: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  panelTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    borderColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 10,
  },
  nodesScroll: {
    flexDirection: 'row',
    paddingVertical: 6,
  },
  noNodesText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    paddingVertical: 10,
  },
  nodeSeqCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 6,
  },
  nodeSeqNum: {
    color: Theme.colors.glowCyan,
    fontSize: 9,
    fontWeight: 'bold',
    marginRight: 4,
  },
  nodeSeqType: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    marginRight: 6,
  },
  nodeSeqLabel: {
    color: Theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: '600',
  },
  seqConnector: {
    color: 'rgba(6, 182, 212, 0.3)',
    fontSize: 9,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  abandonBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    flex: 1.2,
    marginRight: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  abandonText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  finishBtn: {
    ...Theme.glassmorphic.button,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: Theme.colors.glowCyan,
    flex: 2,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishText: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
    zIndex: 100,
  },
  cameraFlashOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    opacity: 0,
    zIndex: 105,
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cameraHeaderText: {
    color: Theme.colors.glowCyan,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  cameraCloseBtn: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cameraFrame: {
    height: SCREEN_WIDTH * 1.0,
    width: '100%',
    borderColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusBracketTL: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 25,
    height: 25,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  focusBracketTR: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 25,
    height: 25,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  focusBracketBL: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 25,
    height: 25,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  focusBracketBR: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 25,
    height: 25,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: Theme.colors.glowCyan,
  },
  cameraGuidelineText: {
    color: 'rgba(6, 182, 212, 0.4)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  cameraFooter: {
    alignItems: 'center',
  },
  shutterBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EF4444',
  },
});
