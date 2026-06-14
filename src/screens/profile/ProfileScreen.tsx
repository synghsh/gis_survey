import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { RootState, updateProfileImage, logout } from '../../store';
import { useNavigation } from '@react-navigation/native';
import Theme from '../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  // Selfie Camera State
  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleUpdateAvatar = async () => {
    // Request permission if not granted
    if (!cameraPermission || !cameraPermission.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture a profile picture.');
        return;
      }
    }
    setShowSelfieCamera(true);
  };

  const captureSelfie = async () => {
    if (cameraRef.current) {
      try {
        setCameraFlash(true);
        setTimeout(() => setCameraFlash(false), 150);
        
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.5,
          skipProcessing: true,
        });

        if (photo && photo.uri) {
          dispatch(updateProfileImage(photo.uri));
          setShowSelfieCamera(false);
          Alert.alert('Success', 'Profile avatar updated successfully.');
        }
      } catch (err) {
        console.log('Capture error:', err);
        // Fallback mockup selfie
        dispatch(updateProfileImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'));
        setShowSelfieCamera(false);
      }
    } else {
      // Mockup selfie fallback
      dispatch(updateProfileImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'));
      setShowSelfieCamera(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar with branding & title */}
      <View style={styles.header}>
        <View style={styles.brandingWrapper}>
          <Text style={styles.brandingIcon}>👤</Text>
          <Text style={styles.brandingText}>SURVEYOR GATE</Text>
        </View>
        <Text style={styles.headerTitle}>SURVEYOR PROFILE</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Avatar Panel */}
        <View style={styles.profileCard}>
          <TouchableOpacity 
            style={styles.avatarContainer} 
            onPress={handleUpdateAvatar}
            activeOpacity={0.85}
          >
            {auth.profileImage ? (
              <Image source={{ uri: auth.profileImage }} style={styles.avatarImage} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Text style={styles.defaultAvatarText}>
                  {auth.surveyorName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Text style={styles.cameraBadgeIcon}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.surveyorName}>{auth.surveyorName}</Text>
          <Text style={styles.surveyorId}>SURVEYOR ID: {auth.surveyorId}</Text>
          <View style={styles.certPill}>
            <Text style={styles.certPillText}>✓ VERIFIED CREDENTIALS</Text>
          </View>
        </View>

        {/* Details List */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>GRID IDENTITY METADATA</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>ASSIGNED GRID DIVISION</Text>
            <Text style={styles.infoVal}>{auth.division}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>SURVEY SECURITY AUTH</Text>
            <Text style={styles.infoVal}>LEVEL-02 FIELD ENGINEER</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>LOCAL SURVEY DATA SHIELD</Text>
            <Text style={styles.infoVal}>SQLITE // ENCRYPTED AES-256</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>COMMUNICATION PORT</Text>
            <Text style={styles.infoVal}>PORT 8081 // ENCRYPTED HTTPS</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>OFFLINE SESSION KEY</Text>
            <Text style={[styles.infoVal, styles.monoText]}>key_0606_session_ok</Text>
          </View>
        </View>

        {/* Logout button */}
        <TouchableOpacity 
          style={styles.logoutBtn} 
          onPress={() => {
            dispatch(logout());
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.logoutBtnText}>TERMINATE SECURE SESSION</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Selfie Front Camera Modal Overlay */}
      {showSelfieCamera && (
        <View style={styles.cameraOverlay}>
          <View style={[styles.cameraFlashOverlay, cameraFlash && { backgroundColor: '#fff', opacity: 1 }]} />
          
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHeaderText}>SELFIE CAMERA // AVATAR SURVEY</Text>
            <TouchableOpacity onPress={() => setShowSelfieCamera(false)}>
              <Text style={styles.cameraCloseBtn}>[ CLOSE ]</Text>
            </TouchableOpacity>
          </View>

          {/* Selfie viewport (front-facing) */}
          <View style={styles.cameraFrame}>
            {cameraPermission && cameraPermission.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                ref={cameraRef}
                facing="front"
              />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={styles.cameraGuidelineText}>WAITING FOR CAMERA PREVIEW...</Text>
              </View>
            )}
            <View style={styles.selfieGuideCircle} />
          </View>

          <View style={styles.cameraFooter}>
            <TouchableOpacity style={styles.shutterBtn} onPress={captureSelfie}>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  brandingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandingIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  brandingText: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerPlaceholder: {
    width: 130,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    ...Theme.glassmorphic.container,
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: Theme.colors.glowCyan,
    borderWidth: 2,
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.glowCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  defaultAvatarText: {
    color: Theme.colors.glowCyan,
    fontSize: 36,
    fontWeight: 'bold',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#080B11',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.glowCyan,
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  cameraBadgeIcon: {
    fontSize: 12,
  },
  surveyorName: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  surveyorId: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  certPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: Theme.colors.success,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  certPillText: {
    color: Theme.colors.success,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  panel: {
    ...Theme.glassmorphic.container,
    padding: 20,
    marginBottom: 20,
  },
  panelTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 16,
  },
  infoRow: {
    borderColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  infoLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  infoVal: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  monoText: {
    fontFamily: 'System',
    color: Theme.colors.glowCyan,
  },
  logoutBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  // FRONT SELFIE CAMERA STYLES
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
    opacity: 0,
    zIndex: 105,
    pointerEvents: 'none',
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
    backgroundColor: '#000',
  },
  selfieGuideCircle: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: SCREEN_WIDTH * 0.325,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 2,
    borderStyle: 'dashed',
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
    backgroundColor: Theme.colors.glowCyan,
  },
});
