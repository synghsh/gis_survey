import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import Dropdown, { DropdownOption } from '../../components/Dropdown';
import { useToast } from '../../components/ToastProvider';
import {
  ERECTION_LINE_TYPES,
  ERECTION_LOCATION_DATA,
  LT_STARTING_POINT_OPTIONS,
} from '../../data/erectionSetupData';
import { startSurvey, SurveyLine } from '../../store';

type LineType = SurveyLine['lineType'];
type LtStartingPoint = NonNullable<SurveyLine['ltStartingPoint']>;

const toOptions = (names: string[]): DropdownOption[] => names.map(name => ({ label: name, value: name }));

export default function SurveySetupScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const toast = useToast();

  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [village, setVillage] = useState('');
  const [contractor, setContractor] = useState('');
  const [lineType, setLineType] = useState<LineType | ''>('');
  const [ltStartingPoint, setLtStartingPoint] = useState<LtStartingPoint | ''>('');
  const [remarks, setRemarks] = useState('');

  const selectedState = ERECTION_LOCATION_DATA.find(item => item.name === stateName);
  const selectedDistrict = selectedState?.districts.find(item => item.name === district);
  const selectedBlock = selectedDistrict?.blocks.find(item => item.name === block);
  const selectedVillage = selectedBlock?.villages.find(item => item.name === village);

  const stateOptions = useMemo(() => toOptions(ERECTION_LOCATION_DATA.map(item => item.name)), []);
  const districtOptions = toOptions(selectedState?.districts.map(item => item.name) ?? []);
  const blockOptions = toOptions(selectedDistrict?.blocks.map(item => item.name) ?? []);
  const villageOptions = toOptions(selectedBlock?.villages.map(item => item.name) ?? []);
  const contractorOptions = toOptions(selectedVillage?.contractors ?? []);

  const handleStart = () => {
    if (!stateName || !district || !block || !village || !contractor || !lineType) {
      toast.warning('Complete every required survey detail before continuing.', { title: 'Details required' });
      return;
    }
    if (lineType === 'LT_440V' && !ltStartingPoint) {
      toast.warning('Choose where the LT line starts.', { title: 'Starting point required' });
      return;
    }

    dispatch(startSurvey({
      id: `srv-${Date.now().toString(36)}`,
      workflowType: 'SURVEY',
      lineType,
      ltStartingPoint: lineType === 'LT_440V' ? ltStartingPoint as LtStartingPoint : undefined,
      contractorName: contractor,
      remarks: remarks.trim(),
      stateName,
      district,
      block,
      village,
      location: village,
    }));
    navigation.replace('ActiveSurvey');
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>&lt;</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>NEW SURVEY RUN</Text>
          <Text style={styles.headerSubtitle}>PROJECT LOCATION & ASSIGNMENT</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>LOCATION HIERARCHY</Text>
          <Dropdown
            label="STATE NAME"
            placeholder="Choose state"
            options={stateOptions}
            value={stateName}
            onChange={value => {
              setStateName(value);
              setDistrict('');
              setBlock('');
              setVillage('');
              setContractor('');
            }}
          />
          <Dropdown
            label="DISTRICT"
            placeholder="Choose district"
            options={districtOptions}
            value={district}
            disabled={!stateName}
            onChange={value => {
              setDistrict(value);
              setBlock('');
              setVillage('');
              setContractor('');
            }}
          />
          <Dropdown
            label="BLOCK"
            placeholder="Choose block"
            options={blockOptions}
            value={block}
            disabled={!district}
            onChange={value => {
              setBlock(value);
              setVillage('');
              setContractor('');
            }}
          />
          <Dropdown
            label="VILLAGE"
            placeholder="Choose village"
            options={villageOptions}
            value={village}
            disabled={!block}
            onChange={value => {
              setVillage(value);
              setContractor('');
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SURVEY ASSIGNMENT</Text>
          <Dropdown
            label="CONTRACTOR / FIRM NAME"
            placeholder="Choose contractor or firm"
            options={contractorOptions}
            value={contractor}
            disabled={!village}
            onChange={setContractor}
          />
          <Dropdown
            label="VOLTAGE / CABLE CLASS"
            placeholder="Choose line class"
            options={ERECTION_LINE_TYPES}
            value={lineType}
            onChange={value => {
              setLineType(value as LineType);
              setLtStartingPoint('');
            }}
          />
          {lineType === 'LT_440V' && (
            <Dropdown
              label="LT LINE STARTING POINT"
              placeholder="Choose starting point"
              options={LT_STARTING_POINT_OPTIONS}
              value={ltStartingPoint}
              onChange={value => setLtStartingPoint(value as LtStartingPoint)}
            />
          )}
          <Text style={styles.fieldLabel}>SITE DESCRIPTION / REMARKS</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Execution notes, alignment, site access..."
            placeholderTextColor="#94A3B8"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity style={styles.startButton} onPress={handleStart} activeOpacity={0.8}>
          <Text style={styles.startButtonText}>START LINE SURVEY</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F8FB' },
  header: {
    paddingTop: 52,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF5FB',
    marginRight: 12,
  },
  backText: { color: '#0284C7', fontSize: 22, fontWeight: '700' },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  headerSubtitle: { color: '#64748B', fontSize: 8.5, fontWeight: '700', letterSpacing: 1.2, marginTop: 3 },
  content: { padding: 18, paddingBottom: 40 },
  section: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DFE8EF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    marginBottom: 17,
  },
  fieldLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
  remarksInput: {
    minHeight: 92,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.20)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#0F172A',
    fontSize: 13,
    textAlignVertical: 'top',
  },
  startButton: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284C7',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 9,
    elevation: 4,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.1 },
});
