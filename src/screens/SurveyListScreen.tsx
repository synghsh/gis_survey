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
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState, startSurvey, SurveyLine } from '../store';
import Theme from '../theme';

export default function SurveyListScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const historyList = useSelector((state: RootState) => state.survey.historyList);
  
  // Filtering States
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 'HT_11KV' | 'HT_33KV' | 'LT_440V'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'SYNCED'>('ALL');

  // Modal State for New Survey
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
    
    // Reset and close
    setContractor('');
    setRemarks('');
    setShowAddModal(false);
    navigation.navigate('ActiveSurvey');
  };

  // Filter survey lines based on selected parameters
  const filteredLines = historyList.filter((line: SurveyLine) => {
    const matchesVoltage = voltageFilter === 'ALL' || line.lineType === voltageFilter;
    const matchesStatus = statusFilter === 'ALL' || line.status === statusFilter;
    return matchesVoltage && matchesStatus;
  });

  const getLineAccent = (type: string) => {
    switch (type) {
      case 'HT_11KV': return Theme.colors.neon11KV;
      case 'HT_33KV': return Theme.colors.neon33KV;
      case 'LT_440V': return Theme.colors.neon440V;
      default: return Theme.colors.glowCyan;
    }
  };

  return (
    <View style={styles.container}>
      {/* Header bar with branding & title */}
      <View style={styles.header}>
        <View style={styles.brandingWrapper}>
          <Text style={styles.brandingIcon}>📋</Text>
          <Text style={styles.brandingText}>GRID LOGS</Text>
        </View>
        <Text style={styles.headerTitle}>SURVEY RUNS</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Filter Tabs Bar */}
      <View style={styles.filtersContainer}>
        {/* Voltage Class Filters */}
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

        {/* Status Filters */}
        <Text style={[styles.filterTitle, { marginTop: 10 }]}>UPLOAD STATUS</Text>
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

      {/* Main List */}
      <ScrollView style={styles.scrollList} contentContainerStyle={styles.scrollListContent}>
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
                    borderColor: isSynced ? Theme.colors.success : Theme.colors.warning,
                    backgroundColor: isSynced ? 'rgba(16, 185, 129, 0.05)' : 'rgba(245, 158, 11, 0.05)'
                  }]}>
                    <Text style={[styles.statusBadgeText, { color: isSynced ? Theme.colors.success : Theme.colors.warning }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* FLOATING ACTION BUTTON (FAB) */}
      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* ADD SURVEY MODAL DIALOG */}
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
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={contractor}
                onChangeText={setContractor}
              />

              <Text style={styles.formLabel}>VOLTAGE/CABLE CLASS</Text>
              <View style={styles.pillsRow}>
                {([
                  { label: '11KV HT', value: 'HT_11KV', color: Theme.colors.neon11KV },
                  { label: '33KV HT', value: 'HT_33KV', color: Theme.colors.neon33KV },
                  { label: '440V LT', value: 'LT_440V', color: Theme.colors.neon440V }
                ] as const).map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pillButton,
                      lineType === opt.value && { borderColor: opt.color, backgroundColor: 'rgba(255, 255, 255, 0.05)' }
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
                placeholder="Observed alignment, conductor weight class, or span constraints..."
                placeholderTextColor="rgba(255, 255, 255, 0.25)"
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
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  brandingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  brandingIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  brandingText: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  filtersScroll: {
    flexDirection: 'row',
  },
  filterTab: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  filterTabActive: {
    borderColor: Theme.colors.glowCyan,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  filterTabText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: Theme.colors.glowCyan,
  },
  statusFiltersRow: {
    flexDirection: 'row',
  },
  statusTab: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 8,
  },
  statusTabActive: {
    borderColor: Theme.colors.glowCyan,
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  statusTabText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
  },
  statusTabTextActive: {
    color: Theme.colors.glowCyan,
  },
  scrollList: {
    flex: 1,
  },
  scrollListContent: {
    padding: 20,
    paddingBottom: 90, // extra spacing for FAB
  },
  emptyCard: {
    ...Theme.glassmorphic.container,
    paddingVertical: 40,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 20,
  },
  emptyText: {
    color: Theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  emptySubText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 6,
    textAlign: 'center',
  },
  surveyCard: {
    ...Theme.glassmorphic.container,
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contractorName: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  timestampText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  classBadge: {
    borderWidth: 1,
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
    color: Theme.colors.warning,
    fontSize: 10.5,
    marginTop: 12,
    fontFamily: 'System',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    marginTop: 12,
  },
  nodesCount: {
    color: Theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: '600',
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // FAB STYLES
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Theme.colors.glowCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: {
    color: Theme.colors.glowCyan,
    fontSize: 28,
    fontWeight: '300',
    marginTop: -2,
  },
  // MODAL FORM STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 18, 0.8)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    ...Theme.glassmorphic.container,
    maxHeight: '80%',
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 20,
  },
  modalTitle: {
    color: Theme.colors.textPrimary,
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
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
  },
  formInput: {
    backgroundColor: 'rgba(8, 11, 17, 0.6)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: Theme.colors.textPrimary,
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
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pillButtonText: {
    color: Theme.colors.textSecondary,
    fontSize: 10.5,
  },
  launchSurveyBtn: {
    ...Theme.glassmorphic.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 10,
  },
  launchSurveyText: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
});
