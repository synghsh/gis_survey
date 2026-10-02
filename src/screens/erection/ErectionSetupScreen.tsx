import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, ImageBackground } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const iconPalette: Record<string, [string, string]> = {
  bolt: ['#E5F6FF', '#24BBF6'], transformer: ['#F2ECFF', '#A24AF8'], document: ['#E6F5FF', '#2275FF'], map: ['#E5F9F0', '#18AF73'], district: ['#FFF0F5', '#FA4586'], block: ['#F3EDFF', '#9946F4'], home: ['#FFF2E8', '#FF7938'], people: ['#FFF3EB', '#FF7938'], list: ['#E4F8EF', '#13AD6A'], pin: ['#F1ECFF', '#9346EF'], remarks: ['#FFF0F5', '#F74983'],
};
const iconPaths: Record<string, string> = {
  bolt: 'M14 2L5 14H11L10 23L20 10H13Z', transformer: 'M5 8H20V22H5ZM8 3V8M12 3V8M17 3V8M8 12V17M12 12V17M17 12V17M3 22H22', document: 'M6 2H15L21 8V23H6ZM15 2V8H21M9 12H17M9 16H17M9 20H14', map: 'M3 9L9 6L15 9L21 6V21L15 24L9 21L3 24ZM9 6V21M15 9V24', district: 'M3 23V7H10V3H17V23M17 11H22V23M1 23H24M6 11V13M6 17V19M13 7V9M13 12V14M13 17V19M20 15V18', block: 'M3 23V7H10V3H17V23M17 11H22V23M1 23H24M6 11V13M6 17V19M13 7V9M13 12V14M13 17V19M20 15V18', home: 'M2 12L12 3L23 12M5 10V23H10V16H15V23H20V10', people: 'M8 12C2 12 2 20 2 22H14C14 20 14 12 8 12ZM18 12C23 13 24 18 24 22H17', list: 'M9 5H22M9 12H22M9 19H22M3 4H5V6H3ZM3 11H5V13H3ZM3 18H5V20H3Z', pin: 'M12 23C10 19 4 13 4 9C4 -1 20 -1 20 9C20 13 14 19 12 23Z', remarks: 'M3 3H22V19H10L3 24ZM7 8H18M7 12H18M7 16H14',
};
function FormField({ icon, half = false, children }: { icon: string; half?: boolean; children: React.ReactNode }) {
  const [background, color] = iconPalette[icon];
  return <View style={[styles.formRow, half && styles.halfField]}><View style={[styles.fieldIcon, { backgroundColor: background }]}><Svg width={24} height={26} viewBox="0 0 26 27" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round"><Path d={iconPaths[icon]} />{icon === 'pin' && <Circle cx="12" cy="9" r="3" fill={color} />}{icon === 'people' && <><Circle cx="8" cy="6" r="4" /><Circle cx="18" cy="6" r="4" /></>}</Svg></View><View style={styles.fieldCopy}>{children}</View></View>;
}
function SectionBanner({ kind, title, subtitle }: { kind: 'project' | 'execution'; title: string; subtitle: string }) {
  return <View style={styles.sectionBanner}>
    <ImageBackground source={kind === 'project' ? require('../../../assets/erection-project-banner.png') : require('../../../assets/erection-execution-banner.png')} style={StyleSheet.absoluteFill} resizeMode="stretch" />
    <View style={styles.bannerIcon}><Svg width={36} height={36} viewBox="0 0 40 40"><Defs><LinearGradient id={`banner-${kind}`} x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0%" stopColor="#47E0FF" /><Stop offset="60%" stopColor="#7654FF" /><Stop offset="100%" stopColor="#D343F9" /></LinearGradient></Defs><Circle cx="20" cy="20" r="19" fill={`url(#banner-${kind})`} stroke="#B7D5FF" />{kind === 'project' ? <><Path d="M20 31C18 27 12 22 12 17C12 6 28 6 28 17C28 22 22 27 20 31Z" fill="white" /><Circle cx="20" cy="17" r="3" fill="#9562FF" /></> : <Path d="M20 11V8M20 32V29M11 20H8M32 20H29M14 14L11 11M29 29L26 26M14 26L11 29M29 11L26 14M20 12A8 8 0 1 0 20 28A8 8 0 1 0 20 12Z" stroke="white" strokeWidth="4" fill="none" />}</Svg></View>
    <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionSubtitle}>{subtitle}</Text></View>
  </View>;
}

