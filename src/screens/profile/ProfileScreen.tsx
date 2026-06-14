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
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, updateProfileImage, logout } from '../../store';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);

  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleUpdateAvatar = async () => {
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
        dispatch(updateProfileImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'));
        setShowSelfieCamera(false);
      }
    } else {
      dispatch(updateProfileImage('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300'));
      setShowSelfieCamera(false);
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
      <View style={styles.header}>
        <View style={styles.brandingWrapper}>
          <Text style={styles.brandingIcon}>👤</Text>
          <Text style={styles.brandingText}>SURVEYOR GATE</Text>
        </View>
        <Text style={styles.headerTitle}>SURVEYOR PROFILE</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 3. SCROLLABLE LAYOUT */}
      <ScrollView style={styles.scrollContainerWrapper} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
          <View style={[styles.cameraFlashOverlay, cameraFlash && { backgroundColor: '#FFFFFF', opacity: 1 }]} />
          
          <View style={styles.cameraHeader}>
            <Text style={styles.cameraHeaderText}>SELFIE CAMERA // AVATAR SURVEY</Text>
            <TouchableOpacity onPress={() => setShowSelfieCamera(false)}>
              <Text style={styles.cameraCloseBtn}>[ CLOSE ]</Text>
            </TouchableOpacity>
          </View>

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
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 20,
  },
  brandingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(2, 132, 199, 0.18)',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandingIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  brandingText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerPlaceholder: {
    width: 130,
  },
  scrollContainerWrapper: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderColor: '#0284C7',
    borderWidth: 2,
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatarText: {
    color: '#0284C7',
    fontSize: 36,
    fontWeight: 'bold',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderColor: '#0284C7',
    borderWidth: 1.2,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  cameraBadgeIcon: {
    fontSize: 12,
  },
  surveyorName: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  surveyorId: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  certPill: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#059669',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 12,
  },
  certPillText: {
    color: '#059669',
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingBottom: 10,
    marginBottom: 16,
  },
  infoRow: {
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingVertical: 10,
  },
  infoLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  infoVal: {
    color: '#0F172A',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '600',
  },
  monoText: {
    fontFamily: 'System',
    color: '#0284C7',
  },
  logoutBtn: {
    borderColor: 'rgba(239, 68, 68, 0.25)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutBtnText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
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
    color: '#0284C7',
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
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1.2,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
  },
  selfieGuideCircle: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: SCREEN_WIDTH * 0.325,
    borderColor: 'rgba(2, 132, 199, 0.35)',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cameraGuidelineText: {
    color: '#64748B',
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
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0284C7',
  },
});
