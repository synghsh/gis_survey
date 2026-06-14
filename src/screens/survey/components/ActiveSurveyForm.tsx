import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { Controller } from 'react-hook-form';
import Theme from '../../../theme';

interface ActiveSurveyFormProps {
  control: any;
  errors: any;
  nodeType: 'DTR' | 'POLE';
  lat: number | null;
  lng: number | null;
  gpsAccuracy: string;
  capturedPhoto: string | null;
  acquiringGps: boolean;
  onAcquireGps: () => void;
  onRetakePhoto: () => void;
  onSubmitAddNew: () => void;
  onSubmitFinish: () => void;
}

export default function ActiveSurveyForm({
  control,
  errors,
  nodeType,
  lat,
  lng,
  gpsAccuracy,
  capturedPhoto,
  acquiringGps,
  onAcquireGps,
  onRetakePhoto,
  onSubmitAddNew,
  onSubmitFinish,
}: ActiveSurveyFormProps) {
  return (
    <View style={styles.detailsContainer}>
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
            <TouchableOpacity style={styles.gpsRecalBtn} onPress={onAcquireGps} disabled={acquiringGps}>
              <Text style={styles.gpsRecalText}>{acquiringGps ? 'RE-ACQUIRING...' : 'RE-ACQUIRE GPS'}</Text>
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
        <TouchableOpacity style={styles.retakePhotoBtn} onPress={onRetakePhoto}>
          <Text style={styles.retakePhotoText}>📸 RETAKE compliance PHOTO</Text>
        </TouchableOpacity>
      </View>

      {/* TWO PRIMARY ACTIONS BELOW FORM */}
      <View style={styles.primaryActionsRow}>
        {/* Add New Button */}
        <TouchableOpacity style={styles.addNewBtn} onPress={onSubmitAddNew} activeOpacity={0.8}>
          <Text style={styles.addNewBtnText}>ADD NEW STRUCTURE</Text>
          <Text style={styles.btnSubtext}>Saves current & re-opens camera</Text>
        </TouchableOpacity>

        {/* Finish Survey Button */}
        <TouchableOpacity style={styles.finishSurveyBtn} onPress={onSubmitFinish} activeOpacity={0.8}>
          <Text style={styles.finishSurveyBtnText}>FINISH SURVEY</Text>
          <Text style={styles.btnSubtext}>Submit line for verification</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsContainer: {
    flex: 1,
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
  inputError: {
    borderColor: Theme.colors.error,
  },
  errorFeedback: {
    color: Theme.colors.error,
    fontSize: 9.5,
    marginTop: 4,
    fontWeight: 'bold',
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
});
