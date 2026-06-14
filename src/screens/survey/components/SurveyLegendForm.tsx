import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';

interface SurveyLegendFormProps {
  location: string;
  setLocation: (v: string) => void;
  block: string;
  setBlock: (v: string) => void;
  district: string;
  setDistrict: (v: string) => void;
  preparedBy: string;
  setPreparedBy: (v: string) => void;
  contractor: string;
  setContractor: (v: string) => void;
  remarks: string;
  setRemarks: (v: string) => void;
  accentColor: string;
  onSave: () => void;
}

export default function SurveyLegendForm({
  location,
  setLocation,
  block,
  setBlock,
  district,
  setDistrict,
  preparedBy,
  setPreparedBy,
  contractor,
  setContractor,
  remarks,
  setRemarks,
  accentColor,
  onSave,
}: SurveyLegendFormProps) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>OFFLINE LEGEND PARAMETERS</Text>
      <Text style={styles.legendFormSubtitle}>Synchronized to centralized PostGIS server metadata fields.</Text>
      
      <View style={styles.formGrid}>
        <View style={styles.formGroupHalf}>
          <Text style={styles.formLabel}>LOCATION ZONE</Text>
          <TextInput
            style={styles.formInput}
            value={location}
            onChangeText={setLocation}
            placeholder="Sector or Area Name"
            placeholderTextColor="rgba(30, 41, 59, 0.35)"
          />
        </View>

        <View style={styles.formGroupHalf}>
          <Text style={styles.formLabel}>SUB-DIVISION BLOCK</Text>
          <TextInput
            style={styles.formInput}
            value={block}
            onChangeText={setBlock}
            placeholder="e.g. Block-VII"
            placeholderTextColor="rgba(30, 41, 59, 0.35)"
          />
        </View>

        <View style={styles.formGroupHalf}>
          <Text style={styles.formLabel}>DISTRICT FEEDED</Text>
          <TextInput
            style={styles.formInput}
            value={district}
            onChangeText={setDistrict}
            placeholder="District Division"
            placeholderTextColor="rgba(30, 41, 59, 0.35)"
          />
        </View>

        <View style={styles.formGroupHalf}>
          <Text style={styles.formLabel}>PREPARED BY (SURVEYOR)</Text>
          <TextInput
            style={styles.formInput}
            value={preparedBy}
            onChangeText={setPreparedBy}
            placeholder="Your Name"
            placeholderTextColor="rgba(30, 41, 59, 0.35)"
          />
        </View>

        <View style={styles.formGroupFull}>
          <Text style={styles.formLabel}>CONTRACTOR FIRM</Text>
          <TextInput
            style={styles.formInput}
            value={contractor}
            onChangeText={setContractor}
            placeholder="Contracting Agency"
            placeholderTextColor="rgba(30, 41, 59, 0.35)"
          />
        </View>

        <View style={styles.formGroupFull}>
          <Text style={styles.formLabel}>SURVEY LINE REMARKS</Text>
          <TextInput
            style={[styles.formInput, { height: 50, textAlignVertical: 'top' }]}
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={2}
            placeholder="General route remarks..."
            placeholderTextColor="rgba(30, 41, 59, 0.35)"
          />
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.saveBtn, { borderColor: accentColor, backgroundColor: `${accentColor}0A` }]} 
        onPress={onSave}
      >
        <Text style={[styles.saveBtnText, { color: accentColor }]}>SAVE LEGEND METADATA</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  legendFormSubtitle: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 2,
    marginBottom: 14,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  formGroupHalf: {
    width: '48%',
    marginBottom: 12,
  },
  formGroupFull: {
    width: '100%',
    marginBottom: 12,
  },
  formLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 12,
  },
  saveBtn: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
