import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image, Modal, Pressable, ScrollView } from 'react-native';
import { Controller, useWatch } from 'react-hook-form';
import Dropdown from '../../../components/Dropdown';

const THEMES = {
  POLE: { text: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD', accent: '#0284C7' },
  EARTHING: { text: '#0D9488', bg: '#F0FDFA', border: '#CCFBF1', accent: '#0D9488' },
  STAY_SET: { text: '#D97706', bg: '#FFFBEB', border: '#FEF3C7', accent: '#D97706' },
  POLE_DB: { text: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', accent: '#7C3AED' },
  HARNESS: { text: '#475569', bg: '#F8FAFC', border: '#E2E8F0', accent: '#64748B' },
};

const formStyles = StyleSheet.create({
  detailsContainer: {
    flex: 1,
  },
  gpsStickyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  gpsCardLeft: {
    flex: 1,
  },
  gpsStickyTitle: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 1.2,
  },
  gpsCoordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  gpsCoordVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  gpsCoordSpacer: {
    marginHorizontal: 8,
    color: '#CBD5E1',
    fontWeight: '300',
  },
  gpsStickyAccuracy: {
    fontSize: 9,
    fontWeight: '600',
    color: '#475569',
    marginTop: 2,
  },
  gpsRecalBtn: {
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  gpsRecalText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    letterSpacing: 0.5,
  },
  contextBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  contextBadgeDtr: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderColor: 'rgba(139, 92, 246, 0.25)',
  },
  contextBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#D97706',
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  editingBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  editingBannerBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1D4ED8',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  editingBannerPole: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  editingBannerHelp: {
    fontSize: 10.5,
    color: '#475569',
    lineHeight: 15,
  },
  continuationBanner: {
    backgroundColor: '#F0FDF4',
    borderColor: '#22C55E',
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  continuationBannerBadge: {
    fontSize: 10,
    fontWeight: '900',
    color: '#15803D',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  continuationBannerParent: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 3,
  },
  continuationBannerHelp: {
    fontSize: 10.5,
    color: '#166534',
    lineHeight: 15,
  },
  updatePoleBtn: {
    flex: 1,
    marginRight: 6,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0284C7',
    borderRadius: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  updatePoleBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  continueLineBtn: {
    flex: 1,
    marginLeft: 6,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 10,
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  continueLineBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 4,
  },
  sectionHeaderContainer: {
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  sectionHeaderHelper: {
    fontSize: 9,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 12,
    fontWeight: '500',
  },
  formGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorFeedback: {
    color: '#EF4444',
    fontSize: 9.5,
    marginTop: 4,
    fontWeight: '700',
  },
  remarksTextArea: {
    height: 52,
    textAlignVertical: 'top',
  },
  conditionControl: {
    flexDirection: 'row',
    gap: 8,
  },
  conditionOption: {
    flex: 1,
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  conditionOldSelected: {
    borderColor: '#64748B',
    backgroundColor: 'rgba(100, 116, 139, 0.08)',
  },
  conditionNewSelected: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22, 163, 74, 0.07)',
  },
  conditionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  conditionText: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
  },
  conditionOldText: {
    color: '#475569',
  },
  conditionNewText: {
    color: '#15803D',
  },
  photoSectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    marginTop: 6,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  slotsContainer: {
    marginVertical: 4,
  },
  slotsScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  slotCard: {
    width: 68,
    height: 68,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    backgroundColor: '#F8FAFC',
  },
  slotThumbnail: {
    width: '100%',
    height: '100%',
  },
  slotDeleteBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  slotDeleteText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  slotEmptyCard: {
    width: 68,
    height: 68,
    borderRadius: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  slotCameraIcon: {
    fontSize: 14,
  },
  slotLabel: {
    fontSize: 7.5,
    fontWeight: '800',
    marginTop: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginHorizontal: -4,
  },
  gridCol: {
    flex: 1,
    marginHorizontal: 4,
  },
  dropdownTrigger: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  dropdownValueText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 12.5,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  chevron: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.50)',
    justifyContent: 'flex-end',
  },
});

interface ActiveSurveyFormProps {
  control: any;
  errors: any;
  nodeType: 'DTR' | 'POLE';
  lat: number | null;
  lng: number | null;
  gpsAccuracy: string;
  capturedPhotos: string[];
  onDeletePhoto: (index: number) => void;
  polePhotos?: string[];
  onDeletePolePhoto?: (index: number) => void;
  earthingPhotos?: string[];
  onDeleteEarthingPhoto?: (index: number) => void;
  staySetPhotos?: string[];
  onDeleteStaySetPhoto?: (index: number) => void;
  poleDbPhotos?: string[];
  onDeletePoleDbPhoto?: (index: number) => void;
  onTakePhoto?: (category: 'POLE' | 'EARTHING' | 'STAY_SET' | 'POLE_DB') => void;
  lineSection?: 'HT' | 'LT';
  acquiringGps: boolean;
  onAcquireGps: () => void;
  onRetakePhoto: () => void;
  onSubmitAddNew: () => void;
  onSubmitFinish: () => void;
  onSubmitDtrNext?: () => void;
  canSetDtrNext?: boolean;
  structureContext?: string;
  workflowType?: 'SURVEY' | 'ERECTION';
  lineType?: string | number;
  ltStartingPoint?: string | number;
  transformers?: any[];
  conductors?: any[];
  poles?: any[];
  domains?: any;
  isEditingNode?: boolean;
  editingPoleLabel?: string;
  continuationParentLabel?: string;
  spanDistance?: number | null;
  onUpdatePole?: () => void;
  onContinueFromPole?: () => void;
}

