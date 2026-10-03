import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ImageBackground,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Path,
  Circle,
  Line,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RootState,
  startSurvey,
  resumeSurvey,
  completeSurveyLine,
  SurveyLine,
} from '../../store';
import { useToast } from '../../components/ToastProvider';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';

export default function SurveyListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const toast = useToast();
  const { confirm } = useConfirmation();

  const historyList = useSelector((state: RootState) => state.survey.historyList) || [];

  const [searchQuery, setSearchQuery] = useState('');
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 'HT_11KV' | 'HT_33KV' | 'LT_440V'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'SYNCED'>('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Resume or start survey line in active mapping mode
  const handleContinueSurvey = (item: SurveyLine) => {
    if (item.nodes && item.nodes.length > 0) {
      const lastNode = item.nodes[item.nodes.length - 1];
      dispatch(resumeSurvey({ lineId: item.id, parentLabel: lastNode.nameLabel }));
      navigation.navigate('ActiveSurvey');
    } else {
      dispatch(
        startSurvey({
          id: item.id,
          workflowType: 'SURVEY',
          lineType: item.lineType,
          ltStartingPoint: item.ltStartingPoint,
          contractorName: item.contractorName,
          remarks: item.remarks,
          stateName: item.stateName,
          district: item.district,
          block: item.block,
          village: item.village,
          location: item.location,
          feederName: item.feederName,
          dtrCode: item.dtrCode,
          drawingNo: item.drawingNo,
        })
      );
      navigation.navigate('ActiveSurvey');
    }
  };

  // Complete Survey Line Confirmation
  const handleCompleteLine = (line: SurveyLine) => {
    if (line.isCompleted) {
      toast.info('This survey line is already completed and permanently locked.');
      return;
    }

    const locDesc = [line.village, line.block, line.district].filter(Boolean).join(', ') || line.location || 'Location not specified';

    if (confirm) {
      confirm({
        title: 'Complete Survey Line?',
        message: `${line.contractorName || 'Survey Run'}\n${getLineTypeLabel(line.lineType)} • ${line.nodes.length} structures\n${locDesc}\n\nThis permanently locks editing and continuation.`,
        confirmLabel: 'COMPLETE & LOCK',
        tone: 'destructive',
        onConfirm: () => {
          dispatch(completeSurveyLine(line.id));
          toast.success('Survey completed and locked. No further editing is allowed.', { title: 'Line completed' });
        },
      });
      return;
    }

    Alert.alert(
      'Confirm Completion',
      'Are you sure you want to mark this survey line as completed? This action is irreversible and the survey details will become read-only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: () => {
            dispatch(completeSurveyLine(line.id));
            toast.success('Survey completed and locked.');
          },
        },
      ],
      { cancelable: true }
    );
  };

  // List Filters mapping
  const filteredLines = useMemo(() => {
    return (historyList || []).filter((line: SurveyLine) => {
      // Exclude erection workflow items
      if (line.workflowType === 'ERECTION') return false;

      // Voltage filter
      const matchesVoltage =
        voltageFilter === 'ALL' ||
        line.lineType === voltageFilter ||
        String(line.lineType).toUpperCase().includes(voltageFilter.replace('HT_', '').replace('_', ''));

      // Status filter
      const isCompleted = Boolean(line.isCompleted);
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'COMPLETED' && isCompleted) ||
        (statusFilter === 'PENDING' && !isCompleted && line.status === 'PENDING') ||
        (statusFilter === 'SYNCED' && !isCompleted && line.status === 'SYNCED');

      // Search query
      if (!searchQuery.trim()) return matchesVoltage && matchesStatus;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = [
        line.contractorName,
        line.drawingNo,
        line.location,
        line.village,
        line.block,
        line.district,
        line.feederName,
        line.dtrCode,
        line.id,
        line.remarks,
      ].some((val) => String(val || '').toLowerCase().includes(q));

      return matchesVoltage && matchesStatus && matchesSearch;
    });
  }, [historyList, voltageFilter, statusFilter, searchQuery]);

  const getLineAccent = (type: string | number) => {
    const str = String(type || '').toUpperCase();
    if (str.includes('11KV')) return '#F59E0B'; // Amber
    if (str.includes('33KV')) return '#EF4444'; // Red
    if (str.includes('LT') || str.includes('440V')) return '#0284C7'; // Sky Blue
    return '#0284C7';
  };

  return (
    <View style={styles.outerContainer}>
      {/* 1. NATIVE GRADIENT SVG BACKDROP */}
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
        {/* 2. HERO HEADER WITH IMAGE BACKGROUND */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ImageBackground
              source={require('../../../assets/erection-hero-v2.png')}
              style={StyleSheet.absoluteFill}
              resizeMode="stretch"
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.headerTitle}>Survey</Text>
            <Text style={styles.heroAccent}>Runs</Text>
            <Text style={styles.heroSubtitle}>Track electrical corridors, inspect mapped nodes, and manage line surveys</Text>
          </View>
        </View>

        {/* 3. SEARCH & FILTER PANEL */}
        <View style={styles.searchPanel}>
          <View style={styles.searchInputWrap}>
            <Svg width={21} height={21} viewBox="0 0 24 24">
              <Circle cx="10" cy="10" r="7" stroke="#607399" strokeWidth="2" fill="none" />
              <Line x1="15" y1="15" x2="22" y2="22" stroke="#607399" strokeWidth="2" />
            </Svg>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search contractor, drawing, village..."
              placeholderTextColor="#7383A2"
              style={styles.searchInput}
              accessibilityLabel="Search survey runs"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterButton, (voltageFilter !== 'ALL' || statusFilter !== 'ALL') && styles.filterButtonActive]}
            onPress={() => setShowFilterModal(true)}
            accessibilityLabel="Filter survey runs"
          >
            <Svg width={25} height={25} viewBox="0 0 24 24" stroke="#1765E8" strokeWidth="2">
              <Line x1="3" y1="6" x2="21" y2="6" />
              <Line x1="3" y1="12" x2="21" y2="12" />
              <Line x1="3" y1="18" x2="21" y2="18" />
              <Circle cx="8" cy="6" r="2" fill="#1765E8" />
              <Circle cx="16" cy="12" r="2" fill="#1765E8" />
              <Circle cx="10" cy="18" r="2" fill="#1765E8" />
            </Svg>
          </TouchableOpacity>
        </View>

        {/* 4. FILTER DRAWER MODAL */}
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
                  <Text style={styles.drawerEyebrow}>SURVEY RUNS</Text>
                  <Text style={styles.drawerTitle}>Filter surveys</Text>
                  <Text style={styles.drawerSubtitle}>Find the survey corridors you want to inspect.</Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Close survey filters"
                  onPress={() => setShowFilterModal(false)}
                  style={styles.drawerCloseBtn}
                >
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
                    { label: 'LT LINE', value: 'LT_440V' },
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

                <Text style={[styles.drawerSectionTitle, { marginTop: 16 }]}>Survey status</Text>
                <View style={styles.drawerOptionsGrid}>
                  {([
                    { label: 'ALL STATUS', value: 'ALL' },
                    { label: 'PENDING', value: 'PENDING' },
                    { label: 'COMPLETED', value: 'COMPLETED' },
                    { label: 'SYNCED', value: 'SYNCED' },
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
                <Text style={styles.drawerResultText}>
                  {filteredLines.length} matching survey{filteredLines.length === 1 ? '' : 's'}
                </Text>
                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.drawerDoneButton}
                  onPress={() => setShowFilterModal(false)}
                  activeOpacity={0.85}
                >
                  <View style={[StyleSheet.absoluteFill, { borderRadius: 13, overflow: 'hidden' }]} pointerEvents="none">
                    <Svg width="100%" height="100%">
                      <Defs>
                        <LinearGradient id="filterDoneGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                          <Stop offset="0%" stopColor="#087CFF" />
                          <Stop offset="100%" stopColor="#8A40F6" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" fill="url(#filterDoneGradient)" />
                    </Svg>
                  </View>
                  <Text style={styles.drawerDoneText}>Show surveys</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* 5. SURVEY RUNS LIST */}
        <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollListContent} keyboardShouldPersistTaps="handled">
          {filteredLines.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>NO SURVEYS FOUND</Text>
              <Text style={styles.emptySubText}>
                {searchQuery.trim() || voltageFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'Try another search or adjust your filters.'
                  : 'Tap the + button to configure and start a new survey corridor.'}
              </Text>
            </View>
          ) : (
            filteredLines.map((item: SurveyLine, index: number) => {
              const accent = getLineAccent(item.lineType);
              const isCompleted = Boolean(item.isCompleted);
              const isSynced = item.status === 'SYNCED';
              const isRejected = item.status === 'REJECTED';
              const statusLabel = isCompleted ? 'COMPLETED' : (isRejected ? 'REJECTED' : (isSynced ? 'SYNCED' : 'PENDING'));
              const statusColor = isCompleted ? '#475569' : (isRejected ? '#DC2626' : (isSynced ? '#059669' : '#D97706'));
              const statusBg = isCompleted
                ? 'rgba(71, 85, 105, 0.08)'
                : isRejected
                ? 'rgba(220, 38, 38, 0.08)'
                : isSynced
                ? 'rgba(5, 150, 105, 0.08)'
                : 'rgba(217, 119, 6, 0.08)';
              const cardBorderColor = ['#8470FF', '#FFB13D', '#29ACF5', '#A348F5'][index % 4];
              const iconBg = ['#7774FF', '#FFAA28', '#24A5FA', '#A348F5'][index % 4];

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.surveyCard, { borderLeftColor: cardBorderColor }]}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('SurveyDetails', { surveyId: item.id })}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.projectIcon, { backgroundColor: iconBg }]}>
                      {/* Electrical transmission tower / pole icon */}
                      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <Path d="M12 2v20M5 7h14M7 12h10M9 17h6" />
                      </Svg>
                    </View>
                    <View style={{ flex: 1, paddingRight: 6 }}>
                      <Text style={styles.contractorName} numberOfLines={2}>
                        {item.contractorName || 'Unnamed Survey'}
                      </Text>
                      <Text style={styles.cardMetaText}>
                        {item.drawingNo ? `Drawing No.: ${item.drawingNo}` : `Run ID: ${item.id}`}
                        {item.feederName ? ` • FDR: ${item.feederName}` : ''}
                        {item.dtrCode ? ` • DTR: ${item.dtrCode}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.badgeRow}>
                    <View style={[styles.classBadge, { borderColor: accent }]}>
                      <Text style={[styles.classBadgeText, { color: accent }]}>
                        {getLineTypeLabel(item.lineType)}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: statusBg }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>

                    <View style={styles.nodesBadge}>
                      <Text style={styles.nodesBadgeText}>
                        🗺️ {item.nodes?.length || 0} {(item.nodes?.length || 0) === 1 ? 'node' : 'nodes'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardLocationText}>
                    📍 {[item.village, item.block, item.district].filter(Boolean).join(', ') || item.location || 'Location not specified'}
                  </Text>

                  {item.remarks ? (
                    <Text style={styles.cardRemarksText} numberOfLines={1}>
                      💬 {item.remarks}
                    </Text>
                  ) : null}

                  <Text style={styles.cardTimestampText}>
                    📅 Started: {new Date(item.startedAt).toLocaleDateString()} {new Date(item.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {item.completedAt ? ` • Done: ${new Date(item.completedAt).toLocaleDateString()}` : ''}
                  </Text>

                  {!isCompleted ? (
                    <View style={styles.buttonsRow}>
                      <TouchableOpacity
                        style={styles.compactBtnEdit}
                        onPress={(e) => {
                          e.stopPropagation();
                          navigation.navigate('SurveyDetails', { surveyId: item.id, editMode: true });
                        }}
                      >
                        <Text style={styles.compactBtnTextEdit}>{"\u270E"}  Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.compactBtnUpdate}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleContinueSurvey(item);
                        }}
                      >
                        <Text style={styles.compactBtnTextUpdate}>{"\u21BB"}  Continue</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.compactBtnComplete}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleCompleteLine(item);
                        }}
                      >
                        <Text style={styles.compactBtnTextComplete}>{"\u2713"}  Complete</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.compactBtnView}
                      onPress={(e) => {
                        e.stopPropagation();
                        navigation.navigate('SurveyDetails', { surveyId: item.id });
                      }}
                    >
                      <Text style={styles.compactBtnTextView}>VIEW DETAILS</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* 6. FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SurveySetup')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Create new survey run"
      >
        <Svg width={46} height={46} viewBox="0 0 58 58">
          <Defs>
            <LinearGradient id="surveyAddGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0" stopColor="#26BBFF" />
              <Stop offset="0.55" stopColor="#6262FF" />
              <Stop offset="1" stopColor="#A42AF3" />
            </LinearGradient>
          </Defs>
          <Circle cx="29" cy="29" r="29" fill="url(#surveyAddGradient)" />
          <Path d="M29 18V40M18 29H40" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#EFF7FF',
  },
  mainWrapper: {
    flex: 1,
    zIndex: 10,
  },
  header: {
    minHeight: 150,
    paddingHorizontal: 18,
    paddingBottom: 22,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  heroCopy: {
    flex: 1,
    maxWidth: 220,
    paddingRight: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  heroAccent: {
    color: '#9EDBFF',
    fontSize: 25,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  heroSubtitle: {
    color: '#EAF3FF',
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 5,
    maxWidth: 195,
  },
  searchPanel: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    marginTop: -16,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#EFF7FF',
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DAE6FA',
  },
  searchInput: {
    flex: 1,
    fontSize: 11,
    color: '#233A60',
    paddingVertical: 8,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#8A99B5',
    fontSize: 12,
    fontWeight: '700',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#B8C9FF',
    backgroundColor: '#E4EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#C4D8FF',
    borderColor: '#1765E8',
  },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(14, 27, 62, 0.45)',
    justifyContent: 'flex-end',
  },
  filterDrawer: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#F7FAFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#DCDFFA',
    paddingTop: 10,
    paddingHorizontal: 20,
    shadowColor: '#243D70',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 18,
  },
  drawerHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CED8EF',
    alignSelf: 'center',
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 18,
  },
  drawerEyebrow: {
    color: '#8264BA',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  drawerTitle: {
    color: '#14234F',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  drawerSubtitle: {
    color: '#7A89A8',
    fontSize: 11,
    marginTop: 4,
  },
  drawerCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEEAFE',
    borderWidth: 1,
    borderColor: '#DFD5F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerCloseText: {
    color: '#7051AB',
    fontSize: 15,
    fontWeight: '600',
  },
  drawerContent: {
    paddingBottom: 12,
  },
  drawerSectionTitle: {
    color: '#30436B',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 9,
  },
  drawerOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  drawerFilterTab: {
    width: '48%',
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDE6F7',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  drawerFilterTabActive: {
    borderColor: '#9864F2',
    backgroundColor: '#F1EBFF',
    shadowColor: '#8456DA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  drawerFilterTabText: {
    color: '#627397',
    fontSize: 10.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  drawerFilterTabTextActive: {
    color: '#7041CB',
    fontWeight: '800',
  },
  drawerRadio: {
    width: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#C3CFE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerRadioActive: {
    borderColor: '#8450DD',
  },
  drawerRadioDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8450DD',
  },
  drawerFooter: {
    borderTopWidth: 1,
    borderTopColor: '#E3E8F5',
    paddingTop: 12,
  },
  drawerResultText: {
    color: '#7182A3',
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 10,
  },
  drawerDoneButton: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: '#7045E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerDoneText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    paddingHorizontal: 12,
    paddingTop: 4,
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
    backgroundColor: '#FBFDFF',
    borderWidth: 1,
    borderColor: '#E5EDFA',
    borderLeftWidth: 3,
    borderRadius: 16,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    shadowColor: '#3974AF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  contractorName: {
    color: '#101E52',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '800',
  },
  cardMetaText: {
    color: '#607399',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    flexWrap: 'wrap',
    gap: 6,
  },
  classBadge: {
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: '#EDF5FF',
    shadowColor: '#4075BA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    shadowColor: '#A47A32',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  nodesBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F0F4FA',
  },
  nodesBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#405273',
  },
  cardLocationText: {
    color: '#465B80',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 7,
  },
  cardRemarksText: {
    color: '#EF850C',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
    fontWeight: '600',
  },
  cardTimestampText: {
    color: '#607399',
    fontSize: 10,
    lineHeight: 14,
    marginTop: 3,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 9,
  },
  compactBtnEdit: {
    flex: 1,
    minHeight: 34,
    borderWidth: 1,
    borderColor: '#9873FF',
    borderRadius: 12,
    backgroundColor: '#FBF9FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtnTextEdit: {
    color: '#783DFA',
    fontSize: 10,
    fontWeight: '700',
  },
  compactBtnUpdate: {
    flex: 1,
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: '#087CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtnTextUpdate: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  compactBtnComplete: {
    flex: 1,
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: '#FF4038',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactBtnTextComplete: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  compactBtnView: {
    minHeight: 34,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#C5DDFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  compactBtnTextView: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#943DF1',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 9,
    zIndex: 20,
    elevation: 12,
  },
});
