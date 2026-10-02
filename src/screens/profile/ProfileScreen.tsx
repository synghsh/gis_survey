import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, updateProfileImage } from '../../store';
import { userLogoutAction } from '../../store/actions/authAction';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../components/ToastProvider';
import Svg, { Path, Circle, Rect, Line, Polyline } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const toast = useToast();

  const [showSelfieCamera, setShowSelfieCamera] = useState(false);
  const [cameraFlash, setCameraFlash] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const handleUpdateAvatar = async () => {
    if (!cameraPermission || !cameraPermission.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        toast.error('Camera permission is required to capture an avatar photo.', {
          title: 'Permission Denied',
        });
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
          quality: 0.7,
          skipProcessing: true,
        });

        if (photo && photo.uri) {
          dispatch(updateProfileImage(photo.uri));
          setShowSelfieCamera(false);
          toast.success('Profile avatar updated successfully.');
        }
      } catch (err) {
        console.warn('Capture error:', err);
        setShowSelfieCamera(false);
        toast.warning('Camera capture error. Retaining existing avatar.');
      }
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(userLogoutAction() as any);
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
        },
      ]
    );
  };

  // Compute Full Name
  const fullName = [auth.firstName, auth.middleName, auth.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || auth.surveyorName || 'GIS Field Operator';

  // Compute Avatar Initials
  const initials = fullName
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('') || 'SR';

  return (
    <View style={styles.outerContainer}>
      {/* 1. TOP HUD APP BAR */}
      <View style={[styles.headerHud, { paddingTop: Math.max(insets.top + 8, 36) }]}>
        <View style={styles.headerTitleCol}>
          <View style={styles.brandBadge}>
            <Svg width={12} height={12} viewBox="0 0 24 24" fill="#0284C7" style={{ marginRight: 5 }}>
              <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </Svg>
            <Text style={styles.brandText}>GIS FIELD OPERATOR SYSTEM</Text>
          </View>
          <Text style={styles.headerTitle}>OPERATOR PROFILE</Text>
        </View>

      </View>

      {/* 2. SCROLLABLE PROFILE CONTENT */}
      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========================================================= */}
        {/* HERO IDENTITY CARD                                        */}
        {/* ========================================================= */}
        <View style={styles.heroCard}>
          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              style={styles.avatarTouchable}
              onPress={handleUpdateAvatar}
              activeOpacity={0.85}
            >
              {auth.profileImage ? (
                <Image source={{ uri: auth.profileImage }} style={styles.avatarImg} />
              ) : (
                <View style={styles.initialsAvatar}>
                  <Text style={styles.initialsText}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraShutterBadge}>
                <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <Path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <Circle cx="12" cy="13" r="4" />
                </Svg>
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.heroName} numberOfLines={1}>
            {fullName}
          </Text>

          {/* Designation Only */}
          <View style={styles.designationPill}>
            <Text style={styles.designationPillText}>
              {auth.designationName || 'GIS Field Engineer'}
            </Text>
          </View>
        </View>

        {/* ========================================================= */}
        {/* SECTION 1: OFFICIAL CONTACT CREDENTIALS                   */}
        {/* ========================================================= */}
        <View style={styles.infoCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderIconBox}>
              <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                <Rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
              </Svg>
            </View>
            <View>
              <Text style={styles.cardSectionCategory}>CONTACT & CREDENTIALS</Text>
              <Text style={styles.cardSectionTitle}>Official Contact Details</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.itemIconWrap}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </Svg>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>REGISTERED MOBILE PHONE</Text>
              <Text style={styles.itemValue}>{auth.phone || '+91 Unspecified'}</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.itemIconWrap}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <Polyline points="22,6 12,13 2,6" />
              </Svg>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>OFFICIAL ENTERPRISE EMAIL</Text>
              <Text style={styles.itemValue}>{auth.email || 'operator@gis.com'}</Text>
            </View>
          </View>

          <View style={[styles.infoItem, styles.infoItemLast]}>
            <View style={styles.itemIconWrap}>
              <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <Rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <Line x1="16" y1="2" x2="16" y2="6" />
                <Line x1="8" y1="2" x2="8" y2="6" />
                <Line x1="3" y1="10" x2="21" y2="10" />
              </Svg>
            </View>
            <View style={styles.itemContent}>
              <Text style={styles.itemLabel}>OFFICIAL COMMISSIONING DATE</Text>
              <Text style={styles.itemValue}>
                {auth.joiningDate || 'Active Field Officer'}
              </Text>
            </View>
          </View>
        </View>

        {/* ========================================================= */}
        {/* LOGOUT ACTION BUTTON                                      */}
        {/* ========================================================= */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={confirmLogout}
          activeOpacity={0.85}
        >
          <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
            <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <Polyline points="16 17 21 12 16 7" />
            <Line x1="21" y1="12" x2="9" y2="12" />
          </Svg>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        {/* SYSTEM VERSION FOOTER */}
        <View style={styles.systemFooter}>
          <Text style={styles.systemFooterText}>
            GIS FIELD OPERATING SYSTEM • BUILD 2026.10
          </Text>
          <Text style={styles.systemFooterSub}>
            CONNECTED TO POSTGIS DISTRIBUTED CLUSTER
          </Text>
        </View>
      </ScrollView>

      {/* ========================================================= */}
      {/* SELFIE FRONT CAMERA MODAL OVERLAY                         */}
      {/* ========================================================= */}
      {showSelfieCamera && (
        <View style={styles.cameraOverlay}>
          <View
            style={[
              styles.cameraFlashOverlay,
              cameraFlash && { backgroundColor: '#FFFFFF', opacity: 1 },
            ]}
          />

          <View style={[styles.cameraHeader, { paddingTop: Math.max(insets.top + 8, 40) }]}>
            <View>
              <Text style={styles.cameraHeaderCategory}>AVATAR RE-VERIFICATION</Text>
              <Text style={styles.cameraHeaderTitle}>OPERATOR SELFIE CAMERA</Text>
            </View>
            <TouchableOpacity
              style={styles.cameraCloseBtn}
              onPress={() => setShowSelfieCamera(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cameraCloseBtnText}>✕ CLOSE</Text>
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
              <View style={styles.cameraFallback}>
                <Text style={styles.cameraFallbackText}>INITIALIZING FRONT CAMERA...</Text>
              </View>
            )}
            <View style={styles.selfieGuideCircle} />
          </View>

          <View style={[styles.cameraFooter, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
            <Text style={styles.cameraInstructions}>
              Align your face within the reticle and tap below
            </Text>
            <TouchableOpacity style={styles.shutterBtn} onPress={captureSelfie} activeOpacity={0.85}>
              <View style={styles.shutterBtnInner} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// -------------------------------------------------------------
// STYLES: SLEEK, MODERN, ELEVATED & INFORMATIVE
// -------------------------------------------------------------
const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // 1. TOP HUD APP BAR
  headerHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.9)',
    zIndex: 10,
  },
  headerTitleCol: {
    flex: 1,
    paddingRight: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandText: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // 2. SCROLLABLE CONTENT
  scrollWrapper: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
  },

  // HERO IDENTITY CARD
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderWidth: 1.2,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarWrapper: {
    marginBottom: 12,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarImg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderColor: '#0284C7',
    borderWidth: 2.5,
  },
  initialsAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: '#0284C7',
    fontSize: 32,
    fontWeight: '900',
  },
  cameraShutterBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0284C7',
    borderColor: '#FFFFFF',
    borderWidth: 2,
    borderRadius: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  heroName: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
    textAlign: 'center',
    marginBottom: 6,
  },
  designationPill: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  designationPillText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // INFO CARD
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(226, 232, 240, 0.9)',
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 232, 240, 0.8)',
  },
  cardHeaderIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.1)',
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cardSectionCategory: {
    color: '#0284C7',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  cardSectionTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 1,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(241, 245, 249, 0.9)',
  },
  infoItemLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  itemIconWrap: {
    width: 28,
    alignItems: 'center',
    marginRight: 8,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  itemValue: {
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 1.5,
  },

  // LOGOUT BUTTON
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    marginTop: 6,
    marginBottom: 20,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

  // SYSTEM VERSION FOOTER
  systemFooter: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  systemFooterText: {
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  systemFooterSub: {
    color: '#CBD5E1',
    fontSize: 7.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },

  // CAMERA OVERLAY
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
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
    paddingBottom: 16,
  },
  cameraHeaderCategory: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  cameraHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  cameraCloseBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cameraCloseBtnText: {
    color: '#F87171',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cameraFrame: {
    height: SCREEN_WIDTH * 1.0,
    width: '100%',
    borderColor: 'rgba(2, 132, 199, 0.3)',
    borderWidth: 1.5,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    overflow: 'hidden',
  },
  selfieGuideCircle: {
    width: SCREEN_WIDTH * 0.65,
    height: SCREEN_WIDTH * 0.65,
    borderRadius: SCREEN_WIDTH * 0.325,
    borderColor: 'rgba(2, 132, 199, 0.4)',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  cameraFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFallbackText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  cameraFooter: {
    alignItems: 'center',
  },
  cameraInstructions: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 16,
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