export default function ActiveSurveyForm({
  control,
  errors,
  nodeType,
  lat,
  lng,
  gpsAccuracy,
  capturedPhotos = [],
  onDeletePhoto,
  polePhotos = [],
  onDeletePolePhoto,
  earthingPhotos = [],
  onDeleteEarthingPhoto,
  staySetPhotos = [],
  onDeleteStaySetPhoto,
  poleDbPhotos = [],
  onDeletePoleDbPhoto,
  onTakePhoto,
  lineSection,
  acquiringGps,
  onAcquireGps,
  onRetakePhoto,
  onSubmitAddNew,
  onSubmitFinish,
  onSubmitDtrNext,
  canSetDtrNext = false,
  structureContext,
  workflowType = 'SURVEY',
  lineType,
  ltStartingPoint,
  transformers = [],
  conductors = [],
  poles = [],
  domains = {},
  isEditingNode = false,
  editingPoleLabel,
  continuationParentLabel,
  spanDistance,
  onUpdatePole,
  onContinueFromPole,
}: ActiveSurveyFormProps) {
  const [dbModalOpen, setDbModalOpen] = useState(false);

  const lt440vCode = domains?.['type_of_work']?.find((d: any) => d.domain_value === 'LT_440V')?.domain_code;
  const dtrCodeVal = domains?.['lt_starting_point']?.find((d: any) => d.domain_value === 'DTR')?.domain_code;

  const isNewLtFromDtr = workflowType === 'ERECTION' &&
    (lineType === 'LT_440V' || lineType === lt440vCode) &&
    (ltStartingPoint === 'DTR' || ltStartingPoint === dtrCodeVal);

  const selectedEarthing = useWatch({ control, name: 'earthingUsed' });
  const selectedStaySet = useWatch({ control, name: 'staySetUsed' });
  const assetStatus = useWatch({ control, name: 'assetStatus' });
  const showLtAccessories = nodeType === 'DTR' || (nodeType === 'POLE' && lineSection === 'LT');

  const getPoleDbLabel = (code: string) => {
    const arr = domains?.['pole_db'] || [];
    const found = arr.find((d: any) => String(d.domain_code) === String(code));
    return found ? (found.domain_desc || found.domain_value) : code;
  };

  const transformerOptions = useMemo(() => {
    return transformers.map((t: any) => ({
      label: t.transformer_name,
      value: t.id,
    }));
  }, [transformers]);

  const conductorOptions = useMemo(() => {
    return conductors.map((c: any) => ({
      label: c.conductor_name,
      value: c.id,
    }));
  }, [conductors]);

  const poleOptions = useMemo(() => {
    const arr = domains?.['pole_type'] || [];
    if (arr.length > 0) {
      return arr.map((d: any) => ({
        label: d.domain_desc || d.domain_value,
        value: d.domain_code,
      }));
    }
    return poles.map((p: any) => ({
      label: p.pole_name,
      value: p.id,
    }));
  }, [domains, poles]);

  const poleMasterOptions = useMemo(() => {
    return poles.map((p: any) => ({
      label: p.pole_name,
      value: p.id,
    }));
  }, [poles]);

  const earthingOptions = useMemo(() => {
    const arr = domains?.['earthing'] || [];
    return arr.map((d: any) => ({
      label: d.domain_desc || d.domain_value,
      value: d.domain_code,
    }));
  }, [domains]);

  const staySetOptions = useMemo(() => {
    const arr = domains?.['stay_set'] || [];
    return arr.map((d: any) => ({
      label: d.domain_desc || d.domain_value,
      value: d.domain_code,
    }));
  }, [domains]);

  const poleDbOptions = useMemo(() => {
    const arr = domains?.['pole_db'] || [];
    return arr.map((d: any) => ({
      label: d.domain_desc || d.domain_value,
      value: d.domain_code,
    }));
  }, [domains]);
  const isErectionFlow = workflowType === 'ERECTION';

  const renderPhotoSlots = (
    category: 'POLE' | 'EARTHING' | 'STAY_SET' | 'POLE_DB',
    photos: string[],
    onDelete: ((idx: number) => void) | undefined,
    requiredCount: number,
    colorTheme: any
  ) => {
    const slots: React.JSX.Element[] = [];
    photos.forEach((photo, idx) => {
      slots.push(
        <View key={`${category}-photo-${idx}`} style={formStyles.slotCard}>
          <Image source={{ uri: photo }} style={formStyles.slotThumbnail} />
          <TouchableOpacity
            style={formStyles.slotDeleteBtn}
            onPress={() => onDelete && onDelete(idx)}
            activeOpacity={0.7}
          >
            <Text style={formStyles.slotDeleteText}>✕</Text>
          </TouchableOpacity>
        </View>
      );
    });

    const emptyCount = Math.max(0, requiredCount - photos.length);
    for (let i = 0; i < emptyCount; i++) {
      const isMandatorySlot = photos.length + i === 0;
      slots.push(
        <TouchableOpacity
          key={`${category}-empty-${i}`}
          style={[formStyles.slotEmptyCard, { borderColor: colorTheme.border, backgroundColor: colorTheme.bg }]}
          onPress={() => onTakePhoto && onTakePhoto(category)}
          activeOpacity={0.7}
        >
          <Text style={[formStyles.slotCameraIcon, { color: colorTheme.text }]}>📸</Text>
          <Text style={[formStyles.slotLabel, { color: colorTheme.text }]}>
            {isMandatorySlot ? 'MANDATORY' : 'OPTIONAL'}
          </Text>
        </TouchableOpacity>
      );
    }

    if (photos.length >= requiredCount) {
      slots.push(
        <TouchableOpacity
          key={`${category}-extra`}
          style={[formStyles.slotEmptyCard, { borderColor: colorTheme.border, backgroundColor: colorTheme.bg }]}
          onPress={() => onTakePhoto && onTakePhoto(category)}
          activeOpacity={0.7}
        >
          <Text style={[formStyles.slotCameraIcon, { color: colorTheme.text }]}>➕</Text>
          <Text style={[formStyles.slotLabel, { color: colorTheme.text }]}>ADD EXTRA</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={formStyles.slotsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={formStyles.slotsScroll}>
          {slots}
        </ScrollView>
      </View>
    );
  };

  if (isErectionFlow) {
    const poleTypeVal = useWatch({ control, name: 'poleType' });
    const assetStatusVal = useWatch({ control, name: 'assetStatus' });
    const isConcrete = String(poleTypeVal) === '1';
    
    const requiredPolePhotos = nodeType === 'POLE' 
      ? (isConcrete ? 4 : 2)
      : (assetStatusVal === 'NEW' ? (isConcrete ? 4 : 2) : 1);

    return (
      <View style={formStyles.detailsContainer}>
        {/* GPS Sticky Info Card */}
        <View style={formStyles.gpsStickyCard}>
          <View style={formStyles.gpsCardLeft}>
            <Text style={formStyles.gpsStickyTitle}>📡 LOCATION TELEMETRY</Text>
            <View style={formStyles.gpsCoordsRow}>
              <Text style={formStyles.gpsCoordVal}>LAT: {lat ? lat.toFixed(6) : 'ACQUIRING...'}</Text>
              <Text style={formStyles.gpsCoordSpacer}>|</Text>
              <Text style={formStyles.gpsCoordVal}>LNG: {lng ? lng.toFixed(6) : 'ACQUIRING...'}</Text>
            </View>
            <Text style={formStyles.gpsStickyAccuracy}>ACCURACY: {gpsAccuracy}</Text>
          </View>
          <TouchableOpacity 
            style={[formStyles.gpsRecalBtn, acquiringGps && { opacity: 0.6 }]} 
            onPress={onAcquireGps} 
            disabled={acquiringGps}
          >
            <Text style={formStyles.gpsRecalText}>{acquiringGps ? 'SIGNAL...' : 'RE-SYNC GPS'}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          
          {structureContext && (
            <View style={[formStyles.contextBadge, nodeType === 'DTR' ? formStyles.contextBadgeDtr : null]}>
              <Text style={formStyles.contextBadgeText}>{structureContext}</Text>
            </View>
          )}

          {isEditingNode && (
            <View style={formStyles.editingBanner}>
              <Text style={formStyles.editingBannerBadge}>✏️ EDITING POLE STRUCTURE</Text>
              <Text style={formStyles.editingBannerPole}>{editingPoleLabel || 'Selected Structure'}</Text>
              <Text style={formStyles.editingBannerHelp}>
                Modifying saved structure data from drawing. Update below or continue the line branching from this pole.
              </Text>
            </View>
          )}

          {!isEditingNode && continuationParentLabel && (
            <View style={formStyles.continuationBanner}>
              <Text style={formStyles.continuationBannerBadge}>🔗 GPS CONNECTING LINE ACTIVE</Text>
              <Text style={formStyles.continuationBannerParent}>Branching From: {continuationParentLabel}</Text>
              <Text style={formStyles.continuationBannerHelp}>
                Line is actively continuing from {continuationParentLabel}
                {spanDistance != null ? ` • GPS Span Distance: ~${spanDistance.toFixed(1)}m` : ''}
              </Text>
            </View>
          )}

          {/* SECTION 1: PRIMARY DETAILS */}
          <View style={[formStyles.sectionCard, { borderLeftColor: THEMES.POLE.accent }]}>
            <View style={formStyles.sectionHeaderContainer}>
              <Text style={[formStyles.sectionHeaderTitle, { color: THEMES.POLE.text }]}>📡 STRUCTURE SPECIFICATION</Text>
              <Text style={formStyles.sectionHeaderHelper}>
                {nodeType === 'POLE' 
                  ? `Select Pole type. Concrete poles require 4 photos, non-concrete requires 2 photos.`
                  : `Enter transformer specifications and details.`}
              </Text>
            </View>

            {/* Render Section 1 form inputs */}
            {nodeType === 'DTR' ? (
              <>
                <View style={formStyles.formGroup}>
                  <Controller
                    control={control}
                    name="dtrCapacity"
                    rules={{ required: 'DTR Capacity is required' }}
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label="DTR CAPACITY"
                        placeholder="Select DTR capacity"
                        options={transformerOptions}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                  {errors.dtrCapacity && <Text style={formStyles.errorFeedback}>{errors.dtrCapacity.message}</Text>}
                </View>

                <View style={formStyles.formGroup}>
                  <Text style={formStyles.label}>DTR SERIAL NO.</Text>
                  <Controller
                    control={control}
                    name="nameLabel"
                    rules={{ required: 'DTR identifier is required' }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[formStyles.input, errors.nameLabel && formStyles.inputError]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter DTR Serial"
                        placeholderTextColor="rgba(30, 41, 59, 0.35)"
                      />
                    )}
                  />
                  {errors.nameLabel && <Text style={formStyles.errorFeedback}>{errors.nameLabel.message}</Text>}
                </View>

                {assetStatusVal === 'NEW' && (
                  <>
                    <View style={formStyles.formGroup}>
                      <Controller
                        control={control}
                        name="poleType"
                        rules={{ required: 'Pole Type is required' }}
                        render={({ field: { onChange, value } }) => (
                          <Dropdown
                            label="POLE TYPE"
                            placeholder="Select Pole Type"
                            options={poleOptions}
                            value={value}
                            onChange={onChange}
                          />
                        )}
                      />
                      {errors.poleType && <Text style={formStyles.errorFeedback}>{errors.poleType.message}</Text>}
                    </View>

                    <View style={formStyles.formGroup}>
                      <Controller
                        control={control}
                        name="poleMaster"
                        rules={{ required: 'Pole Master specification is required' }}
                        render={({ field: { onChange, value } }) => (
                          <Dropdown
                            label="POLE MASTER"
                            placeholder="Select Pole Master Specification"
                            options={poleMasterOptions}
                            value={value}
                            onChange={onChange}
                          />
                        )}
                      />
                      {errors.poleMaster && <Text style={formStyles.errorFeedback}>{errors.poleMaster.message}</Text>}
                    </View>

                    <View style={formStyles.formGroup}>
                      <Text style={formStyles.label}>POLE QTY</Text>
                      <Controller
                        control={control}
                        name="poleQty"
                        rules={{ required: 'Pole quantity is required' }}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            style={[formStyles.input, errors.poleQty && formStyles.inputError]}
                            keyboardType="numeric"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="Enter Pole Qty"
                            placeholderTextColor="rgba(30, 41, 59, 0.35)"
                          />
                        )}
                      />
                      {errors.poleQty && <Text style={formStyles.errorFeedback}>{errors.poleQty.message}</Text>}
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                <View style={formStyles.formGroup}>
                  <Controller
                    control={control}
                    name="poleType"
                    rules={{ required: 'Pole Type specification is required' }}
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label="POLE TYPE"
                        placeholder="Select Pole Type"
                        options={poleOptions}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                  {errors.poleType && <Text style={formStyles.errorFeedback}>{errors.poleType.message}</Text>}
                </View>

                <View style={formStyles.formGroup}>
                  <Controller
                    control={control}
                    name="poleMaster"
                    rules={{ required: 'Pole Master specification is required' }}
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label="POLE MASTER"
                        placeholder="Select Pole Master Specification"
                        options={poleMasterOptions}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                  {errors.poleMaster && <Text style={formStyles.errorFeedback}>{errors.poleMaster.message}</Text>}
                </View>

                <View style={formStyles.formGroup}>
                  <Text style={formStyles.label}>POLE NO.</Text>
                  <Controller
                    control={control}
                    name="nameLabel"
                    rules={{ required: 'Pole identifier is required' }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[formStyles.input, errors.nameLabel && formStyles.inputError]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="e.g. P-1"
                        placeholderTextColor="rgba(30, 41, 59, 0.35)"
                      />
                    )}
                  />
                  {errors.nameLabel && <Text style={formStyles.errorFeedback}>{errors.nameLabel.message}</Text>}
                </View>
              </>
            )}

            <View style={formStyles.formGroup}>
              <Controller
                control={control}
                name="conductor"
                rules={{ required: 'Conductor specification is required' }}
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    label="CONDUC/CABLE"
                    placeholder="Select Conductor"
                    options={conductorOptions}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
              {errors.conductor && <Text style={formStyles.errorFeedback}>{errors.conductor.message}</Text>}
            </View>

            <View style={formStyles.formGroup}>
              <Text style={formStyles.label}>STRUCTURE CONDITION</Text>
              <Controller
                control={control}
                name="assetStatus"
                rules={{ required: 'Select whether this structure is old or new' }}
                render={({ field: { onChange, value } }) => (
                  <View style={formStyles.conditionControl}>
                    {(['OLD', 'NEW'] as const).map(status => {
                      const selected = value === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            formStyles.conditionOption,
                            selected && (status === 'NEW' ? formStyles.conditionNewSelected : formStyles.conditionOldSelected),
                          ]}
                          onPress={() => onChange(status)}
                          activeOpacity={0.75}
                        >
                          <View style={[
                            formStyles.conditionDot,
                            { backgroundColor: status === 'NEW' ? '#16A34A' : '#64748B' },
                          ]} />
                          <Text style={[
                            formStyles.conditionText,
                            selected && (status === 'NEW' ? formStyles.conditionNewText : formStyles.conditionOldText),
                          ]}>
                            {status} STRUCTURE
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.assetStatus && <Text style={formStyles.errorFeedback}>{errors.assetStatus.message}</Text>}
            </View>

            {/* Photo slot for Section 1 */}
            <Text style={formStyles.photoSectionLabel}>📸 STRUCTURE COMPLIANCE PHOTOS ({polePhotos.length}/{requiredPolePhotos})</Text>
            {renderPhotoSlots('POLE', polePhotos, onDeletePolePhoto, requiredPolePhotos, THEMES.POLE)}
          </View>

          {/* SECTION 2: EARTHING INSTALLATION */}
          <View style={[formStyles.sectionCard, { borderLeftColor: THEMES.EARTHING.accent }]}>
            <View style={formStyles.sectionHeaderContainer}>
              <Text style={[formStyles.sectionHeaderTitle, { color: THEMES.EARTHING.text }]}>⚡ EARTHING INSTALLATION</Text>
              <Text style={formStyles.sectionHeaderHelper}>Specify earthing. Coil, Pipe or Spike options require 2 compliance photos.</Text>
            </View>

            <View style={formStyles.formGroup}>
              <Controller
                control={control}
                name="earthingUsed"
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    label="EARTHING USED"
                    placeholder="Select Earthing type"
                    options={earthingOptions}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
            </View>

            {selectedEarthing ? (
              <>
                <View style={formStyles.formGroup}>
                  <Text style={formStyles.label}>EARTHING QUANTITY</Text>
                  <Controller
                    control={control}
                    name="earthingQuantity"
                    rules={{ required: 'Earthing quantity is required' }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[formStyles.input, errors.earthingQuantity && formStyles.inputError]}
                        keyboardType="numeric"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter quantity"
                        placeholderTextColor="rgba(30, 41, 59, 0.35)"
                      />
                    )}
                  />
                  {errors.earthingQuantity && <Text style={formStyles.errorFeedback}>{errors.earthingQuantity.message}</Text>}
                </View>

                {/* Earthing Photo Slots */}
                <Text style={formStyles.photoSectionLabel}>📸 EARTHING COMPLIANCE PHOTOS ({earthingPhotos.length}/2)</Text>
                {renderPhotoSlots('EARTHING', earthingPhotos, onDeleteEarthingPhoto, 2, THEMES.EARTHING)}
              </>
            ) : null}
          </View>

          {/* SECTION 3: STAY SET SUPPORT */}
          <View style={[formStyles.sectionCard, { borderLeftColor: THEMES.STAY_SET.accent }]}>
            <View style={formStyles.sectionHeaderContainer}>
              <Text style={[formStyles.sectionHeaderTitle, { color: THEMES.STAY_SET.text }]}>⚓ STAY SET SUPPORT</Text>
              <Text style={formStyles.sectionHeaderHelper}>Specify stay set support. HT or LT Stay set options require 2 compliance photos.</Text>
            </View>

            <View style={formStyles.formGroup}>
              <Controller
                control={control}
                name="staySetUsed"
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    label="STAY SET USED"
                    placeholder="Select Stay Set type"
                    options={staySetOptions}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
            </View>

            {selectedStaySet ? (
              <>
                <View style={formStyles.formGroup}>
                  <Text style={formStyles.label}>STAY SET QUANTITY</Text>
                  <Controller
                    control={control}
                    name="staySetQuantity"
                    rules={{ required: 'Stay Set quantity is required' }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[formStyles.input, errors.staySetQuantity && formStyles.inputError]}
                        keyboardType="numeric"
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter quantity"
                        placeholderTextColor="rgba(30, 41, 59, 0.35)"
                      />
                    )}
                  />
                  {errors.staySetQuantity && <Text style={formStyles.errorFeedback}>{errors.staySetQuantity.message}</Text>}
                </View>

                {/* Stay Set Photo Slots */}
                <Text style={formStyles.photoSectionLabel}>📸 STAY SET COMPLIANCE PHOTOS ({staySetPhotos.length}/2)</Text>
                {renderPhotoSlots('STAY_SET', staySetPhotos, onDeleteStaySetPhoto, 2, THEMES.STAY_SET)}
              </>
            ) : null}
          </View>

          {/* SECTION 4: POLE DB ATTACHMENT */}
          {showLtAccessories ? (
            <View style={[formStyles.sectionCard, { borderLeftColor: THEMES.POLE_DB.accent }]}>
              <View style={formStyles.sectionHeaderContainer}>
                <Text style={[formStyles.sectionHeaderTitle, { color: THEMES.POLE_DB.text }]}>📦 DISTRIBUTION BOX (DB)</Text>
                <Text style={formStyles.sectionHeaderHelper}>Specify DB attachments. Pole DB installations require 1 compliance photo.</Text>
              </View>

              <View style={formStyles.formGroup}>
                <Text style={formStyles.label}>POLE DB TYPE</Text>
                <Controller
                  control={control}
                  name="poleDbTypes"
                  render={({ field: { onChange, value = [] } }) => (
                    <>
                      <TouchableOpacity
                        style={formStyles.dropdownTrigger}
                        onPress={() => setDbModalOpen(true)}
                      >
                        <Text style={[formStyles.dropdownValueText, (!value || value.length === 0) && formStyles.placeholderText]}>
                          {value && value.length > 0
                            ? value.map((code: string) => getPoleDbLabel(code)).join(', ')
                            : 'Select Pole DB Types'}
                        </Text>
                        <Text style={formStyles.chevron}>v</Text>
                      </TouchableOpacity>

                      <Modal visible={dbModalOpen} transparent animationType="fade" onRequestClose={() => setDbModalOpen(false)}>
                        <Pressable style={formStyles.modalOverlay} onPress={() => setDbModalOpen(false)}>
                          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
                            <View style={styles.modalHeader}>
                              <Text style={styles.modalTitle}>POLE DB TYPE</Text>
                              <TouchableOpacity onPress={() => setDbModalOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>x</Text>
                              </TouchableOpacity>
                            </View>
                            {poleDbOptions.map((opt: any) => {
                              const isChecked = value.includes(opt.value);
                              return (
                                <TouchableOpacity
                                  key={opt.value}
                                  style={styles.checkboxRow}
                                  onPress={() => {
                                    const nextValue = isChecked
                                      ? value.filter((v: any) => v !== opt.value)
                                      : [...value, opt.value];
                                    onChange(nextValue);
                                  }}
                                >
                                  <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxSelected]}>
                                    {isChecked && <Text style={styles.checkmark}>✓</Text>}
                                  </View>
                                  <Text style={styles.checkboxLabel}>{opt.label}</Text>
                                </TouchableOpacity>
                              );
                            })}
                            
                            <TouchableOpacity
                              style={styles.modalDoneBtn}
                              onPress={() => setDbModalOpen(false)}
                            >
                              <Text style={styles.modalDoneBtnText}>DONE</Text>
                            </TouchableOpacity>
                          </Pressable>
                        </Pressable>
                      </Modal>
                    </>
                  )}
                />
              </View>

              <Controller
                control={control}
                name="poleDbQuantities"
                rules={{
                  validate: (val, formValues) => {
                    const selectedTypes = formValues.poleDbTypes || [];
                    for (const type of selectedTypes) {
                      if (!val?.[type] || !val[type].trim()) {
                        const labelName = getPoleDbLabel(type);
                        return `${labelName} quantity is required`;
                      }
                    }
                    return true;
                  }
                }}
                render={({ field: { onChange, value = {} } }) => (
                  <Controller
                    control={control}
                    name="poleDbTypes"
                    render={({ field: { value: selectedTypes = [] } }) => (
                      <>
                        {selectedTypes.map((type: string) => {
                          const labelName = getPoleDbLabel(type);
                          return (
                            <View key={type} style={formStyles.formGroup}>
                              <Text style={formStyles.label}>{labelName} QUANTITY</Text>
                              <TextInput
                                style={[formStyles.input, errors.poleDbQuantities && formStyles.inputError]}
                                keyboardType="numeric"
                                value={value[type] || ''}
                                onChangeText={(text) => {
                                  onChange({
                                    ...value,
                                    [type]: text,
                                  });
                                }}
                                placeholder="Enter quantity"
                                placeholderTextColor="rgba(30, 41, 59, 0.35)"
                              />
                            </View>
                          );
                        })}
                      </>
                    )}
                  />
                )}
              />
              {errors.poleDbQuantities && (
                <Text style={formStyles.errorFeedback}>{errors.poleDbQuantities.message}</Text>
              )}

              {/* Pole DB Photo Slots */}
              {poleDbOptions.length > 0 && (
                <Controller
                  control={control}
                  name="poleDbTypes"
                  render={({ field: { value: selectedTypes = [] } }) => {
                    if (selectedTypes.length === 0) return <></>;
                    return (
                      <>
                        <Text style={formStyles.photoSectionLabel}>📸 POLE DB COMPLIANCE PHOTOS ({poleDbPhotos.length}/1)</Text>
                        {renderPhotoSlots('POLE_DB', poleDbPhotos, onDeletePoleDbPhoto, 1, THEMES.POLE_DB)}
                      </>
                    );
                  }}
                />
              )}
            </View>
          ) : null}

          {/* SECTION 5: ACCESSORIES & SITE DETAILS */}
          <View style={[formStyles.sectionCard, { borderLeftColor: THEMES.HARNESS.accent }]}>
            <View style={formStyles.sectionHeaderContainer}>
              <Text style={[formStyles.sectionHeaderTitle, { color: THEMES.HARNESS.text }]}>🔩 HARNESSING & SITE REMARKS</Text>
            </View>

            <View style={formStyles.gridRow}>
              <View style={formStyles.gridCol}>
                <Text style={formStyles.label}>DEAD END CLAMP QTY</Text>
                <Controller
                  control={control}
                  name="deadEndClampQty"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={formStyles.input}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="0"
                      placeholderTextColor="rgba(30, 41, 59, 0.35)"
                    />
                  )}
                />
              </View>
              <View style={formStyles.gridCol}>
                <Text style={formStyles.label}>SUSPENSION CLAMP QTY</Text>
                <Controller
                  control={control}
                  name="suspensionClampQty"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={formStyles.input}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="0"
                      placeholderTextColor="rgba(30, 41, 59, 0.35)"
                    />
                  )}
                />
              </View>
            </View>

            <View style={formStyles.gridRow}>
              <View style={formStyles.gridCol}>
                <Text style={formStyles.label}>POLE CLAMP QTY</Text>
                <Controller
                  control={control}
                  name="poleClampQty"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={formStyles.input}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="0"
                      placeholderTextColor="rgba(30, 41, 59, 0.35)"
                    />
                  )}
                />
              </View>
              <View style={formStyles.gridCol}>
                <Text style={formStyles.label}>IPC QTY</Text>
                <Controller
                  control={control}
                  name="ipcQty"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={formStyles.input}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="0"
                      placeholderTextColor="rgba(30, 41, 59, 0.35)"
                    />
                  )}
                />
              </View>
            </View>

            <View style={formStyles.gridRow}>
              <View style={formStyles.gridCol}>
                <Text style={formStyles.label}>NO. OF SERVICE CONN</Text>
                <Controller
                  control={control}
                  name="serviceConnectionQty"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={formStyles.input}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="0"
                      placeholderTextColor="rgba(30, 41, 59, 0.35)"
                    />
                  )}
                />
              </View>
              <View style={formStyles.gridCol}>
                <Text style={formStyles.label}>EXTRA CONSUMPTION (M)</Text>
                <Controller
                  control={control}
                  name="extraConsumption"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      style={formStyles.input}
                      keyboardType="numeric"
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder="0"
                      placeholderTextColor="rgba(30, 41, 59, 0.35)"
                    />
                  )}
                />
              </View>
            </View>

            <View style={formStyles.formGroup}>
              <Text style={formStyles.label}>SITE REMARKS</Text>
              <Controller
                control={control}
                name="remarks"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    style={[formStyles.input, formStyles.remarksTextArea]}
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
          </View>

          {/* PRIMARY ACTIONS */}
          {isEditingNode ? (
            <>
              <View style={styles.primaryActionsRow}>
                <TouchableOpacity 
                  style={formStyles.updatePoleBtn} 
                  onPress={onUpdatePole} 
                  activeOpacity={0.8}
                >
                  <Text style={formStyles.updatePoleBtnText}>UPDATE POLE</Text>
                  <Text style={[styles.btnSubtext, { color: '#E0F2FE' }]}>Save changes to database</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={formStyles.continueLineBtn} 
                  onPress={onContinueFromPole} 
                  activeOpacity={0.8}
                >
                  <Text style={formStyles.continueLineBtnText}>CONTINUE LINE ➔</Text>
                  <Text style={[styles.btnSubtext, { color: '#CCFBF1' }]}>Extend line from this pole</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.finishSurveyBtn, { marginLeft: 0, marginTop: 10 }]} 
                onPress={onSubmitFinish} 
                activeOpacity={0.8}
              >
                <Text style={styles.finishSurveyBtnText}>FINISH ERECTION</Text>
                <Text style={styles.btnSubtext}>Complete session & verify</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.primaryActionsRow}>
              <TouchableOpacity style={styles.addNewBtn} onPress={onSubmitAddNew} activeOpacity={0.8}>
                <Text style={styles.addNewBtnText}>ADD STRUCTURE</Text>
                <Text style={styles.btnSubtext}>Saves current & moves to next node</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.finishSurveyBtn} onPress={onSubmitFinish} activeOpacity={0.8}>
                <Text style={styles.finishSurveyBtnText}>FINISH ERECTION</Text>
                <Text style={styles.btnSubtext}>Submit line for verification</Text>
              </TouchableOpacity>
            </View>
          )}

          {canSetDtrNext && onSubmitDtrNext && (
            <TouchableOpacity style={styles.dtrNextBtn} onPress={onSubmitDtrNext} activeOpacity={0.8}>
              <View style={styles.dtrNextMark}>
                <Text style={styles.dtrNextMarkText}>D</Text>
              </View>
              <View style={styles.dtrNextCopy}>
                <Text style={styles.dtrNextTitle}>SAVE & CAPTURE DTR NEXT</Text>
                <Text style={styles.dtrNextSubtitle}>Ends the HT pole section and starts LT distribution</Text>
              </View>
              <Text style={styles.dtrNextArrow}>&gt;</Text>
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.detailsContainer}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>STRUCTURE VERIFICATION</Text>
        {structureContext && (
          <View style={[styles.phaseBadge, nodeType === 'DTR' ? styles.phaseBadgeDtr : null]}>
            <Text style={[styles.phaseBadgeText, nodeType === 'DTR' ? styles.phaseBadgeTextDtr : null]}>
              {structureContext}
            </Text>
          </View>
        )}

        {isEditingNode && (
          <View style={formStyles.editingBanner}>
            <Text style={formStyles.editingBannerBadge}>✏️ EDITING POLE STRUCTURE</Text>
            <Text style={formStyles.editingBannerPole}>{editingPoleLabel || 'Selected Structure'}</Text>
            <Text style={formStyles.editingBannerHelp}>
              Modifying saved structure data. Update below or continue the line branching from this pole.
            </Text>
          </View>
        )}

        {!isEditingNode && continuationParentLabel && (
          <View style={formStyles.continuationBanner}>
            <Text style={formStyles.continuationBannerBadge}>🔗 GPS CONNECTING LINE ACTIVE</Text>
            <Text style={formStyles.continuationBannerParent}>Branching From: {continuationParentLabel}</Text>
            <Text style={formStyles.continuationBannerHelp}>
              Line is actively continuing from {continuationParentLabel}
              {spanDistance != null ? ` • GPS Span Distance: ~${spanDistance.toFixed(1)}m` : ''}
            </Text>
          </View>
        )}

        {/* Photo Thumbnail + GPS Overlay */}
        <View style={styles.previewCard}>
          <View style={styles.thumbnailWrapper}>
            {capturedPhotos && capturedPhotos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {capturedPhotos.map((photo, index) => (
                  <View key={index} style={{ width: 100, height: 100, position: 'relative' }}>
                    <Image source={{ uri: photo }} style={styles.previewThumbnail} />
                    <TouchableOpacity
                      style={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        backgroundColor: 'rgba(239, 68, 68, 0.9)',
                        borderRadius: 10,
                        width: 20,
                        height: 20,
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 10,
                      }}
                      onPress={() => onDeletePhoto(index)}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' }}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
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

        {true ? (
          <>
            {nodeType === 'DTR' ? (
              <>
                {/* DTR Capacity */}
                <View style={styles.formGroup}>
                  <Controller
                    control={control}
                    name="dtrCapacity"
                    rules={{ required: nodeType === 'DTR' ? 'DTR Capacity is required' : false }}
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label="DTR CAPACITY"
                        placeholder="Select DTR capacity"
                        options={transformerOptions}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                  {errors.dtrCapacity && (
                    <Text style={styles.errorFeedback}>{errors.dtrCapacity.message}</Text>
                  )}
                </View>

                {/* DTR Serial No. */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>DTR SERIAL NO.</Text>
                  <Controller
                    control={control}
                    name="nameLabel"
                    rules={{ required: nodeType === 'DTR' ? 'DTR identifier is required' : false }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.input, errors.nameLabel && styles.inputError]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="Enter DTR Serial"
                        placeholderTextColor="rgba(30, 41, 59, 0.35)"
                      />
                    )}
                  />
                  {errors.nameLabel && (
                    <Text style={styles.errorFeedback}>{errors.nameLabel.message}</Text>
                  )}
                </View>

                {/* For DTR, if user chooses New Structure, render Pole Type and Pole Qty */}
                {assetStatus === 'NEW' && (
                  <>
                    {/* Pole Type Dropdown */}
                    <View style={styles.formGroup}>
                      <Controller
                        control={control}
                        name="poleType"
                        rules={{ required: (nodeType === 'DTR' && assetStatus === 'NEW') ? 'Pole Type is required' : false }}
                        render={({ field: { onChange, value } }) => (
                          <Dropdown
                            label="POLE TYPE"
                            placeholder="Select Pole Type"
                            options={poleOptions}
                            value={value}
                            onChange={onChange}
                          />
                        )}
                      />
                      {errors.poleType && (
                        <Text style={styles.errorFeedback}>{errors.poleType.message}</Text>
                      )}
                    </View>

                    {/* Pole Master Dropdown */}
                    <View style={styles.formGroup}>
                      <Controller
                        control={control}
                        name="poleMaster"
                        rules={{ required: (nodeType === 'DTR' && assetStatus === 'NEW') ? 'Pole Master specification is required' : false }}
                        render={({ field: { onChange, value } }) => (
                          <Dropdown
                            label="POLE MASTER"
                            placeholder="Select Pole Master Specification"
                            options={poleMasterOptions}
                            value={value}
                            onChange={onChange}
                          />
                        )}
                      />
                      {errors.poleMaster && (
                        <Text style={styles.errorFeedback}>{errors.poleMaster.message}</Text>
                      )}
                    </View>

                    {/* Pole Qty Input */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>POLE QTY</Text>
                      <Controller
                        control={control}
                        name="poleQty"
                        rules={{ required: (nodeType === 'DTR' && assetStatus === 'NEW') ? 'Pole quantity is required' : false }}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <TextInput
                            style={[styles.input, errors.poleQty && styles.inputError]}
                            keyboardType="numeric"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            placeholder="Enter Pole Qty"
                            placeholderTextColor="rgba(30, 41, 59, 0.35)"
                          />
                        )}
                      />
                      {errors.poleQty && (
                        <Text style={styles.errorFeedback}>{errors.poleQty.message}</Text>
                      )}
                    </View>
                  </>
                )}
              </>
            ) : (
              <>
                {/* Pole Type Dropdown */}
                <View style={styles.formGroup}>
                  <Controller
                    control={control}
                    name="poleType"
                    rules={{ required: nodeType === 'POLE' ? 'Pole Type specification is required' : false }}
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label="POLE TYPE"
                        placeholder="Select Pole Type"
                        options={poleOptions}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                  {errors.poleType && (
                    <Text style={styles.errorFeedback}>{errors.poleType.message}</Text>
                  )}
                </View>

                {/* Pole Master Dropdown */}
                <View style={styles.formGroup}>
                  <Controller
                    control={control}
                    name="poleMaster"
                    rules={{ required: nodeType === 'POLE' ? 'Pole Master specification is required' : false }}
                    render={({ field: { onChange, value } }) => (
                      <Dropdown
                        label="POLE MASTER"
                        placeholder="Select Pole Master Specification"
                        options={poleMasterOptions}
                        value={value}
                        onChange={onChange}
                      />
                    )}
                  />
                  {errors.poleMaster && (
                    <Text style={styles.errorFeedback}>{errors.poleMaster.message}</Text>
                  )}
                </View>

                {/* Pole No. */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>POLE NO.</Text>
                  <Controller
                    control={control}
                    name="nameLabel"
                    rules={{ required: nodeType === 'POLE' ? 'Pole identifier is required' : false }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <TextInput
                        style={[styles.input, errors.nameLabel && styles.inputError]}
                        value={value}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        placeholder="e.g. P-1"
                        placeholderTextColor="rgba(30, 41, 59, 0.35)"
                      />
                    )}
                  />
                  {errors.nameLabel && (
                    <Text style={styles.errorFeedback}>{errors.nameLabel.message}</Text>
                  )}
                </View>
              </>
            )}

            {/* Conductor Dropdown */}
            <View style={styles.formGroup}>
              <Controller
                control={control}
                name="conductor"
                rules={{ required: 'Conductor specification is required' }}
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    label="CONDUCTOR"
                    placeholder="Select Conductor"
                    options={conductorOptions}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
              {errors.conductor && (
                <Text style={styles.errorFeedback}>{errors.conductor.message}</Text>
              )}
            </View>

            {/* Structure Condition */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>STRUCTURE CONDITION</Text>
              <Controller
                control={control}
                name="assetStatus"
                rules={{ required: 'Select whether this structure is old or new' }}
                render={({ field: { onChange, value } }) => (
                  <View style={styles.conditionControl}>
                    {(['OLD', 'NEW'] as const).map(status => {
                      const selected = value === status;
                      return (
                        <TouchableOpacity
                          key={status}
                          style={[
                            styles.conditionOption,
                            selected && (status === 'NEW' ? styles.conditionNewSelected : styles.conditionOldSelected),
                          ]}
                          onPress={() => onChange(status)}
                          activeOpacity={0.75}
                        >
                          <View style={[
                            styles.conditionDot,
                            { backgroundColor: status === 'NEW' ? '#16A34A' : '#64748B' },
                          ]} />
                          <Text style={[
                            styles.conditionText,
                            selected && (status === 'NEW' ? styles.conditionNewText : styles.conditionOldText),
                          ]}>
                            {status} STRUCTURE
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              />
              {errors.assetStatus && (
                <Text style={styles.errorFeedback}>{errors.assetStatus.message}</Text>
              )}
            </View>

            {/* Earthing Used */}
            <View style={styles.formGroup}>
              <Controller
                control={control}
                name="earthingUsed"
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    label="EARTHING USED"
                    placeholder="Select Earthing type"
                    options={earthingOptions}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
            </View>

            {/* Earthing Quantity */}
            <Controller
              control={control}
              name="earthingUsed"
              render={({ field: { value: selectedEarthing } }) => {
                if (!selectedEarthing) return <></>;
                return (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>EARTHING QUANTITY</Text>
                    <Controller
                      control={control}
                      name="earthingQuantity"
                      rules={{ required: selectedEarthing ? 'Earthing quantity is required' : false }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[styles.input, errors.earthingQuantity && styles.inputError]}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter quantity"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                    {errors.earthingQuantity && (
                      <Text style={styles.errorFeedback}>{errors.earthingQuantity.message}</Text>
                    )}
                  </View>
                );
              }}
            />

            {/* Stay Set Used */}
            <View style={styles.formGroup}>
              <Controller
                control={control}
                name="staySetUsed"
                render={({ field: { onChange, value } }) => (
                  <Dropdown
                    label="STAY SET USED"
                    placeholder="Select Stay Set type"
                    options={staySetOptions}
                    value={value}
                    onChange={onChange}
                  />
                )}
              />
            </View>

            {/* Stay Set Quantity */}
            <Controller
              control={control}
              name="staySetUsed"
              render={({ field: { value: selectedStaySet } }) => {
                if (!selectedStaySet) return <></>;
                return (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>STAY SET QUANTITY</Text>
                    <Controller
                      control={control}
                      name="staySetQuantity"
                      rules={{ required: selectedStaySet ? 'Stay Set quantity is required' : false }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={[styles.input, errors.staySetQuantity && styles.inputError]}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Enter quantity"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                    {errors.staySetQuantity && (
                      <Text style={styles.errorFeedback}>{errors.staySetQuantity.message}</Text>
                    )}
                  </View>
                );
              }}
            />

            {showLtAccessories && (
              <>
                {/* Pole DB Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>POLE DB TYPE</Text>
                  <Controller
                    control={control}
                    name="poleDbTypes"
                    render={({ field: { onChange, value = [] } }) => (
                      <>
                        <TouchableOpacity
                          style={styles.dropdownTrigger}
                          onPress={() => setDbModalOpen(true)}
                        >
                          <Text style={[styles.dropdownValueText, (!value || value.length === 0) && styles.placeholderText]}>
                            {value && value.length > 0
                              ? value.map((code: string) => getPoleDbLabel(code)).join(', ')
                              : 'Select Pole DB Types'}
                          </Text>
                          <Text style={styles.chevron}>v</Text>
                        </TouchableOpacity>

                        <Modal visible={dbModalOpen} transparent animationType="fade" onRequestClose={() => setDbModalOpen(false)}>
                          <Pressable style={styles.modalOverlay} onPress={() => setDbModalOpen(false)}>
                            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
                              <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>POLE DB TYPE</Text>
                                <TouchableOpacity onPress={() => setDbModalOpen(false)} style={styles.closeBtn}>
                                  <Text style={styles.closeBtnText}>x</Text>
                                </TouchableOpacity>
                              </View>
                              {poleDbOptions.map((opt: any) => {
                                const isChecked = value.includes(opt.value);
                                return (
                                  <TouchableOpacity
                                    key={opt.value}
                                    style={styles.checkboxRow}
                                    onPress={() => {
                                      const nextValue = isChecked
                                        ? value.filter((v: any) => v !== opt.value)
                                        : [...value, opt.value];
                                      onChange(nextValue);
                                    }}
                                  >
                                    <View style={[styles.checkboxBox, isChecked && styles.checkboxBoxSelected]}>
                                      {isChecked && <Text style={styles.checkmark}>✓</Text>}
                                    </View>
                                    <Text style={styles.checkboxLabel}>{opt.label}</Text>
                                  </TouchableOpacity>
                                );
                              })}
                              
                              <TouchableOpacity
                                style={styles.modalDoneBtn}
                                onPress={() => setDbModalOpen(false)}
                              >
                                <Text style={styles.modalDoneBtnText}>DONE</Text>
                              </TouchableOpacity>
                            </Pressable>
                          </Pressable>
                        </Modal>
                      </>
                    )}
                  />
                </View>

                {/* Pole DB Type Quantities */}
                <Controller
                  control={control}
                  name="poleDbQuantities"
                  rules={{
                    validate: (val, formValues) => {
                      const selectedTypes = formValues.poleDbTypes || [];
                      for (const type of selectedTypes) {
                        if (!val?.[type] || !val[type].trim()) {
                          const labelName = getPoleDbLabel(type);
                          return `${labelName} quantity is required`;
                        }
                      }
                      return true;
                    }
                  }}
                  render={({ field: { onChange, value = {} } }) => (
                    <Controller
                      control={control}
                      name="poleDbTypes"
                      render={({ field: { value: selectedTypes = [] } }) => (
                        <>
                          {selectedTypes.map((type: string) => {
                            const labelName = getPoleDbLabel(type);
                            return (
                              <View key={type} style={styles.formGroup}>
                                <Text style={styles.label}>{labelName} QUANTITY</Text>
                                <TextInput
                                  style={[styles.input, errors.poleDbQuantities && styles.inputError]}
                                  keyboardType="numeric"
                                  value={value[type] || ''}
                                  onChangeText={(text) => {
                                    onChange({
                                      ...value,
                                      [type]: text,
                                    });
                                  }}
                                  placeholder="Enter quantity"
                                  placeholderTextColor="rgba(30, 41, 59, 0.35)"
                                />
                              </View>
                            );
                          })}
                        </>
                      )}
                    />
                  )}
                />
                {errors.poleDbQuantities && (
                  <Text style={styles.errorFeedback}>{errors.poleDbQuantities.message}</Text>
                )}

                {/* Clamps & service connections in compact grid */}
                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.label}>DEAD END CLAMP QTY</Text>
                    <Controller
                      control={control}
                      name="deadEndClampQty"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.label}>SUSPENSION CLAMP QTY</Text>
                    <Controller
                      control={control}
                      name="suspensionClampQty"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.label}>POLE CLAMP QTY</Text>
                    <Controller
                      control={control}
                      name="poleClampQty"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.label}>IPC QTY</Text>
                    <Controller
                      control={control}
                      name="ipcQty"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                  </View>
                </View>

                <View style={styles.gridRow}>
                  <View style={styles.gridCol}>
                    <Text style={styles.label}>NO. OF SERVICE CONN</Text>
                    <Controller
                      control={control}
                      name="serviceConnectionQty"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                  </View>
                  <View style={styles.gridCol}>
                    <Text style={styles.label}>EXTRA CONSUMPTION (MTR)</Text>
                    <Controller
                      control={control}
                      name="extraConsumption"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0"
                          placeholderTextColor="rgba(30, 41, 59, 0.35)"
                        />
                      )}
                    />
                  </View>
                </View>
              </>
            )}
          </>
        ) : null}

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

        <TouchableOpacity style={styles.retakePhotoBtn} onPress={onRetakePhoto}>
          <Text style={styles.retakePhotoText}>📸 ADD / CAPTURE COMPLIANCE PHOTO</Text>
        </TouchableOpacity>
      </View>

      {/* PRIMARY ACTIONS */}
      {isEditingNode ? (
        <>
          <View style={styles.primaryActionsRow}>
            <TouchableOpacity 
              style={formStyles.updatePoleBtn} 
              onPress={onUpdatePole} 
              activeOpacity={0.8}
            >
              <Text style={formStyles.updatePoleBtnText}>UPDATE POLE</Text>
              <Text style={[styles.btnSubtext, { color: '#E0F2FE' }]}>Save changes to database</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={formStyles.continueLineBtn} 
              onPress={onContinueFromPole} 
              activeOpacity={0.8}
            >
              <Text style={formStyles.continueLineBtnText}>CONTINUE LINE ➔</Text>
              <Text style={[styles.btnSubtext, { color: '#CCFBF1' }]}>Extend line from this pole</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.finishSurveyBtn, { marginLeft: 0, marginTop: 10 }]} 
            onPress={onSubmitFinish} 
            activeOpacity={0.8}
          >
            <Text style={styles.finishSurveyBtnText}>FINISH {workflowType}</Text>
            <Text style={styles.btnSubtext}>Submit line for verification</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.primaryActionsRow}>
          <TouchableOpacity style={styles.addNewBtn} onPress={onSubmitAddNew} activeOpacity={0.8}>
            <Text style={styles.addNewBtnText}>ADD NEW STRUCTURE</Text>
            <Text style={styles.btnSubtext}>Saves current & re-opens camera</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.finishSurveyBtn} onPress={onSubmitFinish} activeOpacity={0.8}>
            <Text style={styles.finishSurveyBtnText}>FINISH {workflowType}</Text>
            <Text style={styles.btnSubtext}>Submit line for verification</Text>
          </TouchableOpacity>
        </View>
      )}
      {canSetDtrNext && onSubmitDtrNext && (
        <TouchableOpacity style={styles.dtrNextBtn} onPress={onSubmitDtrNext} activeOpacity={0.8}>
          <View style={styles.dtrNextMark}>
            <Text style={styles.dtrNextMarkText}>D</Text>
          </View>
          <View style={styles.dtrNextCopy}>
            <Text style={styles.dtrNextTitle}>SAVE & CAPTURE DTR NEXT</Text>
            <Text style={styles.dtrNextSubtitle}>Ends the HT pole section and starts LT distribution</Text>
          </View>
          <Text style={styles.dtrNextArrow}>&gt;</Text>
        </TouchableOpacity>
      )}
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
  phaseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.10)',
    borderColor: 'rgba(217, 119, 6, 0.30)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 14,
  },
  phaseBadgeDtr: {
    backgroundColor: 'rgba(139, 92, 246, 0.09)',
    borderColor: 'rgba(139, 92, 246, 0.30)',
  },
  phaseBadgeText: {
    color: '#B45309',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  phaseBadgeTextDtr: {
    color: '#7C3AED',
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
  conditionControl: {
    flexDirection: 'row',
  },
  conditionOption: {
    flex: 1,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(100, 116, 139, 0.22)',
    borderWidth: 1.2,
    paddingHorizontal: 8,
  },
  conditionOldSelected: {
    borderColor: '#64748B',
    backgroundColor: 'rgba(100, 116, 139, 0.09)',
  },
  conditionNewSelected: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  conditionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 7,
  },
  conditionText: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: '800',
  },
  conditionOldText: {
    color: '#475569',
  },
  conditionNewText: {
    color: '#15803D',
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
  dropdownTrigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.20)',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  dropdownValueText: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  chevron: {
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '800',
    marginLeft: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.50)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#64748B',
    fontSize: 18,
    fontWeight: '700',
  },
  checkboxRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxBoxSelected: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  checkmark: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '900',
  },
  checkboxLabel: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '600',
  },
  modalDoneBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  gridCol: {
    flex: 1,
    marginHorizontal: 4,
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
  dtrNextBtn: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#8B5CF6',
    backgroundColor: 'rgba(139, 92, 246, 0.07)',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 14,
    marginTop: 12,
  },
  dtrNextMark: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
  },
  dtrNextMarkText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  dtrNextCopy: {
    flex: 1,
    marginHorizontal: 12,
  },
  dtrNextTitle: {
    color: '#6D28D9',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  dtrNextSubtitle: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 3,
  },
  dtrNextArrow: {
    color: '#7C3AED',
    fontSize: 20,
    fontWeight: '700',
  },
});
