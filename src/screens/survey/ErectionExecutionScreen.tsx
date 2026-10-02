import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path, Circle, Line } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, SurveyLine, startSurvey, injectHistoryLine } from '../../store';
import { useToast } from '../../components/ToastProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';
import Dropdown, { DropdownOption } from '../../components/Dropdown';
import {
  ERECTION_LINE_TYPES,
  ERECTION_LOCATION_DATA,
  LT_STARTING_POINT_OPTIONS,
} from '../../data/erectionSetupData';
import {
  fetchErectionListAction,
  updateErectionAction,
  completeErectionAction,
} from '../../store/actions/erectionAction';
import {
  fetchStatesAction,
  fetchDistrictsAction,
  fetchBlocksAction,
  fetchVillagesAction,
  fetchContractorsAction,
  fetchDomainsAction,
} from '../../store/actions/masterAction';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LineType = SurveyLine['lineType'];
type LtStartingPoint = NonNullable<SurveyLine['ltStartingPoint']>;

const toOptions = (names: string[]): DropdownOption[] => names.map(name => ({ label: name, value: name }));

export default function ErectionExecutionScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const toast = useToast();

  const erectionList = useSelector((state: RootState) => state.survey.erectionList) || [];
  const states = useSelector((state: RootState) => state.master.states) || [];
  const districts = useSelector((state: RootState) => state.master.districts) || [];
  const blocks = useSelector((state: RootState) => state.master.blocks) || [];
  const villages = useSelector((state: RootState) => state.master.villages) || [];
  const contractors = useSelector((state: RootState) => state.master.contractors) || [];
  const domains = useSelector((state: RootState) => state.master.domains) || {};
  console.log("domains", domains);


  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 'HT_11KV' | 'HT_33KV' | 'LT_440V'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(false);

  // Edit Modal States
  const [editingErection, setEditingErection] = useState<any | null>(null);
  const [drawingNo, setDrawingNo] = useState('');
  const [feederName, setFeederName] = useState('');
  const [dtrCode, setDtrCode] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  const [village, setVillage] = useState('');
  const [contractor, setContractor] = useState('');
  const [lineType, setLineType] = useState<LineType | ''>('');
  const [ltStartingPoint, setLtStartingPoint] = useState<LtStartingPoint | ''>('');
  const [remarks, setRemarks] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [viewingErection, setViewingErection] = useState<any | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Load Erection List on Focus
  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      dispatch(fetchErectionListAction(
        () => setLoading(false),
        (err) => {
          setLoading(false);
          toast.error(err || 'Failed to fetch erections from server');
        }
      ) as any);
    }, [dispatch])
  );

  // Fetch States once on mount
  useEffect(() => {
    dispatch(fetchStatesAction(undefined, (err) => {
      console.warn('Erection screen master states fetch error:', err);
    }) as any);
    dispatch(fetchContractorsAction(undefined, (err) => {
      console.warn('Erection screen contractors fetch error:', err);
    }) as any);
    dispatch(fetchDomainsAction(['type_of_work', 'lt_starting_point'], undefined, (err) => {
      console.warn('Erection screen domains fetch error:', err);
    }) as any);
  }, [dispatch]);

  // Derived selections for Edit Dropdowns
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

  // Open Edit Modal
  const handleOpenEditModal = (item: any) => {
    setEditingErection(item);
    setDrawingNo(item.drawing_no || '');
    setFeederName(item.feeder_name || '');
    setDtrCode(item.dtr_code || '');
    setStateName(item.state_name || '');
    setDistrict(item.district || '');
    setBlock(item.block || '');
    setVillage(item.village || '');
    setContractor(item.contractor_name || '');
    const getDomainCode = (type: string, val: any) => {
      if (!val) return '';
      const rawArr = domains[type];
      const arr = Array.isArray(rawArr) ? rawArr : [];
      const found = arr.find((d: any) => d.domain_value === val || d.domain_code === val);
      return found ? found.domain_code : val;
    };

    setLineType(getDomainCode('type_of_work', item.type_of_work));
    setLtStartingPoint(getDomainCode('lt_starting_point', item.lt_starting_point));
    setRemarks(item.remarks || '');

    // Fire master updates for current selected fields
    if (item.state_id) {
      dispatch(fetchDistrictsAction(item.state_id, undefined, () => { }) as any);
      if (item.district_id) {
        dispatch(fetchBlocksAction(item.state_id, item.district_id, undefined, () => { }) as any);
        if (item.block_id) {
          dispatch(fetchVillagesAction(item.state_id, item.district_id, item.block_id, undefined, () => { }) as any);
        }
      }
    }
  };

  // Save Edit Updates
  const handleSaveUpdates = () => {
    if (!drawingNo) {
      toast.warning('Drawing number is required.', { title: 'Required field' });
      return;
    }
    if (!stateName || !district || !block || !village || !contractor || !lineType) {
      toast.warning('Complete every required erection detail before saving.', { title: 'Details required' });
      return;
    }
    const rawTypeOfWork = domains['type_of_work'];
    const lt440vCode = Array.isArray(rawTypeOfWork) ? rawTypeOfWork.find((d: any) => d.domain_value === 'LT_440V')?.domain_code : undefined;

    if (lineType === lt440vCode && !ltStartingPoint) {
      toast.warning('Choose where the LT line starts.', { title: 'Starting point required' });
      return;
    }

    const selectedBlockObj = blocks.find(b => b.block_name === block);
    const selectedVillageObj = villages.find(v => v.village_name === village);
    const selectedContractorObj = contractors.find(c => c.contractor_name === contractor);

    setEditLoading(true);
    const updatePayload = {
      id: editingErection.id,
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
      lt_starting_point: lineType === lt440vCode ? ltStartingPoint : null,
      remarks: remarks.trim() || null,
    };

    dispatch(updateErectionAction(
      updatePayload,
      () => {
        setEditLoading(false);
        setEditingErection(null);
        toast.success('Erection updated successfully.');
        dispatch(fetchErectionListAction() as any);
      },
      (err) => {
        setEditLoading(false);
        toast.error(err || 'Failed to update erection');
      }
    ) as any);
  };

  // Complete Erection Execution
  const handleCompleteClick = (id: number) => {
    setLoading(true);
    dispatch(completeErectionAction(
      id,
      () => {
        toast.success('Erection execution completed successfully.');
        dispatch(fetchErectionListAction(
          () => setLoading(false),
          () => setLoading(false)
        ) as any);
      },
      (err) => {
        setLoading(false);
        toast.error(err || 'Failed to complete erection');
      }
    ) as any);
  };

  // Edit Basic Details Screen Navigation
  const handleEditBasicDetails = (item: any) => {
    navigation.navigate('ErectionSetup', { isEdit: true, erectionItem: item });
  };

  // Launch Active Survey Mapping flow for this Erection
  const handleUpdateErectionsClick = (item: any) => {
    const surveyId = `erect-${item.id}`;

    // If any data is saved against this erection, open the summary details page
    if (item.nodes && Array.isArray(item.nodes) && item.nodes.length > 0) {
      const surveyLine: SurveyLine = {
        id: surveyId,
        workflowType: 'ERECTION',
        drawingNo: item.drawing_no,
        lineType: item.type_of_work,
        ltStartingPoint: item.lt_starting_point,
        contractorName: item.contractor_name,
        remarks: item.remarks,
        startedAt: item.created_on || new Date().toISOString(),
        endedAt: item.updated_on || new Date().toISOString(),
        status: item.status === 2 ? 'SYNCED' : (item.status === 3 ? 'REJECTED' : 'PENDING'),
        isCompleted: item.status === 2,
        completedAt: item.status === 2 ? item.updated_on : undefined,
        location: item.village_name || item.village,
        block: item.block_name || item.block,
        district: item.district_name || item.district,
        village: item.village_name || item.village,
        stateName: item.state_name,
        feederName: item.feeder_name,
        dtrCode: item.dtr_code,
        preparedBy: 'Surveyor',
        erectionItem: item,
        nodes: (Array.isArray(item.nodes) ? item.nodes : []).map((node: any) => ({
          id: String(node.id),
          nodeType: node.nodeType,
          sequenceNumber: node.sequenceNumber,
          nameLabel: node.nameLabel,
          latitude: node.latitude,
          longitude: node.longitude,
          attributes: node.attributes || {},
          imageUri: node.imageUri || null,
          imageUris: node.imageUris || (node.imageUri ? [node.imageUri] : []),
          capturedAt: node.capturedAt || '',
          parentLabel: node.parentLabel,
        })),
      };

      dispatch(injectHistoryLine(surveyLine));
      navigation.navigate('ErectionDetails', { surveyId, erectionItem: item });
      return;
    }

    dispatch(startSurvey({
      id: surveyId,
      workflowType: 'ERECTION',
      lineType: item.type_of_work,
      ltStartingPoint: item.lt_starting_point,
      contractorName: item.contractor_name,
      remarks: item.remarks,
      stateName: item.state_name,
      district: item.district_name || item.district,
      block: item.block_name || item.block,
      village: item.village_name || item.village,
      location: item.village_name || item.village,
      feederName: item.feeder_name,
      dtrCode: item.dtr_code,
      drawingNo: item.drawing_no,
    }));
    navigation.navigate('ActiveSurvey');
  };

  // View Completed or Rejected Erection Details in non-editable mode
  const handleViewErectionDetails = (item: any) => {
    const surveyId = `erect-${item.id}`;
    const isCompleted = item.status === 2;
    const isRejected = item.status === 3;

    const surveyLine: SurveyLine = {
      id: surveyId,
      workflowType: 'ERECTION',
      drawingNo: item.drawing_no,
      feederName: item.feeder_name,
      dtrCode: item.dtr_code,
      lineType: item.type_of_work,
      ltStartingPoint: item.lt_starting_point,
      contractorName: item.contractor_name,
      remarks: item.remarks,
      startedAt: item.created_on || new Date().toISOString(),
      endedAt: item.updated_on || new Date().toISOString(),
      status: isCompleted ? 'SYNCED' : (isRejected ? 'REJECTED' : 'PENDING'),
      isCompleted: true, // Non-editable mode
      completedAt: isCompleted ? item.updated_on : undefined,
      location: item.village_name || item.village,
      block: item.block_name || item.block,
      district: item.district_name || item.district,
      village: item.village_name || item.village,
      stateName: item.state_name,
      preparedBy: 'Surveyor',
      erectionItem: item,
      nodes: (item.nodes || []).map((node: any) => ({
        id: String(node.id),
        nodeType: node.nodeType,
        sequenceNumber: node.sequenceNumber,
        nameLabel: node.nameLabel,
        latitude: node.latitude,
        longitude: node.longitude,
        attributes: node.attributes || {},
        imageUri: node.imageUri || null,
        imageUris: node.imageUris || (node.imageUri ? [node.imageUri] : []),
        capturedAt: node.capturedAt || '',
        parentLabel: node.parentLabel,
      })),
    };

    dispatch(injectHistoryLine(surveyLine));
    navigation.navigate('ErectionDetails', {
      surveyId,
      isReadOnly: true,
      isRejected,
      erectionItem: item,
    });
  };

  // Safe confirm prompt before complete API call
  const handleCompleteConfirmation = (id: number) => {
    Alert.alert(
      'Confirm Completion',
      'Are you sure you want to mark this erection execution as completed? This action is irreversible and the execution details will become read-only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: () => handleCompleteClick(id),
        },
      ],
      { cancelable: true }
    );
  };

  // List Filters mapping
  const filteredErections = useMemo(() => {
    return erectionList && erectionList.length > 0 ? erectionList?.filter((item: any) => {
      const matchesVoltage = voltageFilter === 'ALL' || item.type_of_work === voltageFilter;
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && item.status === 1) ||
        (statusFilter === 'COMPLETED' && item.status === 2) ||
        (statusFilter === 'REJECTED' && item.status === 3);
      const matchesSearch = [item.contractor_name, item.drawing_no, item.village_name, item.village].some(value => String(value || '').toLowerCase().includes(searchQuery.trim().toLowerCase()));
      return matchesVoltage && matchesStatus && matchesSearch;
    }) : [];
  }, [erectionList, voltageFilter, statusFilter, searchQuery]);

  const getLineAccent = (type: string | number) => {
    switch (type) {
      case 'HT_11KV': return '#F59E0B'; // Amber
      case 'HT_33KV': return '#EF4444'; // Red
      case 'LT_440V': return '#0284C7'; // Sky Blue
      default: return '#0284C7';
    }
  };

  return (
    <View style={styles.outerContainer}>
      <View style={[StyleSheet.absoluteFill, { zIndex: 1 }]} pointerEvents="none">
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#FFFFFF" />
              <Stop offset="60%" stopColor="#F0F9FF" />
              <Stop offset="100%" stopColor="#EFF7FF" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGradient)" />
        </Svg>
      </View>

      <View style={styles.mainWrapper}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ImageBackground source={require('../../../assets/erection-hero-v2.png')} style={StyleSheet.absoluteFill} resizeMode="stretch" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.headerTitle}>Erection</Text>
            <Text style={styles.heroAccent}>Execution</Text>
            <Text style={styles.heroSubtitle}>Manage your erection works, update progress and ensure completion</Text>
          </View>
        </View>
        <View style={styles.searchPanel}>
          <View style={styles.searchInputWrap}>
            <Svg width={21} height={21} viewBox="0 0 24 24"><Circle cx="10" cy="10" r="7" stroke="#607399" strokeWidth="2" fill="none" /><Line x1="15" y1="15" x2="22" y2="22" stroke="#607399" strokeWidth="2" /></Svg>
            <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search company, drawing or village..." placeholderTextColor="#7383A2" style={styles.searchInput} accessibilityLabel="Search erection projects" />
          </View>
          <TouchableOpacity style={[styles.filterButton, (voltageFilter !== 'ALL' || statusFilter !== 'ALL') && styles.filterButtonActive]} onPress={() => setShowFilterModal(true)} accessibilityLabel="Filter erection projects">
            <Svg width={25} height={25} viewBox="0 0 24 24" stroke="#1765E8" strokeWidth="2"><Line x1="3" y1="6" x2="21" y2="6" /><Line x1="3" y1="12" x2="21" y2="12" /><Line x1="3" y1="18" x2="21" y2="18" /><Circle cx="8" cy="6" r="2" fill="#1765E8" /><Circle cx="16" cy="12" r="2" fill="#1765E8" /><Circle cx="10" cy="18" r="2" fill="#1765E8" /></Svg>
          </TouchableOpacity>
        </View>

        {/* FILTER MODAL */}
        <Modal
          visible={showFilterModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            style={styles.filterModalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          >
            <View style={[styles.filterDrawer, { paddingBottom: Math.max(insets.bottom, 14) }]} onStartShouldSetResponder={() => true}>
              <View style={styles.drawerHandle} />
              <View style={styles.drawerHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.drawerEyebrow}>ERECTION EXECUTION</Text>
                  <Text style={styles.drawerTitle}>Filter projects</Text>
                  <Text style={styles.drawerSubtitle}>Find the works you want to manage.</Text>
                </View>
                <TouchableOpacity accessibilityLabel="Close project filters" onPress={() => setShowFilterModal(false)} style={styles.drawerCloseBtn}>
                  <Text style={styles.drawerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.drawerSectionTitle}>Voltage class</Text>
                <View style={styles.drawerOptionsGrid}>
                {([
                  { label: 'ALL CLASS', value: 'ALL' },
                  { label: '11KV HT', value: 'HT_11KV' },
                  { label: '33KV HT', value: 'HT_33KV' },
                  { label: 'LT LINE', value: 'LT_440V' }
                ] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.drawerFilterTab, voltageFilter === opt.value && styles.drawerFilterTabActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: voltageFilter === opt.value }}
                    onPress={() => setVoltageFilter(opt.value)}
                  >
                    <Text style={[styles.drawerFilterTabText, voltageFilter === opt.value && styles.drawerFilterTabTextActive]}>
                      {opt.label}
                    </Text>
                    <View style={[styles.drawerRadio, voltageFilter === opt.value && styles.drawerRadioActive]}>
                      {voltageFilter === opt.value && <View style={styles.drawerRadioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}

                </View>
                <Text style={[styles.drawerSectionTitle, { marginTop: 16 }]}>Execution status</Text>
                <View style={styles.drawerOptionsGrid}>
                {([
                  { label: 'ALL STATUS', value: 'ALL' },
                  { label: 'PENDING', value: 'PENDING' },
                  { label: 'COMPLETED', value: 'COMPLETED' },
                  { label: 'REJECTED', value: 'REJECTED' },
                ] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.drawerFilterTab, statusFilter === opt.value && styles.drawerFilterTabActive]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: statusFilter === opt.value }}
                    onPress={() => setStatusFilter(opt.value)}
                  >
                    <Text style={[styles.drawerFilterTabText, statusFilter === opt.value && styles.drawerFilterTabTextActive]}>
                      {opt.label}
                    </Text>
                    <View style={[styles.drawerRadio, statusFilter === opt.value && styles.drawerRadioActive]}>
                      {statusFilter === opt.value && <View style={styles.drawerRadioDot} />}
                    </View>
                  </TouchableOpacity>
                ))}
                </View>
              </ScrollView>
              <View style={styles.drawerFooter}>
                <Text style={styles.drawerResultText}>{filteredErections.length} matching project{filteredErections.length === 1 ? '' : 's'}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.drawerDoneButton} onPress={() => setShowFilterModal(false)} activeOpacity={0.85}>
                  <View style={[StyleSheet.absoluteFill, { borderRadius: 13, overflow: 'hidden' }]} pointerEvents="none"><Svg width="100%" height="100%"><Defs><LinearGradient id="filterDoneGradient" x1="0%" y1="100%" x2="100%" y2="0%"><Stop offset="0%" stopColor="#087CFF" /><Stop offset="100%" stopColor="#8A40F6" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#filterDoneGradient)" /></Svg></View>
                  <Text style={styles.drawerDoneText}>Show projects</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {loading && erectionList.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#0284C7" size="large" />
            <Text style={styles.loadingText}>FETCHING ERECTIONS...</Text>
          </View>
        ) : (
          <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollListContent} keyboardShouldPersistTaps="handled">
            {filteredErections.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>NO ERECTIONS FOUND</Text>
                <Text style={styles.emptySubText}>{searchQuery.trim() || voltageFilter !== 'ALL' || statusFilter !== 'ALL' ? 'Try another search or adjust your filters.' : 'Tap the + button to configure and start a new erection execution.'}</Text>
              </View>
            ) : (
              filteredErections.map((item: any, index: number) => {
                const accent = getLineAccent(item.type_of_work);
                return (
                  <View key={item.id} style={[styles.surveyCard, { borderLeftColor: ['#8470FF', '#FFB13D', '#29ACF5', '#A348F5'][index % 4] }]}>
                    <View style={styles.cardHeader}>
                      <View style={[styles.projectIcon, { backgroundColor: ['#7774FF', '#FFAA28', '#24A5FA', '#A348F5'][index % 4] }]}>
                        <Svg width={24} height={28} viewBox="0 0 24 28"><Path d="M3 26V3H14V26M14 11H21V26" fill="none" stroke="white" strokeWidth="2.5" /><Path d="M7 7H10M7 12H10M7 17H10M7 22H10M17 15H19M17 20H19M1 26H23" stroke="white" strokeWidth="2" /></Svg>
                      </View>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={styles.contractorName} numberOfLines={2}>{item.contractor_name}</Text>
                        <Text style={styles.cardMetaText}>
                          Drawing No.: {item.drawing_no}
                          {/* {item.feeder_name ? ` • FDR: ${item.feeder_name}` : ''}
                          {item.dtr_code ? ` • DTR: ${item.dtr_code}` : ''} */}
                        </Text>
                      </View>
                      </View>
                    <View style={styles.badgeRow}>
                        <View style={[styles.classBadge, { borderColor: accent, marginRight: 4 }]}>
                          <Text style={[styles.classBadgeText, { color: accent }]}>
                            {getLineTypeLabel(item.type_of_work_name)}
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, {
                          borderColor: item.status === 2 ? '#059669' : (item.status === 3 ? '#DC2626' : '#D97706'),
                          backgroundColor: item.status === 2 ? 'rgba(5, 150, 105, 0.05)' : (item.status === 3 ? 'rgba(220, 38, 38, 0.05)' : 'rgba(217, 119, 6, 0.05)')
                        }]}>
                          <Text style={[styles.statusBadgeText, { color: item.status === 2 ? '#059669' : (item.status === 3 ? '#DC2626' : '#D97706') }]}>
                            {item.status === 2 ? 'COMPLETED' : (item.status === 3 ? 'REJECTED' : 'PENDING')}
                          </Text>
                        </View>
                    </View>

                    <Text style={styles.cardLocationText}>
                      📍 {item.village_name || item.village}, {item.block_name || item.block}, {item.district_name || item.district}
                    </Text>

                    {item.remarks ? (
                      <Text style={styles.cardRemarksText} numberOfLines={1}>
                        💬 {item.remarks}
                      </Text>
                    ) : null}

                    <Text style={styles.cardTimestampText}>
                      📅 Updated: {item.updated_on || 'N/A'}
                    </Text>

                    {item.status === 1 ? (
                      <View style={styles.buttonsRow}>
                        <TouchableOpacity
                          style={styles.compactBtnEdit}
                          onPress={() => handleEditBasicDetails(item)}
                        >
                          <Text style={styles.compactBtnTextEdit}>{"\u270E"}  Edit Basic</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.compactBtnUpdate}
                          onPress={() => handleUpdateErectionsClick(item)}
                        >
                          <Text style={styles.compactBtnTextUpdate}>{"\u21BB"}  Update</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.compactBtnComplete}
                          onPress={() => handleCompleteConfirmation(item.id)}
                        >
                          <Text style={styles.compactBtnTextComplete}>{"\u2713"}  Complete</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.compactBtnView}
                        onPress={() => handleViewErectionDetails(item)}
                      >
                        <Text style={styles.compactBtnTextView}>VIEW DETAILS</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

      {/* EDIT MODAL DIALOG */}
      <Modal
        visible={!!editingErection}
        transparent
        animationType="slide"
        onRequestClose={() => setEditingErection(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>EDIT ERECTION DETAILS</Text>
              <TouchableOpacity onPress={() => setEditingErection(null)}>
                <Text style={styles.modalCloseText}>CANCEL</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.fieldContainer}>
                <Text style={styles.formLabel}>DRAWING NO (MANDATORY)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Drawing Number"
                  placeholderTextColor="rgba(30, 41, 59, 0.35)"
                  value={drawingNo}
                  onChangeText={setDrawingNo}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.formLabel}>11 KV EXISTING FEEDER NAME</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter Feeder Name"
                  placeholderTextColor="rgba(30, 41, 59, 0.35)"
                  value={feederName}
                  onChangeText={setFeederName}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.formLabel}>EXISTING DTR CODE</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter DTR Code"
                  placeholderTextColor="rgba(30, 41, 59, 0.35)"
                  value={dtrCode}
                  onChangeText={setDtrCode}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Dropdown
                  label="STATE (MANDATORY)"
                  value={stateName}
                  options={stateOptions}
                  onChange={handleStateChange}
                  placeholder="Select State"
                />
              </View>

              <View style={styles.fieldContainer}>
                <Dropdown
                  label="DISTRICT (MANDATORY)"
                  value={district}
                  options={districtOptions}
                  onChange={handleDistrictChange}
                  placeholder="Select District"
                  disabled={!stateName}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Dropdown
                  label="BLOCK (MANDATORY)"
                  value={block}
                  options={blockOptions}
                  onChange={handleBlockChange}
                  placeholder="Select Block"
                  disabled={!district}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Dropdown
                  label="VILLAGE (MANDATORY)"
                  value={village}
                  options={villageOptions}
                  onChange={(val) => setVillage(String(val))}
                  placeholder="Select Village"
                  disabled={!block}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Dropdown
                  label="CONTRACTOR FIRM"
                  value={contractor}
                  options={contractorOptions}
                  onChange={(val) => setContractor(String(val))}
                  placeholder="Select Contractor"
                  disabled={!village}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.formLabel}>TYPE OF WORK</Text>
                <View style={styles.pillsRow}>
                  {typeOfWorkOptions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.pillButton,
                        lineType === opt.value && { borderColor: '#0284C7', backgroundColor: 'rgba(2, 132, 199, 0.05)' }
                      ]}
                      onPress={() => {
                        setLineType(opt.value as any);
                        setLtStartingPoint('');
                      }}
                    >
                      <Text style={[styles.pillButtonText, lineType === opt.value && { color: '#0284C7', fontWeight: 'bold' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {lineType !== '' && ltStartingPointOptions.length > 0 && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.formLabel}>LT LINE STARTING POINT</Text>
                  <View style={styles.startingPointBox}>
                    {ltStartingPointOptions.map((option) => {
                      const isSelected = ltStartingPoint === option.value;
                      return (
                        <TouchableOpacity
                          key={option.value}
                          activeOpacity={0.75}
                          onPress={() => setLtStartingPoint(option.value as any)}
                          style={[styles.startingPointOption, isSelected && styles.startingPointOptionSelected]}
                        >
                          <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                            {isSelected && <View style={styles.radioInner} />}
                          </View>
                          <View style={styles.startingPointCopy}>
                            <Text style={[styles.startingPointTitle, isSelected && styles.startingPointTitleSelected]}>
                              {option.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.fieldContainer}>
                <Text style={styles.formLabel}>REMARKS</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextArea]}
                  placeholder="Enter remarks..."
                  placeholderTextColor="rgba(30, 41, 59, 0.35)"
                  value={remarks}
                  onChangeText={setRemarks}
                  multiline
                  numberOfLines={3}
                />
              </View>

              {editLoading ? (
                <ActivityIndicator color="#0284C7" size="small" style={{ marginVertical: 20 }} />
              ) : (
                <TouchableOpacity style={styles.launchSurveyBtn} onPress={handleSaveUpdates}>
                  <Text style={styles.launchSurveyText}>SAVE UPDATES</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Read-Only Details Modal for Completed Erections */}
      <Modal
        visible={!!viewingErection}
        transparent
        animationType="slide"
        onRequestClose={() => setViewingErection(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>VIEW ERECTION DETAILS</Text>
              <TouchableOpacity onPress={() => setViewingErection(null)}>
                <Text style={styles.modalCloseText}>CLOSE</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DRAWING NO</Text>
                <Text style={styles.detailValue}>{viewingErection?.drawing_no || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>11 KV EXISTING FEEDER NAME</Text>
                <Text style={styles.detailValue}>{viewingErection?.feeder_name || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>EXISTING DTR CODE</Text>
                <Text style={styles.detailValue}>{viewingErection?.dtr_code || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>STATE NAME</Text>
                <Text style={styles.detailValue}>{viewingErection?.state_name || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>DISTRICT</Text>
                <Text style={styles.detailValue}>{viewingErection?.district || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>BLOCK</Text>
                <Text style={styles.detailValue}>{viewingErection?.block || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>VILLAGE</Text>
                <Text style={styles.detailValue}>{viewingErection?.village || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>CONTRACTOR / FIRM NAME</Text>
                <Text style={styles.detailValue}>{viewingErection?.contractor_name || 'N/A'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>TYPE OF WORK</Text>
                <Text style={styles.detailValue}>
                  {viewingErection ? getLineTypeLabel(viewingErection.type_of_work) : 'N/A'}
                </Text>
              </View>

              {viewingErection?.type_of_work === 'LT_440V' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>LT LINE STARTING POINT</Text>
                  <Text style={styles.detailValue}>{viewingErection?.lt_starting_point || 'N/A'}</Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>REMARKS</Text>
                <Text style={styles.detailValue}>{viewingErection?.remarks || 'None'}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>LAST UPDATED ON</Text>
                <Text style={styles.detailValue}>{viewingErection?.updated_on || 'N/A'}</Text>
              </View>

              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <Text style={styles.detailLabel}>EXECUTION STATUS</Text>
                <Text style={[styles.detailValue, { color: '#059669', fontWeight: 'bold' }]}>COMPLETED (LOCKED)</Text>
              </View>

              <View style={styles.lockedAlertBox}>
                <Text style={styles.lockedAlertText}>
                  🔒 This erection execution is marked as completed and is locked. Editing or mapping modifications are disabled.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  drawerHandle: { width: 38, height: 4, borderRadius: 2, backgroundColor: '#CED8EF', alignSelf: 'center' },
  drawerEyebrow: { color: '#8264BA', fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginBottom: 4 },
  drawerSubtitle: { color: '#7A89A8', fontSize: 11, marginTop: 4 },
  drawerOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  drawerRadio: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: '#C3CFE5', alignItems: 'center', justifyContent: 'center' },
  drawerRadioActive: { borderColor: '#8450DD' },
  drawerRadioDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8450DD' },
  drawerFooter: { borderTopWidth: 1, borderTopColor: '#E3E8F5', paddingTop: 12 },
  drawerResultText: { color: '#7182A3', fontSize: 10, textAlign: 'center', marginBottom: 10 },
  drawerDoneButton: { minHeight: 44, borderRadius: 13, backgroundColor: '#7045E8', alignItems: 'center', justifyContent: 'center' },
  drawerDoneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  heroCopy: { flex: 1, maxWidth: 220, paddingRight: 12, },
  heroAccent: { color: '#9EDBFF', fontSize: 25, lineHeight: 28, fontWeight: '800', letterSpacing: -0.7, },
  heroSubtitle: { color: '#EAF3FF', fontSize: 10.5, lineHeight: 14, marginTop: 5, maxWidth: 185, },
  searchPanel: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, marginTop: -16, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: '#EFF7FF', },
  searchInputWrap: { flex: 1, minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#DAE6FA', },
  searchInput: { flex: 1, fontSize: 11, color: '#233A60', paddingVertical: 8, },
  filterButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: '#B8C9FF', backgroundColor: '#E4EEFF', alignItems: 'center', justifyContent: 'center', },
  filterButtonActive: { backgroundColor: '#C4D8FF', borderColor: '#1765E8' },
  projectIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 9, },
  outerContainer: {
    flex: 1,
    backgroundColor: '#EFF7FF',
  },
  mainWrapper: {
    flex: 1,
    zIndex: 10,
  },
  header: {
    minHeight: 150, paddingHorizontal: 18, paddingBottom: 22, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', overflow: 'hidden',
  },
  headerTitle: {
    color: '#FFFFFF', fontSize: 25, lineHeight: 28, fontWeight: '800', letterSpacing: -0.7,
  },
  menuBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginTop: 2, elevation: 3,
  },
  menuBtnText: {
    color: '#5233BD', fontSize: 29, lineHeight: 33, fontWeight: '700',
  },
  filterModalOverlay: { flex: 1, backgroundColor: 'rgba(14, 27, 62, 0.45)', justifyContent: 'flex-end', },
  filterDrawer: { width: '100%', maxHeight: '85%', backgroundColor: '#F7FAFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderColor: '#DCDFFA', paddingTop: 10, paddingHorizontal: 20, shadowColor: '#243D70', shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 18, },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, paddingBottom: 18, },
  drawerTitle: { color: '#14234F', fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4, },
  drawerCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEEAFE', borderWidth: 1, borderColor: '#DFD5F8', alignItems: 'center', justifyContent: 'center', },
  drawerCloseText: { color: '#7051AB', fontSize: 15, fontWeight: '600', },
  drawerContent: { paddingBottom: 12, },
  drawerSectionTitle: { color: '#30436B', fontSize: 12, fontWeight: '800', marginBottom: 9, },
  drawerFilterTab: { width: '48%', minHeight: 44, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#DDE6F7', backgroundColor: '#FFFFFF', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, },
  drawerFilterTabActive: { borderColor: '#9864F2', backgroundColor: '#F1EBFF', shadowColor: '#8456DA', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2, },
  drawerFilterTabText: { color: '#627397', fontSize: 10.5, fontWeight: '600', flexShrink: 1, },
  drawerFilterTabTextActive: { color: '#7041CB', fontWeight: '800', },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(2, 132, 199, 0.08)',
  },
  filterTitle: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterTab: {
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  filterTabActive: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
  },
  filterTabText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  filterTabTextActive: {
    color: '#0284C7',
  },
  statusFiltersRow: {
    flexDirection: 'row',
  },
  statusTab: {
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  statusTabActive: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
  },
  statusTabText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  statusTabTextActive: {
    color: '#0284C7',
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    paddingHorizontal: 12, paddingTop: 4, paddingBottom: 24,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderStyle: 'dashed',
    marginTop: 20,
  },
  emptyText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  emptySubText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  surveyCard: {
    backgroundColor: '#FBFDFF', borderWidth: 1, borderColor: '#E5EDFA', borderLeftWidth: 3, borderRadius: 16, marginBottom: 8, paddingHorizontal: 9, paddingVertical: 8, shadowColor: '#3974AF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 6, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center',
  },
  contractorName: {
    color: '#101E52', fontSize: 13, lineHeight: 17, fontWeight: '800',
  },
  badgeRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 7, flexWrap: 'wrap', gap: 6,
  },
  cardMetaText: {
    color: '#607399', fontSize: 10, lineHeight: 14, marginTop: 1,
  },
  cardLocationText: {
    color: '#465B80', fontSize: 10, lineHeight: 14, marginTop: 7,
  },
  cardRemarksText: {
    color: '#EF850C', fontSize: 10, lineHeight: 14, marginTop: 3, fontWeight: '600',
  },
  cardTimestampText: {
    color: '#607399', fontSize: 10, lineHeight: 14, marginTop: 3,
  },
  buttonsRow: {
    flexDirection: 'row', gap: 6, marginTop: 9,
  },
  compactBtnEdit: {
    flex: 1, minHeight: 34, borderWidth: 1, borderColor: '#9873FF', borderRadius: 12, backgroundColor: '#FBF9FF', alignItems: 'center', justifyContent: 'center',
  },
  compactBtnTextEdit: {
    color: '#783DFA', fontSize: 10, fontWeight: '700',
  },
  compactBtnUpdate: {
    flex: 1, minHeight: 34, borderRadius: 12, backgroundColor: '#087CFF', alignItems: 'center', justifyContent: 'center',
  },
  compactBtnTextUpdate: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '700',
  },
  compactBtnComplete: {
    flex: 1, minHeight: 34, borderRadius: 12, backgroundColor: '#FF4038', alignItems: 'center', justifyContent: 'center',
  },
  compactBtnTextComplete: {
    color: '#FFFFFF', fontSize: 10, fontWeight: '700',
  },
  compactBtnView: {
    minHeight: 34, borderRadius: 12, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#C5DDFB', alignItems: 'center', justifyContent: 'center', marginTop: 14,
  },
  compactBtnTextView: {
    color: '#06B6D4',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  drawingNoText: {
    color: '#334155',
    fontSize: 11.5,
    fontWeight: '700',
    marginTop: 3,
  },
  infoRowText: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  timestampText: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 6,
    fontWeight: '600',
  },
  classBadge: {
    borderWidth: 0, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#EDF5FF', shadowColor: '#4075BA', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  classBadgeText: {
    fontSize: 10, fontWeight: '700',
  },
  locationDetailsSection: {
    marginTop: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.03)',
    borderRadius: 8,
    padding: 10,
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderWidth: 1,
  },
  locationLabel: {
    color: '#0369A1',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 3,
  },
  locationVal: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  remarksText: {
    color: '#D97706',
    fontSize: 10.5,
    marginTop: 12,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(2, 132, 199, 0.08)',
    paddingTop: 10,
    marginTop: 12,
  },
  statusBadge: {
    borderWidth: 0, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4, shadowColor: '#A47A32', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2,
  },
  statusBadgeText: {
    fontSize: 10, fontWeight: '700',
  },
  buttonsContainer: {
    marginTop: 12,
    width: '100%',
  },
  horizontalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  editBasicBtn: {
    flex: 1,
    height: 36,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    borderWidth: 1.2,
    borderColor: '#06B6D4',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  editBasicBtnText: {
    color: '#06B6D4',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  updateErectionsBtn: {
    flex: 1,
    height: 36,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  updateErectionsBtnText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  completeErectionBtn: {
    width: '100%',
    height: 38,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeErectionBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  viewDetailsBtn: {
    width: '100%',
    height: 38,
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderWidth: 1.2,
    borderColor: '#06B6D4',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  viewDetailsBtnText: {
    color: '#06B6D4',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  // Modal detail display styles
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(2, 132, 199, 0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.2,
    flex: 1,
  },
  detailValue: {
    color: '#1E293B',
    fontSize: 12,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  lockedAlertBox: {
    backgroundColor: 'rgba(5, 150, 105, 0.05)',
    borderColor: 'rgba(5, 150, 105, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  lockedAlertText: {
    color: '#065F46',
    fontSize: 10.5,
    lineHeight: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#7550F8', borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#7550F8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 8, zIndex: 100,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxHeight: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingBottom: 12,
    marginBottom: 16,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  modalCloseText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalForm: {
    flexGrow: 0,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  formLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#1E293B',
    fontSize: 13,
  },
  formTextArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillButton: {
    flex: 1,
    marginHorizontal: 3,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  pillButtonText: {
    color: '#64748B',
    fontSize: 10.5,
  },
  launchSurveyBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  launchSurveyText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  startingPointBox: {
    marginTop: 6,
  },
  startingPointOption: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 10,
    marginBottom: 8,
  },
  startingPointOptionSelected: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#0284C7',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0284C7',
  },
  startingPointCopy: {
    flex: 1,
    marginLeft: 10,
  },
  startingPointTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '700',
  },
  startingPointTitleSelected: {
    color: '#0369A1',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginTop: 12,
  },
});