export default function ErectionSetupScreen({ route }: any) {
  const insets = useSafeAreaInsets();
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
        const rawArr = domains[type];
        const arr = Array.isArray(rawArr) ? rawArr : [];
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
    const rawTypes = domains['type_of_work'];
    const types = Array.isArray(rawTypes) ? rawTypes : [];
    return types.map(t => ({ label: t.domain_desc || t.domain_value, value: t.domain_code }));
  }, [domains]);

  const ltStartingPointOptions = useMemo(() => {
    const rawPts = domains['lt_starting_point'];
    const pts = Array.isArray(rawPts) ? rawPts : [];
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
    const rawTypeOfWork = domains['type_of_work'];
    const lt440vCode = Array.isArray(rawTypeOfWork) ? rawTypeOfWork.find((d: any) => d.domain_value === 'LT_440V')?.domain_code : undefined;

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
      const rawArr = domains[type];
      const arr = Array.isArray(rawArr) ? rawArr : [];
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]} keyboardShouldPersistTaps="handled">
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none"><ImageBackground source={require('../../../assets/erection-details-hero.png')} style={StyleSheet.absoluteFill} resizeMode="stretch" /></View>
          <TouchableOpacity accessibilityLabel="Go back" style={styles.backButton} onPress={() => navigation.goBack()}><Text style={styles.backText}>{"\u2039"}</Text></TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>{route.params?.isEdit ? 'Edit Erection ' : 'New Erection '}<Text style={styles.headerAccent}>{route.params?.isEdit ? 'Details' : 'Execution'}</Text></Text>
            <Text style={styles.headerSubtitle}>Project location & assignment</Text>
          </View>
        </View>
        <View style={styles.formContent}>
          <View style={[styles.section, { marginTop: -22 }]}>
            <SectionBanner kind="project" title="Project Information" subtitle="Location and project basic details" />
            <View style={styles.sectionBody}>
<FormField icon="bolt">          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>11 KV Existing Feeder Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter feeder name"
              placeholderTextColor="#94A3B8"
              value={feederName}
              onChangeText={setFeederName}
              editable={!loading}
            />
          </View></FormField>
<FormField icon="transformer">          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Existing DTR Code</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter DTR code"
              placeholderTextColor="#94A3B8"
              value={dtrCode}
              onChangeText={setDtrCode}
              editable={!loading}
            />
          </View></FormField>
<FormField icon="document">          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Drawing No. <Text style={{ color: '#1677FF' }}>(Mandatory)</Text></Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: '#EFF8FF' }]}
              placeholder="Enter drawing number"
              placeholderTextColor="#94A3B8"
              value={drawingNo}
              onChangeText={setDrawingNo}
              editable={!loading}
            />
          </View></FormField>
              <View style={styles.locationGrid}>
<FormField icon="map" half>          <Dropdown
            appearance="erection"
            label="State Name"
            placeholder="Choose state"
            options={stateOptions}
            value={stateName}
            disabled={loading}
            onChange={handleStateChange}
          /></FormField>
<FormField icon="district" half>          <Dropdown
            appearance="erection"
            label="District"
            placeholder="Choose district"
            options={districtOptions}
            value={district}
            disabled={loading || !stateName}
            onChange={handleDistrictChange}
          /></FormField>
<FormField icon="block" half>          <Dropdown
            appearance="erection"
            label="Block"
            placeholder="Choose block"
            options={blockOptions}
            value={block}
            disabled={loading || !district}
            onChange={handleBlockChange}
          /></FormField>
<FormField icon="home" half>          <Dropdown
            appearance="erection"
            label="Village"
            placeholder="Choose village"
            options={villageOptions}
            value={village}
            disabled={loading || !block}
            onChange={value => {
              setVillage(String(value));
              setContractor('');
            }}
          /></FormField>
              </View>
              <View style={styles.locationInfo}><View style={styles.infoIcon}><Text style={styles.infoIconText}>i</Text></View><Text style={styles.locationInfoText}>Project location helps in uniquely identifying this erection work and links it with GIS mapping.</Text></View>
            </View>
          </View>
          <View style={styles.section}>
            <SectionBanner kind="execution" title="Execution Details" subtitle="Contractor, work type and execution information" />
            <View style={styles.sectionBody}>
<FormField icon="people">          <Dropdown
            appearance="erection"
            label="Contractor / Firm Name"
            placeholder="Choose contractor or firm"
            options={contractorOptions}
            value={contractor}
            disabled={loading || !village}
            onChange={(val) => setContractor(String(val))}
          /></FormField>
