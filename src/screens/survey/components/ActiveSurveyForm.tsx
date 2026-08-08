import React, { useState, useMemo } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, Image, Modal, Pressable } from 'react-native';
import { Controller, useWatch } from 'react-hook-form';
import Dropdown from '../../../components/Dropdown';

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

        {isNewLtFromDtr ? (
          <>
            {nodeType === 'DTR' ? (
              <>
                {/* DTR Capacity */}
                <View style={styles.formGroup}>
                  <Controller
                    control={control}
                    name="dtrCapacity"
                    rules={{ required: (isNewLtFromDtr && nodeType === 'DTR') ? 'DTR Capacity is required' : false }}
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
                    rules={{ required: (isNewLtFromDtr && nodeType === 'DTR') ? 'DTR identifier is required' : false }}
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
                        rules={{ required: (isNewLtFromDtr && nodeType === 'DTR' && assetStatus === 'NEW') ? 'Pole Type is required' : false }}
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

                    {/* Pole Qty Input */}
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>POLE QTY</Text>
                      <Controller
                        control={control}
                        name="poleQty"
                        rules={{ required: (isNewLtFromDtr && nodeType === 'DTR' && assetStatus === 'NEW') ? 'Pole quantity is required' : false }}
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
                    rules={{ required: (isNewLtFromDtr && nodeType === 'POLE') ? 'Pole Type specification is required' : false }}
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

                {/* Pole No. */}
                <View style={styles.formGroup}>
                  <Text style={styles.label}>POLE NO.</Text>
                  <Controller
                    control={control}
                    name="nameLabel"
                    rules={{ required: (isNewLtFromDtr && nodeType === 'POLE') ? 'Pole identifier is required' : false }}
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
                rules={{ required: isNewLtFromDtr ? 'Conductor specification is required' : false }}
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
                rules={{ required: isNewLtFromDtr ? 'Select whether this structure is old or new' : false }}
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
        ) : (
          <>
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
          </>
        )}

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
          <Text style={styles.finishSurveyBtnText}>FINISH {workflowType}</Text>
          <Text style={styles.btnSubtext}>Submit line for verification</Text>
        </TouchableOpacity>
      </View>
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
