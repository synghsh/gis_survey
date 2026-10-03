import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ImageBackground,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown, { DropdownOption } from '../../components/Dropdown';
import { useToast } from '../../components/ToastProvider';
import { startSurvey, SurveyLine, RootState } from '../../store';
import {
  fetchStatesAction,
  fetchDistrictsAction,
  fetchBlocksAction,
  fetchVillagesAction,
  fetchContractorsAction,
  fetchDomainsAction,
} from '../../store/actions/masterAction';

type LineType = SurveyLine['lineType'];
type LtStartingPoint = SurveyLine['ltStartingPoint'];

const iconPalette: Record<string, [string, string]> = {
  map: ['#E5F9F0', '#18AF73'],
  district: ['#FFF0F5', '#FA4586'],
  block: ['#F3EDFF', '#9946F4'],
  home: ['#FFF2E8', '#FF7938'],
  people: ['#FFF3EB', '#FF7938'],
  list: ['#E4F8EF', '#13AD6A'],
  pin: ['#F1ECFF', '#9346EF'],
  remarks: ['#FFF0F5', '#F74983'],
};

const iconPaths: Record<string, string> = {
  map: 'M3 9L9 6L15 9L21 6V21L15 24L9 21L3 24ZM9 6V21M15 9V24',
  district: 'M3 23V7H10V3H17V23M17 11H22V23M1 23H24M6 11V13M6 17V19M13 7V9M13 12V14M13 17V19M20 15V18',
  block: 'M3 23V7H10V3H17V23M17 11H22V23M1 23H24M6 11V13M6 17V19M13 7V9M13 12V14M13 17V19M20 15V18',
  home: 'M2 12L12 3L23 12M5 10V23H10V16H15V23H20V10',
  people: 'M8 12C2 12 2 20 2 22H14C14 20 14 12 8 12ZM18 12C23 13 24 18 24 22H17',
  list: 'M9 5H22M9 12H22M9 19H22M3 4H5V6H3ZM3 11H5V13H3ZM3 18H5V20H3Z',
  pin: 'M12 23C10 19 4 13 4 9C4 -1 20 -1 20 9C20 13 14 19 12 23Z',
  remarks: 'M3 3H22V19H10L3 24ZM7 8H18M7 12H18M7 16H14',
};

function FormField({ icon, half = false, children }: { icon: string; half?: boolean; children: React.ReactNode }) {
  const [background, color] = iconPalette[icon] || ['#F0F4FA', '#2B66B1'];
  return (
    <View style={[styles.formRow, half && styles.halfField]}>
      <View style={[styles.fieldIcon, { backgroundColor: background }]}>
        <Svg width={24} height={26} viewBox="0 0 26 27" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <Path d={iconPaths[icon]} />
          {icon === 'pin' && <Circle cx="12" cy="9" r="3" fill={color} />}
          {icon === 'people' && (
            <>
              <Circle cx="8" cy="6" r="4" />
              <Circle cx="18" cy="6" r="4" />
            </>
          )}
        </Svg>
      </View>
      <View style={styles.fieldCopy}>{children}</View>
    </View>
  );
}

