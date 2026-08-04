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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, SurveyLine } from '../../store';
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

  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 'HT_11KV' | 'HT_33KV' | 'LT_440V'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
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
  }, [dispatch]);

  // Derived selections for Edit Dropdowns
  const selectedStateObj = states.find(s => s.state_name === stateName);
  const selectedDistrictObj = districts.find(d => d.district_name === district);

  const handleStateChange = (val: string) => {
    setStateName(val);
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

  const handleDistrictChange = (val: string) => {
    setDistrict(val);
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

  const handleBlockChange = (val: string) => {
    setBlock(val);
    setVillage('');
    setContractor('');
  };

  const stateOptions = useMemo(() => states.map(s => ({ label: s.state_name, value: s.state_name })), [states]);
  const districtOptions = useMemo(() => districts.map(d => ({ label: d.district_name, value: d.district_name })), [districts]);
  const blockOptions = useMemo(() => blocks.map(b => ({ label: b.block_name, value: b.block_name })), [blocks]);

  // Static options helper
  const selectedStateStatic = ERECTION_LOCATION_DATA.find(item => item.name === stateName);
  const selectedDistrictStatic = selectedStateStatic?.districts.find(item => item.name === district);
  const selectedBlockStatic = selectedDistrictStatic?.blocks.find(item => item.name === block);

  const villageOptions = useMemo(() => {
    if (selectedBlockStatic) {
      return toOptions(selectedBlockStatic.villages.map(v => v.name));
    }
    return toOptions(['Village A', 'Village B', 'Village C']);
  }, [selectedBlockStatic]);

  const selectedVillageStatic = selectedBlockStatic?.villages.find(item => item.name === village);
  const contractorOptions = useMemo(() => {
    if (selectedVillageStatic) {
      return toOptions(selectedVillageStatic.contractors);
    }
    return toOptions(['Power Grid Corp', 'L&T Power Transmission', 'Techno Electric']);
  }, [selectedVillageStatic]);

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
    setLineType(item.type_of_work || '');
    setLtStartingPoint(item.lt_starting_point || '');
    setRemarks(item.remarks || '');

    // Fire master updates for current selected fields
    if (item.state_id) {
      dispatch(fetchDistrictsAction(item.state_id, undefined, () => { }) as any);
      if (item.district_id) {
        dispatch(fetchBlocksAction(item.state_id, item.district_id, undefined, () => { }) as any);
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
    if (lineType === 'LT_440V' && !ltStartingPoint) {
      toast.warning('Choose where the LT line starts.', { title: 'Starting point required' });
      return;
    }

    const selectedBlockObj = blocks.find(b => b.block_name === block);
    const villageIndex = villageOptions.findIndex(opt => opt.value === village);
    const villageId = villageIndex !== -1 ? villageIndex + 1 : 1;

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
      village_id: villageId,
      contractor_name: contractor,
      type_of_work: lineType,
      lt_starting_point: lineType === 'LT_440V' ? ltStartingPoint : null,
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

  // List Filters mapping
  const filteredErections = useMemo(() => {
    return erectionList && erectionList.length > 0 ? erectionList?.filter((item: any) => {
      const matchesVoltage = voltageFilter === 'ALL' || item.type_of_work === voltageFilter;
      const matchesStatus = statusFilter === 'ALL' ||
        (statusFilter === 'PENDING' && item.status === 1) ||
        (statusFilter === 'COMPLETED' && item.status === 2);
      return matchesVoltage && matchesStatus;
    }) : [];
  }, [erectionList, voltageFilter, statusFilter]);

  const getLineAccent = (type: string) => {
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
          <Text style={styles.headerTitle}>ERECTION EXECUTION</Text>
        </View>

        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>VOLTAGE CLASS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {([
              { label: 'ALL CLASS', value: 'ALL' },
              { label: '11KV HT', value: 'HT_11KV' },
              { label: '33KV HT', value: 'HT_33KV' },
              { label: 'LT LINE', value: 'LT_440V' }
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.filterTab, voltageFilter === opt.value && styles.filterTabActive]}
                onPress={() => setVoltageFilter(opt.value)}
              >
                <Text style={[styles.filterTabText, voltageFilter === opt.value && styles.filterTabTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.filterTitle, { marginTop: 12 }]}>EXECUTION STATUS</Text>
          <View style={styles.statusFiltersRow}>
            {([
              { label: 'ALL STATUS', value: 'ALL' },
              { label: 'PENDING', value: 'PENDING' },
              { label: 'COMPLETED', value: 'COMPLETED' }
            ] as const).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.statusTab, statusFilter === opt.value && styles.statusTabActive]}
                onPress={() => setStatusFilter(opt.value)}
              >
                <Text style={[styles.statusTabText, statusFilter === opt.value && styles.statusTabTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

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
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.contractorName}>{item.contractor_name}</Text>
                        <Text style={styles.drawingNoText}>Drawing No: {item.drawing_no}</Text>
                        {item.feeder_name && <Text style={styles.infoRowText}>Feeder: {item.feeder_name}</Text>}
                        {item.dtr_code && <Text style={styles.infoRowText}>DTR Code: {item.dtr_code}</Text>}
                        <Text style={styles.timestampText}>
                          📅 Updated: {item.updated_on || 'N/A'}
                        </Text>
                      </View>
                      <View style={[styles.classBadge, { borderColor: accent }]}>
                        <Text style={[styles.classBadgeText, { color: accent }]}>
                          {getLineTypeLabel(item.type_of_work)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.locationDetailsSection}>
                      <Text style={styles.locationLabel}>LOCATION DETAILS</Text>
                      <Text style={styles.locationVal}>
                        {item.village}, {item.block}, {item.district}, {item.state_name}
                      </Text>
                    </View>

                    {item.remarks ? (
                      <Text style={styles.remarksText}>&gt; {item.remarks}</Text>
                    ) : null}

                    <View style={styles.cardFooter}>
                      <View style={[styles.statusBadge, {
                        borderColor: item.status === 2 ? '#059669' : '#D97706',
                        backgroundColor: item.status === 2 ? 'rgba(5, 150, 105, 0.05)' : 'rgba(217, 119, 6, 0.05)'
                      }]}>
                        <Text style={[styles.statusBadgeText, { color: item.status === 2 ? '#059669' : '#D97706' }]}>
                          {item.status === 2 ? 'COMPLETED' : 'PENDING'}
                        </Text>
                      </View>

                      {item.status === 1 && (
                        <View style={styles.actionButtonsRow}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleOpenEditModal(item)}
                          >
                            <Text style={styles.editButtonText}>EDIT</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.completeButton}
                            onPress={() => handleCompleteClick(item.id)}
                          >
                            <Text style={styles.completeButtonText}>COMPLETE</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
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
                  onChange={setVillage}
                  placeholder="Select Village"
                  disabled={!block}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Dropdown
                  label="CONTRACTOR FIRM"
                  value={contractor}
                  options={contractorOptions}
                  onChange={setContractor}
                  placeholder="Select Contractor"
                  disabled={!village}
                />
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.formLabel}>TYPE OF WORK</Text>
                <View style={styles.pillsRow}>
                  {ERECTION_LINE_TYPES.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.pillButton,
                        lineType === opt.value && { borderColor: getLineAccent(opt.value), backgroundColor: 'rgba(2, 132, 199, 0.05)' }
                      ]}
                      onPress={() => {
                        setLineType(opt.value);
                        setLtStartingPoint('');
                      }}
                    >
                      <Text style={[styles.pillButtonText, lineType === opt.value && { color: getLineAccent(opt.value), fontWeight: 'bold' }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {lineType === 'LT_440V' && (
                <View style={styles.fieldContainer}>
                  <Text style={styles.formLabel}>LT LINE STARTING POINT</Text>
                  <View style={styles.startingPointBox}>
                    {LT_STARTING_POINT_OPTIONS.map((option) => {
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
    justifyContent: 'center',
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
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
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
    fontSize: 14,
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
  actionButtonsRow: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#0284C7',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
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
