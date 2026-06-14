import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, startSurvey, SurveyLine } from '../../store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function SurveyListScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const historyList = useSelector((state: RootState) => state.survey.historyList);
  
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 'HT_11KV' | 'HT_33KV' | 'LT_440V'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SYNCED'>('ALL');

  const [showAddModal, setShowAddModal] = useState(false);
  const [contractor, setContractor] = useState('');
  const [lineType, setLineType] = useState<'HT_11KV' | 'HT_33KV' | 'LT_440V'>('HT_11KV');
  const [remarks, setRemarks] = useState('');

  const handleStartNewSurvey = () => {
    if (!contractor.trim()) {
      Alert.alert('Missing Field', 'Please enter the Contractor Firm Name.');
      return;
    }
    const uniqueId = `srv-${Date.now().toString(36)}`;
    dispatch(
      startSurvey({
        id: uniqueId,
        lineType,
        contractorName: contractor.trim(),
        remarks: remarks.trim(),
      })
    );
    setContractor('');
    setRemarks('');
    setShowAddModal(false);
    navigation.navigate('ActiveSurvey');
  };

  const filteredLines = historyList.filter((line: SurveyLine) => {
    const matchesVoltage = voltageFilter === 'ALL' || line.lineType === voltageFilter;
    const matchesStatus = statusFilter === 'ALL' || line.status === statusFilter;
    return matchesVoltage && matchesStatus;
  });

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
      {/* 1. NATIVE GRADIENT SVG BACKDROP */}
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

      {/* 2. MAIN SCROLL CONTAINER */}
      <View style={styles.mainWrapper}>
        <View style={styles.header}>
          <View style={styles.brandingWrapper}>
            <Text style={styles.brandingIcon}>📋</Text>
            <Text style={styles.brandingText}>GRID LOGS</Text>
          </View>
          <Text style={styles.headerTitle}>SURVEY RUNS</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>VOLTAGE CLASS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            {([
              { label: 'ALL CLASS', value: 'ALL' },
              { label: '11KV HT', value: 'HT_11KV' },
              { label: '33KV HT', value: 'HT_33KV' },
              { label: '440V LT', value: 'LT_440V' }
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

          <Text style={[styles.filterTitle, { marginTop: 12 }]}>UPLOAD STATUS</Text>
          <View style={styles.statusFiltersRow}>
            {([
              { label: 'ALL STATUS', value: 'ALL' },
              { label: 'PENDING', value: 'PENDING' },
              { label: 'SYNCED', value: 'SYNCED' }
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

        <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollListContent} keyboardShouldPersistTaps="handled">
          {filteredLines.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>NO SURVEYS MATCH FILTER</Text>
              <Text style={styles.emptySubText}>Tap the floating icon in the bottom right corner to log a new survey run.</Text>
            </View>
          ) : (
            filteredLines.map((item: SurveyLine) => {
              const accent = getLineAccent(item.lineType);
              const isSynced = item.status === 'SYNCED';
              return (
                <TouchableOpacity 
                  key={item.id} 
                  style={styles.surveyCard}
                  onPress={() => navigation.navigate('SurveyDetails', { surveyId: item.id })}
                  activeOpacity={0.75}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.contractorName}>{item.contractorName}</Text>
                      <Text style={styles.timestampText}>
                        📅 {new Date(item.startedAt).toLocaleDateString()} // {new Date(item.startedAt).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={[styles.classBadge, { borderColor: accent }]}>
                      <Text style={[styles.classBadgeText, { color: accent }]}>
                        {item.lineType.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  {item.remarks ? (
                    <Text style={styles.remarksText}>&gt; {item.remarks}</Text>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <Text style={styles.nodesCount}>🗺️ {item.nodes.length} nodes mapped</Text>
                    <View style={[styles.statusBadge, { 
                      borderColor: isSynced ? '#059669' : '#D97706',
                      backgroundColor: isSynced ? 'rgba(5, 150, 105, 0.05)' : 'rgba(217, 119, 6, 0.05)'
                    }]}>
                      <Text style={[styles.statusBadgeText, { color: isSynced ? '#059669' : '#D97706' }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* NEW RUN DIALOG POPUP */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>NEW SURVEY RUN</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalCloseText}>CLOSE</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.formLabel}>CONTRACTOR FIRM NAME</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. L&T Power Transmission"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
                value={contractor}
                onChangeText={setContractor}
              />

              <Text style={styles.formLabel}>VOLTAGE/CABLE CLASS</Text>
              <View style={styles.pillsRow}>
                {([
                  { label: '11KV HT', value: 'HT_11KV', color: '#F59E0B' },
                  { label: '33KV HT', value: 'HT_33KV', color: '#EF4444' },
                  { label: '440V LT', value: 'LT_440V', color: '#0284C7' }
                ] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pillButton,
                      lineType === opt.value && { borderColor: opt.color, backgroundColor: 'rgba(2, 132, 199, 0.05)' }
                    ]}
                    onPress={() => setLineType(opt.value)}
                  >
                    <Text style={[styles.pillButtonText, lineType === opt.value && { color: opt.color, fontWeight: 'bold' }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formLabel}>SITE DESCRIPTION / REMARKS</Text>
              <TextInput
                style={[styles.formInput, styles.formTextArea]}
                placeholder="Observed alignment, conductor weight class..."
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.launchSurveyBtn} onPress={handleStartNewSurvey}>
                <Text style={styles.launchSurveyText}>START LINE SURVEY</Text>
              </TouchableOpacity>
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
  brandingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(2, 132, 199, 0.18)',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandingIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  brandingText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  headerPlaceholder: {
    width: 90,
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
    alignItems: 'center',
  },
  contractorName: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestampText: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
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
  remarksText: {
    color: '#D97706',
    fontSize: 10.5,
    marginTop: 12,
    fontFamily: 'System',
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
  nodesCount: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '700',
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
    padding: 24,
  },
  modalCard: {
    maxHeight: '80%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 24,
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
    marginBottom: 20,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
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
  formLabel: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
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
    marginTop: 24,
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
});
