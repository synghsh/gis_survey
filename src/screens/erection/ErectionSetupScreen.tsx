import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
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
import { startErectionAction, updateErectionAction } from '../../store/actions/erectionAction';
import { fetchStatesAction, fetchDistrictsAction, fetchBlocksAction, fetchVillagesAction, fetchContractorsAction, fetchDomainsAction } from '../../store/actions/masterAction';

type LineType = SurveyLine['lineType'];
type LtStartingPoint = SurveyLine['ltStartingPoint'];

const toOptions = (names: string[]): DropdownOption[] => names.map(name => ({ label: name, value: name }));

export default function ErectionSetupScreen({ route }: any) {
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
  const [feederName, setFeederName] = useState('');
  const [dtrCode, setDtrCode] = useState('');
  const [drawingNo, setDrawingNo] = useState('');
  const [loading, setLoading] = useState(false);

  const states = useSelector((state: RootState) => state.master.states);
  const districts = useSelector((state: RootState) => state.master.districts);
  const blocks = useSelector((state: RootState) => state.master.blocks);
  const villages = useSelector((state: RootState) => state.master.villages) || [];
  const contractors = useSelector((state: RootState) => state.master.contractors) || [];
  const domains = useSelector((state: RootState) => state.master.domains) || {};

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (route.params?.isEdit && route.params?.erectionItem && !isInitialized) {
      const item = route.params.erectionItem;
      setDrawingNo(item.drawing_no || '');
      setFeederName(item.feeder_name || '');
      setDtrCode(item.dtr_code || '');
      setStateName(item.state_name || '');
      setDistrict(item.district_name || item.district || '');
      setBlock(item.block_name || item.block || '');
      setVillage(item.village_name || item.village || '');
      setContractor(item.contractor_name || '');
      setRemarks(item.remarks || '');

      if (item.state_id) {
        dispatch(fetchDistrictsAction(item.state_id, undefined, () => { }) as any);
        if (item.district_id) {
          dispatch(fetchBlocksAction(item.state_id, item.district_id, undefined, () => { }) as any);
          if (item.block_id) {
            dispatch(fetchVillagesAction(item.state_id, item.district_id, item.block_id, undefined, () => { }) as any);
          }
        }
      }
      setIsInitialized(true);
    }
  }, [route.params, isInitialized, dispatch]);

  useEffect(() => {
    if (route.params?.isEdit && route.params?.erectionItem && domains['type_of_work']) {
      const item = route.params.erectionItem;
      const getDomainCode = (type: string, val: any) => {
        if (!val) return '';
        const arr = domains[type] || [];
        const found = arr.find((d: any) => d.domain_value === val || d.domain_code === val);
        return found ? found.domain_code : val;
      };
      setLineType(getDomainCode('type_of_work', item.type_of_work));
      setLtStartingPoint(getDomainCode('lt_starting_point', item.lt_starting_point));
    }
  }, [domains, route.params]);

  useEffect(() => {
    dispatch(fetchStatesAction(undefined, (err) => {
      toast.error(err || 'Failed to fetch states from server');
    }) as any);
    dispatch(fetchContractorsAction(undefined, (err) => {
      console.warn('Erection setup contractors fetch error:', err);
    }) as any);
    dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point'], undefined, (err) => {
      console.warn('Erection setup domains fetch error:', err);
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
    if (!drawingNo) {
      toast.warning('Drawing number is required.', { title: 'Required field' });
      return;
    }
    if (!stateName || !district || !block || !village || !contractor || !lineType) {
      toast.warning('Complete every required erection detail before continuing.', { title: 'Details required' });
      return;
    }
    const lt440vCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'LT_440V')?.domain_code;

    if (lineType === lt440vCode && !ltStartingPoint) {
      toast.warning('Choose where the LT line starts.', { title: 'Starting point required' });
      return;
    }

    setLoading(true);

    const selectedBlockObj = blocks.find(b => b.block_name === block);
    const selectedVillageObj = villages.find(v => v.village_name === village);
    const selectedContractorObj = contractors.find(c => c.contractor_name === contractor);

    const apiPayload = {
      feeder_name: feederName.trim() || null,
      dtr_code: dtrCode.trim() || null,
      drawing_no: drawingNo.trim(),
      state_name: stateName,
      district,
      block,
      village,
      state_id: selectedStateObj?.id || null,
      district_id: selectedDistrictObj?.id || null,
      block_id: selectedBlockObj?.id || null,
      village_id: selectedVillageObj?.id || null,
      contractor_id: selectedContractorObj?.id || null,
      contractor_name: contractor,
      type_of_work: lineType,
      lt_starting_point: ltStartingPoint ? ltStartingPoint : null,
      remarks: remarks.trim() || null,
    };

    const getDomainValue = (type: string, code: any) => {
      if (!code) return '';
      const arr = domains[type] || [];
      const found = arr.find((d: any) => d.domain_code === code || d.domain_value === code);
      return found ? found.domain_value : code;
    };

    const surveyPayload = {
      id: `erect-${Date.now().toString(36)}`,
      workflowType: 'ERECTION' as const,
      lineType: getDomainValue('type_of_work', lineType),
      ltStartingPoint: ltStartingPoint ? getDomainValue('lt_starting_point', ltStartingPoint) as LtStartingPoint : undefined,
      contractorName: contractor,
      remarks: remarks.trim(),
      stateName,
      district,
      block,
      village,
      location: village,
      feederName: feederName.trim() || undefined,
      dtrCode: dtrCode.trim() || undefined,
      drawingNo: drawingNo.trim(),
    };

    if (route.params?.isEdit) {
      const updatePayload = {
        id: route.params.erectionItem.id,
        ...apiPayload,
      };
      dispatch(updateErectionAction(
        updatePayload,
        () => {
          setLoading(false);
          toast.success('Erection details updated successfully.');
          navigation.goBack();
        },
        (errorMsg) => {
          setLoading(false);
          toast.error(errorMsg, { title: 'Update failed' });
        }
      ) as any);
      return;
    }

    dispatch(startErectionAction(
      apiPayload,
      surveyPayload,
      () => {
        setLoading(false);
        toast.success('Erection execution started successfully.');
        navigation.replace('ActiveSurvey');
      },
      (errorMsg) => {
        setLoading(false);
        toast.error(errorMsg, { title: 'Execution failed' });
      }
    ) as any);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>&lt;</Text>
        </TouchableOpacity>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>{route.params?.isEdit ? 'EDIT ERECTION DETAILS' : 'NEW ERECTION EXECUTION'}</Text>
          <Text style={styles.headerSubtitle}>PROJECT LOCATION & ASSIGNMENT</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PROJECT INFORMATION</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>11 KV EXISTING FEEDER NAME</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter feeder name"
              placeholderTextColor="#94A3B8"
              value={feederName}
              onChangeText={setFeederName}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>EXISTING DTR CODE</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter DTR code"
              placeholderTextColor="#94A3B8"
              value={dtrCode}
              onChangeText={setDtrCode}
              editable={!loading}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>DRAWING NO. (MANDATORY)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter drawing number"
              placeholderTextColor="#94A3B8"
              value={drawingNo}
              onChangeText={setDrawingNo}
              editable={!loading}
            />
          </View>

          <Dropdown
            label="STATE NAME"
            placeholder="Choose state"
            options={stateOptions}
            value={stateName}
            disabled={loading}
            onChange={handleStateChange}
          />
          <Dropdown
            label="DISTRICT"
            placeholder="Choose district"
            options={districtOptions}
            value={district}
            disabled={loading || !stateName}
            onChange={handleDistrictChange}
          />
          <Dropdown
            label="BLOCK"
            placeholder="Choose block"
            options={blockOptions}
            value={block}
            disabled={loading || !district}
            onChange={handleBlockChange}
          />
          <Dropdown
            label="VILLAGE"
            placeholder="Choose village"
            options={villageOptions}
            value={village}
            disabled={loading || !block}
            onChange={value => {
              setVillage(String(value));
              setContractor('');
            }}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>EXECUTION DETAILS</Text>
          <Dropdown
            label="CONTRACTOR / FIRM NAME"
            placeholder="Choose contractor or firm"
            options={contractorOptions}
            value={contractor}
            disabled={loading || !village}
            onChange={(val) => setContractor(String(val))}
          />
          <Dropdown
            label="TYPE OF WORK"
            options={typeOfWorkOptions}
            value={lineType}
            onChange={(val) => {
              setLineType(val as LineType);
              if (val !== lineType) setLtStartingPoint(''); // Reset LT start on change
            }}
          />

          {lineType !== '' && (
            <View style={styles.fieldContainer}>
              <Dropdown
                label="LT LINE STARTING POINT"
                options={ltStartingPointOptions}
                value={ltStartingPoint || ''}
                onChange={(val) => setLtStartingPoint(val as LtStartingPoint)}
              />
            </View>
          )}<Text style={styles.fieldLabel}>SITE DESCRIPTION / REMARKS</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Execution notes, alignment, site access..."
            placeholderTextColor="#94A3B8"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
            editable={!loading}
          />
        </View>

        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.startButtonText}>{route.params?.isEdit ? 'SAVE UPDATES' : 'START ERECTION EXECUTION'}</Text>
          )}
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
  fieldContainer: { marginBottom: 16 },
  textInput: {
    minHeight: 48,
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.20)',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
    fontSize: 13,
  },
  startButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
});