function SectionBanner({ kind, title, subtitle }: { kind: 'project' | 'execution'; title: string; subtitle: string }) {
  return (
    <View style={styles.sectionBanner}>
      <ImageBackground
        source={kind === 'project' ? require('../../../assets/erection-project-banner.png') : require('../../../assets/erection-execution-banner.png')}
        style={StyleSheet.absoluteFill}
        resizeMode="stretch"
      />
      <View style={styles.bannerIcon}>
        <Svg width={36} height={36} viewBox="0 0 40 40">
          <Defs>
            <LinearGradient id={`banner-${kind}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#47E0FF" />
              <Stop offset="60%" stopColor="#7654FF" />
              <Stop offset="100%" stopColor="#D343F9" />
            </LinearGradient>
          </Defs>
          <Circle cx="20" cy="20" r="19" fill={`url(#banner-${kind})`} stroke="#B7D5FF" />
          {kind === 'project' ? (
            <>
              <Path d="M20 31C18 27 12 22 12 17C12 6 28 6 28 17C28 22 22 27 20 31Z" fill="white" />
              <Circle cx="20" cy="17" r="3" fill="#9562FF" />
            </>
          ) : (
            <Path
              d="M20 11V8M20 32V29M11 20H8M32 20H29M14 14L11 11M29 29L26 26M14 26L11 29M29 11L26 14M20 12A8 8 0 1 0 20 28A8 8 0 1 0 20 12Z"
              stroke="white"
              strokeWidth="4"
              fill="none"
            />
          )}
        </Svg>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export default function SurveySetupScreen() {
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
    dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point', 'structure_condition', 'cond_phase'], undefined, (err) => {
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
    if (!stateName || !district || !block || !village || !contractor || !lineType) {
      toast.warning('Complete every required survey detail before continuing.', { title: 'Details required' });
      return;
    }
    const rawTypeOfWork = domains['type_of_work'];
    const lt440vCode = Array.isArray(rawTypeOfWork) ? rawTypeOfWork.find((d: any) => d.domain_value === 'LT_440V')?.domain_code : undefined;

    if (lineType === lt440vCode && !ltStartingPoint) {
      toast.warning('Choose where the LT line starts.', { title: 'Starting point required' });
      return;
    }

    const getDomainValue = (type: string, code: any) => {
      if (!code) return '';
      const rawArr = domains[type];
      const arr = Array.isArray(rawArr) ? rawArr : [];
      const found = arr.find((d: any) => d.domain_code === code || d.domain_value === code);
      return found ? found.domain_value : code;
    };

    dispatch(startSurvey({
      id: `srv-${Date.now().toString(36)}`,
      workflowType: 'SURVEY',
      lineType: getDomainValue('type_of_work', lineType),
      ltStartingPoint: ltStartingPoint ? (getDomainValue('lt_starting_point', ltStartingPoint) as LtStartingPoint) : undefined,
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
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* HERO BANNER HEADER */}
        <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ImageBackground
              source={require('../../../assets/erection-details-hero.png')}
              style={StyleSheet.absoluteFill}
              resizeMode="stretch"
            />
          </View>
          <TouchableOpacity
            accessibilityLabel="Go back"
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backText}>{"\u2039"}</Text>
          </TouchableOpacity>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>
              New Survey <Text style={styles.headerAccent}>Run</Text>
            </Text>
            <Text style={styles.headerSubtitle}>Project location & corridor setup</Text>
          </View>
        </View>

        <View style={styles.formContent}>
          {/* SECTION 1: LOCATION HIERARCHY */}
          <View style={[styles.section, { marginTop: -22 }]}>
            <SectionBanner
              kind="project"
              title="Location Hierarchy"
              subtitle="Administrative location details"
            />
            <View style={styles.sectionBody}>
              <View style={styles.locationGrid}>
                <FormField icon="map" half>
                  <Dropdown
                    appearance="erection"
                    label="State Name"
                    placeholder="Choose state"
                    options={stateOptions}
                    value={stateName}
                    onChange={handleStateChange}
                  />
                </FormField>

                <FormField icon="district" half>
                  <Dropdown
                    appearance="erection"
                    label="District"
                    placeholder="Choose district"
                    options={districtOptions}
                    value={district}
                    disabled={!stateName}
                    onChange={handleDistrictChange}
                  />
                </FormField>

                <FormField icon="block" half>
                  <Dropdown
                    appearance="erection"
                    label="Block"
                    placeholder="Choose block"
                    options={blockOptions}
                    value={block}
                    disabled={!district}
                    onChange={handleBlockChange}
                  />
                </FormField>

                <FormField icon="home" half>
                  <Dropdown
                    appearance="erection"
                    label="Village"
                    placeholder="Choose village"
                    options={villageOptions}
                    value={village}
                    disabled={!block}
                    onChange={(value) => {
                      setVillage(String(value));
                      setContractor('');
                    }}
                  />
                </FormField>
              </View>

              <View style={styles.locationInfo}>
                <View style={styles.infoIcon}>
                  <Text style={styles.infoIconText}>i</Text>
                </View>
                <Text style={styles.locationInfoText}>
                  Project location helps in uniquely identifying this survey run and links it with GIS mapping.
                </Text>
              </View>
            </View>
          </View>

          {/* SECTION 2: SURVEY ASSIGNMENT */}
          <View style={styles.section}>
            <SectionBanner
              kind="execution"
              title="Survey Assignment"
              subtitle="Contractor, work type and corridor remarks"
            />
            <View style={styles.sectionBody}>
              <FormField icon="people">
                <Dropdown
                  appearance="erection"
                  label="Contractor / Firm Name"
                  placeholder="Choose contractor or firm"
                  options={contractorOptions}
                  value={contractor}
                  disabled={!village}
                  onChange={(val) => setContractor(String(val))}
                />
              </FormField>

              <FormField icon="list">
                <Dropdown
                  appearance="erection"
                  label="Type of Work"
                  placeholder="Choose work type"
                  options={typeOfWorkOptions}
                  value={lineType}
                  onChange={(val) => {
                    setLineType(val as LineType);
                    if (val !== lineType) setLtStartingPoint('');
                  }}
                />
              </FormField>

              {lineType !== '' && (
                <FormField icon="pin">
                  <Dropdown
                    appearance="erection"
                    label="LT Line Starting Point"
                    placeholder="Choose starting point"
                    options={ltStartingPointOptions}
                    value={ltStartingPoint || ''}
                    onChange={(value) => setLtStartingPoint(value as LtStartingPoint)}
                  />
                </FormField>
              )}

              <FormField icon="remarks">
                <Text style={styles.fieldLabel}>Site Description / Remarks</Text>
                <TextInput
                  style={styles.remarksInput}
                  placeholder="Execution notes, alignment, site access..."
                  placeholderTextColor="#94A3B8"
                  value={remarks}
                  onChangeText={setRemarks}
                  multiline
                  numberOfLines={4}
                />
              </FormField>
              <Text style={styles.characterCount}>{remarks.length} characters</Text>
            </View>

            {/* ACTION BUTTON */}
            <View style={styles.saveArea}>
              <TouchableOpacity
                style={styles.startButton}
                onPress={handleStart}
                activeOpacity={0.8}
              >
                <View style={[StyleSheet.absoluteFill, { borderRadius: 13, overflow: 'hidden' }]} pointerEvents="none">
                  <Svg width="100%" height="100%">
                    <Defs>
                      <LinearGradient id="setupSave" x1="0%" y1="100%" x2="100%" y2="0%">
                        <Stop offset="0%" stopColor="#007AFF" />
                        <Stop offset="50%" stopColor="#414EFF" />
                        <Stop offset="100%" stopColor="#B332F5" />
                      </LinearGradient>
                    </Defs>
                    <Rect width="100%" height="100%" fill="url(#setupSave)" />
                  </Svg>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Svg width={21} height={23} viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M12 2v20M5 7h14M7 12h10M9 17h6" />
                  </Svg>
                  <Text style={styles.startButtonText}>START LINE SURVEY</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F0F9FF' },
  content: { paddingBottom: 20 },
  header: {
    minHeight: 170,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingBottom: 38,
    overflow: 'hidden',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: { color: '#1671FF', fontSize: 32, lineHeight: 35 },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 27, fontWeight: '800' },
  headerAccent: { color: '#C4A8FC' },
  headerSubtitle: { color: '#D4EBFF', fontSize: 12, lineHeight: 17, marginTop: 4 },
  formContent: { paddingHorizontal: 16 },
  section: {
    backgroundColor: '#FCFEFF',
    borderWidth: 1,
    borderColor: '#DCEAFF',
    borderRadius: 20,
    padding: 6,
    marginBottom: 12,
    shadowColor: '#6FA8D4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionBanner: {
    minHeight: 64,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: '#367BFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 10,
  },
  bannerIcon: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, lineHeight: 20, fontWeight: '800' },
  sectionSubtitle: { color: '#E9F3FF', fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  sectionBody: { paddingHorizontal: 8, paddingTop: 12, paddingBottom: 7 },
  formRow: { flexDirection: 'row', gap: 9, alignItems: 'flex-start', marginBottom: 12 },
  halfField: { width: '48%' },
  fieldIcon: { width: 34, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fieldCopy: { flex: 1, minWidth: 0 },
  fieldLabel: { color: '#52628F', fontSize: 10.5, lineHeight: 15, fontWeight: '600', marginBottom: 4 },
  locationGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#ECF3FF',
    borderWidth: 1,
    borderColor: '#E0ECFF',
    borderRadius: 13,
    marginBottom: 1,
  },
  infoIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#267AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  locationInfoText: { flex: 1, color: '#7C95CC', fontSize: 10.5, lineHeight: 15 },
  remarksInput: {
    minHeight: 76,
    borderWidth: 1,
    borderColor: '#CFD7EE',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 9,
    backgroundColor: '#FCFEFF',
    color: '#1E2952',
    fontSize: 12,
    textAlignVertical: 'top',
  },
  characterCount: { textAlign: 'right', color: '#98A6C5', fontSize: 9, marginTop: -7, marginBottom: 4 },
  saveArea: { padding: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#EDF5FF' },
  startButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: '#1677FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#725DF1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 3,
  },
  startButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
