import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown, { DropdownOption } from '../../components/Dropdown';
import { useToast } from '../../components/ToastProvider';
import {
  ERECTION_LINE_TYPES,
  ERECTION_LOCATION_DATA,
  LT_STARTING_POINT_OPTIONS,
} from '../../data/erectionSetupData';
import { startSurvey, SurveyLine, RootState } from '../../store';
import { fetchStatesAction, fetchDistrictsAction, fetchBlocksAction, fetchVillagesAction, fetchContractorsAction, fetchDomainsAction } from '../../store/actions/masterAction';

type LineType = SurveyLine['lineType'];
type LtStartingPoint = SurveyLine['ltStartingPoint'];

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

  const states = useSelector((state: RootState) => state.master.states);
  const districts = useSelector((state: RootState) => state.master.districts);
  const blocks = useSelector((state: RootState) => state.master.blocks);
  const villages = useSelector((state: RootState) => state.master.villages) || [];
  const contractors = useSelector((state: RootState) => state.master.contractors) || [];
  const domains = useSelector((state: RootState) => state.master.domains) || {};

  useEffect(() => {
    dispatch(fetchStatesAction(undefined, (err) => {
      toast.error(err || 'Failed to fetch states from server');
    }) as any);
    dispatch(fetchContractorsAction(undefined, (err) => {
      console.warn('Survey Setup contractors fetch error:', err);
    }) as any);
    dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point'], undefined, (err) => {
      console.warn('Survey Setup domains fetch error:', err);
    }) as any);
  }, [dispatch]);

  const selectedStateObj = states.find(s => s.state_name === stateName);
  const selectedDistrictObj = districts.find(d => d.district_name === district);

  const handleStateChange = (val: string | number) => {
    setStateName(String(val));
    setDistrict('');
    setBlock('');
    setVillage('');
    setContractor('');
    const stateObj = states.find(s => s.state_name === val);
    if (stateObj) {
      dispatch(fetchDistrictsAction(stateObj.id, undefined, (err) => {
        toast.error(err || 'Failed to fetch districts');
      }) as any);
    }
  };

  const handleDistrictChange = (val: string | number) => {
    setDistrict(String(val));
    setBlock('');
    setVillage('');
    setContractor('');
    if (selectedStateObj && selectedStateObj.id) {
      const distObj = districts.find(d => d.district_name === val);
      if (distObj) {
        dispatch(fetchBlocksAction(selectedStateObj.id, distObj.id, undefined, (err) => {
          toast.error(err || 'Failed to fetch blocks');
        }) as any);
      }
    }
  };

  const handleBlockChange = (val: string | number) => {
    setBlock(String(val));
    setVillage('');
    setContractor('');
    if (selectedStateObj && selectedStateObj.id && selectedDistrictObj && selectedDistrictObj.id) {
      const blockObj = blocks.find(b => b.block_name === val);
      if (blockObj) {
        dispatch(fetchVillagesAction(selectedStateObj.id, selectedDistrictObj.id, blockObj.id, undefined, (err) => {
          toast.error(err || 'Failed to fetch villages');
        }) as any);
      }
    }
  };

  const stateOptions = useMemo(() => states.map(s => ({ label: s.state_name, value: s.state_name })), [states]);
  const districtOptions = useMemo(() => districts.map(d => ({ label: d.district_name, value: d.district_name })), [districts]);
  const blockOptions = useMemo(() => blocks.map(b => ({ label: b.block_name, value: b.block_name })), [blocks]);
  const villageOptions = useMemo(() => villages.map(v => ({ label: v.village_name, value: v.village_name })), [villages]);
  const contractorOptions = useMemo(() => contractors.map(c => ({ label: c.contractor_name, value: c.contractor_name })), [contractors]);

  const typeOfWorkOptions = useMemo(() => {
    const types = domains['type_of_work'] || [];
    return types.map(t => ({ label: t.domain_desc || t.domain_value, value: t.domain_code }));
  }, [domains]);

  const ltStartingPointOptions = useMemo(() => {
    const pts = domains['lt_starting_point'] || [];
    return pts.map(p => ({ label: p.domain_desc || p.domain_value, value: p.domain_code }));
  }, [domains]);

  const handleStart = () => {
    if (!stateName || !district || !block || !village || !contractor || !lineType) {
      toast.warning('Complete every required survey detail before continuing.', { title: 'Details required' });
      return;
    }
    const lt440vCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'LT_440V')?.domain_code;
    
    if (lineType === lt440vCode && !ltStartingPoint) {
      toast.warning('Choose where the LT line starts.', { title: 'Starting point required' });
      return;
    }

    const getDomainValue = (type: string, code: any) => {
      if (!code) return '';
      const arr = domains[type] || [];
      const found = arr.find((d: any) => d.domain_code === code || d.domain_value === code);
      return found ? found.domain_value : code;
    };

    dispatch(startSurvey({
      id: `srv-${Date.now().toString(36)}`,
      workflowType: 'SURVEY',
      lineType: getDomainValue('type_of_work', lineType),
      ltStartingPoint: ltStartingPoint ? getDomainValue('lt_starting_point', ltStartingPoint) : undefined,
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
            onChange={handleStateChange}
          />
          <Dropdown
            label="DISTRICT"
            placeholder="Choose district"
            options={districtOptions}
            value={district}
            disabled={!stateName}
            onChange={handleDistrictChange}
          />
          <Dropdown
            label="BLOCK"
            placeholder="Choose block"
            options={blockOptions}
            value={block}
            disabled={!district}
            onChange={handleBlockChange}
          />
          <Dropdown
            label="VILLAGE"
            placeholder="Choose village"
            options={villageOptions}
            value={village}
            disabled={!block}
            onChange={value => {
              setVillage(String(value));
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
            onChange={(val) => setContractor(String(val))}
          />
          <Dropdown
            label="TYPE OF WORK"
            placeholder="Choose work type"
            options={typeOfWorkOptions}
            value={lineType}
            onChange={(val) => {
              setLineType(val as LineType);
              if (val !== lineType) setLtStartingPoint('');
            }}
          />
          {lineType !== '' && (
            <Dropdown
              label="LT LINE STARTING POINT"
              placeholder="Choose starting point"
              options={ltStartingPointOptions}
              value={ltStartingPoint || ''}
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
