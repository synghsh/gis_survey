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
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
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
    const types = domains['type_of_work'] || [];
    console.log('types', types);

    return types.map(t => ({ label: t.domain_desc || t.domain_value, value: t.domain_code }));
  }, [domains]);
  console.log('typeOfWorkOptions', typeOfWorkOptions);

  const ltStartingPointOptions = useMemo(() => {
    const pts = domains['lt_starting_point'] || [];
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
      const arr = domains[type] || [];
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
    const lt440vCode = domains['type_of_work']?.find((d: any) => d.domain_value === 'LT_440V')?.domain_code;

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
    if (item.nodes && item.nodes.length > 0) {
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
        nodes: item.nodes.map((node: any) => ({
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
      return matchesVoltage && matchesStatus;
    }) : [];
  }, [erectionList, voltageFilter, statusFilter]);

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
              <Stop offset="100%" stopColor="#E0F2FE" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGradient)" />
        </Svg>
      </View>

      <View style={styles.mainWrapper}>
        <View style={styles.header}>
          <View style={{ width: 34 }} />
          <Text style={styles.headerTitle}>ERECTION EXECUTION</Text>
          <TouchableOpacity onPress={() => setShowFilterModal(true)} style={styles.menuBtn}>
            <Text style={styles.menuBtnText}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* FILTER MODAL */}
        <Modal
          visible={showFilterModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <TouchableOpacity
            style={styles.filterModalOverlay}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          >
            <View style={styles.filterDrawer} onStartShouldSetResponder={() => true}>
              <View style={styles.drawerHeader}>
                <Text style={styles.drawerTitle}>FILTERS</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)} style={styles.drawerCloseBtn}>
                  <Text style={styles.drawerCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false}>
                <Text style={styles.drawerSectionTitle}>VOLTAGE CLASS</Text>
                {([
                  { label: 'ALL CLASS', value: 'ALL' },
                  { label: '11KV HT', value: 'HT_11KV' },
                  { label: '33KV HT', value: 'HT_33KV' },
                  { label: 'LT LINE', value: 'LT_440V' }
                ] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.drawerFilterTab, voltageFilter === opt.value && styles.drawerFilterTabActive]}
                    onPress={() => setVoltageFilter(opt.value)}
                  >
                    <Text style={[styles.drawerFilterTabText, voltageFilter === opt.value && styles.drawerFilterTabTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <Text style={[styles.drawerSectionTitle, { marginTop: 16 }]}>STATUS</Text>
                {([
                  { label: 'ALL STATUS', value: 'ALL' },
                  { label: 'PENDING', value: 'PENDING' },
                  { label: 'COMPLETED', value: 'COMPLETED' },
                  { label: 'REJECTED', value: 'REJECTED' },
                ] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.drawerFilterTab, statusFilter === opt.value && styles.drawerFilterTabActive]}
                    onPress={() => setStatusFilter(opt.value)}
                  >
                    <Text style={[styles.drawerFilterTabText, statusFilter === opt.value && styles.drawerFilterTabTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
                <Text style={styles.emptySubText}>Tap the floating button below to configure and start a new erection execution.</Text>
              </View>
            ) : (
              filteredErections.map((item: any) => {
                const accent = getLineAccent(item.type_of_work);
                return (
                  <View key={item.id} style={styles.surveyCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1, paddingRight: 6 }}>
                        <Text style={styles.contractorName} numberOfLines={1}>{item.contractor_name}</Text>
                        <Text style={styles.cardMetaText}>
                          Drawing No.: {item.drawing_no}
                          {/* {item.feeder_name ? ` • FDR: ${item.feeder_name}` : ''}
                          {item.dtr_code ? ` • DTR: ${item.dtr_code}` : ''} */}
                        </Text>
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
                          <Text style={styles.compactBtnTextEdit}>EDIT BASIC</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.compactBtnUpdate}
                          onPress={() => handleUpdateErectionsClick(item)}
                        >
                          <Text style={styles.compactBtnTextUpdate}>UPDATE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.compactBtnComplete}
                          onPress={() => handleCompleteConfirmation(item.id)}
                        >
                          <Text style={styles.compactBtnTextComplete}>COMPLETE</Text>
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

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('ErectionSetup')}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

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
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  mainWrapper: {
    flex: 1,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  menuBtn: {
    padding: 8,
  },
  menuBtnText: {
    color: '#0284C7',
    fontSize: 20,
    fontWeight: 'bold',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.3)',
    justifyContent: 'flex-end',
    flexDirection: 'row',
  },
  filterDrawer: {
    width: '45%',
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(2, 132, 199, 0.15)',
    paddingTop: 50,
    paddingHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 16,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingBottom: 8,
    marginBottom: 12,
  },
  drawerTitle: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  drawerCloseBtn: {
    padding: 4,
  },
  drawerCloseText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  drawerContent: {
    flexGrow: 1,
  },
  drawerSectionTitle: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  drawerFilterTab: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.12)',
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
    alignItems: 'center',
  },
  drawerFilterTabActive: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
  },
  drawerFilterTabText: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  drawerFilterTabTextActive: {
    color: '#0284C7',
    fontWeight: 'bold',
  },
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
    padding: 20,
    paddingBottom: 90,
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
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 12,
    marginBottom: 10,
    padding: 10,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  contractorName: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardMetaText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  cardLocationText: {
    color: '#475569',
    fontSize: 10.5,
    fontWeight: '600',
    marginTop: 4,
  },
  cardRemarksText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  cardTimestampText: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 4,
    fontWeight: '500',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  compactBtnEdit: {
    flex: 1.2,
    height: 30,
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    borderWidth: 1.2,
    borderColor: '#06B6D4',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  compactBtnTextEdit: {
    color: '#06B6D4',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  compactBtnUpdate: {
    flex: 1.2,
    height: 30,
    backgroundColor: '#0284C7',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  compactBtnTextUpdate: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  compactBtnComplete: {
    flex: 1.5,
    height: 30,
    backgroundColor: '#DC2626',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtnTextComplete: {
    color: '#FFFFFF',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  compactBtnView: {
    width: '100%',
    height: 30,
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderWidth: 1.2,
    borderColor: '#06B6D4',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0284C7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
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
