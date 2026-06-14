import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { CameraView } from 'expo-camera';

interface ActiveSurveyCameraProps {
  cameraPermission: any;
  requestCameraPermission: () => Promise<any>;
  cameraRef: React.RefObject<any>;
  cameraFlash: boolean;
  currentSeq: number;
  onTakePhoto: () => void;
  onAbandon: () => void;
}

export default function ActiveSurveyCamera({
  cameraPermission,
  requestCameraPermission,
  cameraRef,
  cameraFlash,
  currentSeq,
  onTakePhoto,
  onAbandon,
}: ActiveSurveyCameraProps) {
  return (
    <View style={styles.captureStepContainer}>
      {/* Flash overlay */}
      <View style={[styles.cameraFlashOverlay, cameraFlash && { backgroundColor: '#FFFFFF', opacity: 1 }]} />
      
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
            {!cameraPermission?.granted && (
              <TouchableOpacity style={styles.permissionBtn} onPress={requestCameraPermission}>
                <Text style={styles.permissionBtnText}>GRANT CAMERA PERMISSION</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Overlay grid brackets */}
        <View style={styles.focusBracketTL} />
        <View style={styles.focusBracketTR} />
        <View style={styles.focusBracketBL} />
        <View style={styles.focusBracketBR} />
        <View style={styles.horizontalScanline} />
      </View>

      {/* Controls Footer */}
      <View style={styles.captureFooter}>
        <Text style={styles.hudInstructionText}>TAP SHUTTER TO CAPTURE & PIN GPS</Text>
        <TouchableOpacity style={styles.shutterBtn} onPress={onTakePhoto} activeOpacity={0.85}>
          <View style={styles.shutterBtnInner} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.abandonLink} onPress={onAbandon}>
          <Text style={styles.abandonLinkText}>CANCEL SURVEY LINE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: '#0284C7',
    fontSize: 9,
    fontWeight: '800',
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
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1.2,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E293B',
  },
  cameraFallbackBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cameraFallbackText: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cameraFallbackSub: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  permissionBtnText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: 'bold',
  },
  focusBracketTL: {
    position: 'absolute',
    top: 30,
    left: 30,
    width: 30,
    height: 30,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: '#0284C7',
  },
  focusBracketTR: {
    position: 'absolute',
    top: 30,
    right: 30,
    width: 30,
    height: 30,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: '#0284C7',
  },
  focusBracketBL: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    width: 30,
    height: 30,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: '#0284C7',
  },
  focusBracketBR: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 30,
    height: 30,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: '#0284C7',
  },
  horizontalScanline: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 1.2,
    backgroundColor: 'rgba(2, 132, 199, 0.3)',
  },
  captureFooter: {
    alignItems: 'center',
    marginTop: 20,
  },
  hudInstructionText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 14,
  },
  shutterBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowRadius: 10,
    shadowOpacity: 0.25,
    elevation: 5,
  },
  shutterBtnInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EF4444',
  },
  abandonLink: {
    marginTop: 20,
    padding: 6,
  },
  abandonLinkText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