<FormField icon="list">          <Dropdown
            appearance="erection"
            label="Type of Work"
            options={typeOfWorkOptions}
            value={lineType}
            onChange={(val) => {
              setLineType(val as LineType);
              if (val !== lineType) setLtStartingPoint(''); // Reset LT start on change
            }}
          /></FormField>
          {lineType !== '' && (
            <FormField icon="pin">
              <Dropdown
            appearance="erection"
                label="LT Line Starting Point"
                options={ltStartingPointOptions}
                value={ltStartingPoint || ''}
                onChange={(val) => setLtStartingPoint(val as LtStartingPoint)}
              />
            </FormField>
          )}
<FormField icon="remarks"><Text style={styles.fieldLabel}>Site Description / Remarks</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Execution notes, alignment, site access..."
            placeholderTextColor="#94A3B8"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
            editable={!loading}
          /></FormField>
              <Text style={styles.characterCount}>{remarks.length} characters</Text>
            </View>
            <View style={styles.saveArea}>
        <TouchableOpacity
          style={[styles.startButton, loading && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={loading}
          activeOpacity={0.8}
        >
          {!loading && <View style={[StyleSheet.absoluteFill, { borderRadius: 13, overflow: 'hidden' }]} pointerEvents="none"><Svg width="100%" height="100%"><Defs><LinearGradient id="setupSave" x1="0%" y1="100%" x2="100%" y2="0%"><Stop offset="0%" stopColor="#007AFF" /><Stop offset="50%" stopColor="#414EFF" /><Stop offset="100%" stopColor="#B332F5" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#setupSave)" /></Svg></View>}
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Svg width={21} height={23} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinejoin="round"><Path d="M3 2H18L22 6V22H3ZM7 2V9H17V2M7 22V14H18V22M13 4V7" /></Svg>
              <Text style={styles.startButtonText}>{route.params?.isEdit ? 'Save Updates' : 'Save Erection Details'}</Text>
            </View>
          )}
        </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FF' }, content: { paddingBottom: 20 },
  header: { minHeight: 170, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingBottom: 38, overflow: 'hidden' },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 12 }, backText: { color: '#1671FF', fontSize: 32, lineHeight: 35 }, headerCopy: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 27, fontWeight: '800' }, headerAccent: { color: '#C4A8FC' }, headerSubtitle: { color: '#D4EBFF', fontSize: 12, lineHeight: 17, marginTop: 4 }, formContent: { paddingHorizontal: 16 },
  section: { backgroundColor: '#FCFEFF', borderWidth: 1, borderColor: '#DCEAFF', borderRadius: 20, padding: 6, marginBottom: 12, shadowColor: '#6FA8D4', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 3 },
  sectionBanner: { minHeight: 64, borderRadius: 13, overflow: 'hidden', backgroundColor: '#367BFF', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 9, gap: 10 }, bannerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }, sectionTitle: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '800' }, sectionSubtitle: { color: '#E9F3FF', fontSize: 10.5, lineHeight: 15, marginTop: 3 }, sectionBody: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 7 },
  formRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginBottom: 12 }, halfField: { width: '48%' }, fieldIcon: { width: 34, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, fieldCopy: { flex: 1, minWidth: 0 }, fieldContainer: { marginBottom: 0 }, fieldLabel: { color: '#52628F', fontSize: 10.5, lineHeight: 15, fontWeight: '600', marginBottom: 4 },
  textInput: { minHeight: 40, borderWidth: 1, borderColor: '#CFD7EE', borderRadius: 7, paddingHorizontal: 10, backgroundColor: '#FCFEFF', color: '#1E2952', fontSize: 12 }, locationGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  locationInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#ECF3FF', borderWidth: 1, borderColor: '#E0ECFF', borderRadius: 13, marginBottom: 1 }, infoIcon: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#267AFF', alignItems: 'center', justifyContent: 'center' }, infoIconText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, locationInfoText: { flex: 1, color: '#7C95CC', fontSize: 10.5, lineHeight: 15 },
  remarksInput: { minHeight: 76, borderWidth: 1, borderColor: '#CFD7EE', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 9, backgroundColor: '#FCFEFF', color: '#1E2952', fontSize: 12, textAlignVertical: 'top' }, characterCount: { textAlign: 'right', color: '#98A6C5', fontSize: 9, marginTop: -7, marginBottom: 4 },
  saveArea: { padding: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EDF5FF' }, startButton: { minHeight: 46, borderRadius: 13, backgroundColor: '#1677FF', alignItems: 'center', justifyContent: 'center', shadowColor: '#725DF1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 3 }, startButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' }, startButtonDisabled: { backgroundColor: '#94A3B8' },
});
