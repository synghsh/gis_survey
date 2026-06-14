import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image } from 'react-native';
import { Controller } from 'react-hook-form';

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
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
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
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
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
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
                multiline
                numberOfLines={3}
              />
            )}
          />
        </View>

        {/* Retake photo */}
        <TouchableOpacity style={styles.retakePhotoBtn} onPress={onRetakePhoto}>
          <Text style={styles.retakePhotoText}>📸 RETAKE compliance PHOTO</Text>
        </TouchableOpacity>
      </View>

      {/* TWO PRIMARY ACTIONS */}
      <View style={styles.primaryActionsRow}>
        <TouchableOpacity style={styles.addNewBtn} onPress={onSubmitAddNew} activeOpacity={0.8}>
          <Text style={styles.addNewBtnText}>ADD NEW STRUCTURE</Text>
          <Text style={styles.btnSubtext}>Saves current & re-opens camera</Text>
        </TouchableOpacity>

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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingBottom: 10,
    marginBottom: 16,
  },
  previewCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(2, 132, 199, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    marginBottom: 20,
  },
  thumbnailWrapper: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F8FAFC',
  },
  previewThumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    flex: 1,
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
  },
  previewGpsData: {
    flex: 1,
    paddingLeft: 14,
    justifyContent: 'space-between',
  },
  gpsBadgeText: {
    color: '#0284C7',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  gpsDataText: {
    color: '#475569',
    fontSize: 10,
    fontFamily: 'System',
    marginTop: 2,
    fontWeight: '600',
  },
  gpsRecalBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1.2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: 6,
  },
  gpsRecalText: {
    color: '#0284C7',
    fontSize: 8.5,
    fontWeight: '800',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: '#0F172A',
    fontSize: 13,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorFeedback: {
    color: '#EF4444',
    fontSize: 9.5,
    marginTop: 4,
    fontWeight: 'bold',
  },
  remarksTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  retakePhotoBtn: {
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  retakePhotoText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  primaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addNewBtn: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    borderWidth: 1.5,
    borderRadius: 10,
  },
  addNewBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  finishSurveyBtn: {
    flex: 1,
    marginLeft: 6,
    paddingVertical: 12,
    alignItems: 'center',
    borderColor: '#059669',
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderWidth: 1.5,
    borderRadius: 10,
  },
  finishSurveyBtnText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  btnSubtext: {
    color: '#64748B',
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
});
