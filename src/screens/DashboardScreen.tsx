import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, navigateTo, startSurvey } from '../store';
import Theme from '../theme';

export default function DashboardScreen() {
  const dispatch = useDispatch();
  const auth = useSelector((state: RootState) => state.auth);
  const survey = useSelector((state: RootState) => state.survey);

  // New Survey inputs
  const [contractor, setContractor] = useState('');
  const [lineType, setLineType] = useState<'HT_11KV' | 'HT_33KV' | 'LT_440V'>('HT_11KV');
  const [remarks, setRemarks] = useState('');

  const handleStartSurvey = () => {
    if (!contractor.trim()) {
      Alert.alert('Missing Field', 'Please specify the contractor executing the grid erection.');
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
    // Reset inputs
    setContractor('');
    setRemarks('');
    dispatch(navigateTo('SURVEY'));
  };

  // Helper colors based on selection
  const getLineAccent = () => {
    switch (lineType) {
      case 'HT_11KV': return Theme.colors.neon11KV;
      case 'HT_33KV': return Theme.colors.neon33KV;
      case 'LT_440V': return Theme.colors.neon440V;
    }
  };

  const getLineLabel = () => {
    switch (lineType) {
      case 'HT_11KV': return '11KV HT GRID';
      case 'HT_33KV': return '33KV HT GRID';
      case 'LT_440V': return '440V LT DISTRIBUTION';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {/* Top Banner Status */}
      <View style={styles.header}>
        <View>
          <Text style={styles.srvLabel}>SURVEYOR ID: {auth.surveyorId}</Text>
          <Text style={styles.srvName}>{auth.surveyorName}</Text>
          <Text style={styles.srvDiv}>📍 {auth.division}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={() => dispatch(navigateTo('LOGIN'))}>
          <Text style={styles.logoutText}>EXIT</Text>
        </TouchableOpacity>
      </View>

      {/* Grid Stats HUD Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, styles.statBoxActive]}>
          <Text style={styles.statVal}>{survey.syncQueue.length}</Text>
          <Text style={styles.statLabel}>PENDING SYNC</Text>
          {survey.syncQueue.length > 0 && <View style={styles.syncAlertDot} />}
        </View>

        <TouchableOpacity 
          style={styles.statBox} 
          onPress={() => dispatch(navigateTo('QUEUE'))}
          activeOpacity={0.7}
        >
          <Text style={[styles.statVal, { color: Theme.colors.success }]}>{survey.completedCount}</Text>
          <Text style={styles.statLabel}>SYNCED LINES</Text>
        </TouchableOpacity>

        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: Theme.colors.glowCyan }]}>1.8m</Text>
          <Text style={styles.statLabel}>GPS LOCK</Text>
        </View>
      </View>

      {/* Form: Start a new survey */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>NEW SURVEY SESSION</Text>
          <View style={styles.activePill}>
            <Text style={styles.activePillText}>STANDBY</Text>
          </View>
        </View>

        <Text style={styles.label}>CONTRACTOR FIRM NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tata Power / L&T Transmission"
          placeholderTextColor="rgba(255, 255, 255, 0.25)"
          value={contractor}
          onChangeText={setContractor}
        />

        {/* Line Type selection pills */}
        <Text style={styles.label}>CABLE/VOLTAGE CLASS</Text>
        <View style={styles.pillsRow}>
          <TouchableOpacity
            style={[
              styles.pill,
              lineType === 'HT_11KV' && { borderColor: Theme.colors.neon11KV, backgroundColor: 'rgba(245, 158, 11, 0.12)' },
            ]}
            onPress={() => setLineType('HT_11KV')}
          >
            <Text style={[styles.pillText, lineType === 'HT_11KV' && { color: Theme.colors.neon11KV, fontWeight: 'bold' }]}>
              11KV HT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              lineType === 'HT_33KV' && { borderColor: Theme.colors.neon33KV, backgroundColor: 'rgba(239, 68, 68, 0.12)' },
            ]}
            onPress={() => setLineType('HT_33KV')}
          >
            <Text style={[styles.pillText, lineType === 'HT_33KV' && { color: Theme.colors.neon33KV, fontWeight: 'bold' }]}>
              33KV HT
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.pill,
              lineType === 'LT_440V' && { borderColor: Theme.colors.neon440V, backgroundColor: 'rgba(6, 182, 212, 0.12)' },
            ]}
            onPress={() => setLineType('LT_440V')}
          >
            <Text style={[styles.pillText, lineType === 'LT_440V' && { color: Theme.colors.neon440V, fontWeight: 'bold' }]}>
              440V LT
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>NOTES & SITE REMARKS (OPTIONAL)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Include span description, terrain specifics or weather details..."
          placeholderTextColor="rgba(255, 255, 255, 0.25)"
          value={remarks}
          onChangeText={setRemarks}
          multiline
          numberOfLines={3}
        />

        {/* Launch button */}
        <TouchableOpacity
          style={[styles.launchBtn, { borderColor: getLineAccent() }]}
          onPress={handleStartSurvey}
          activeOpacity={0.8}
        >
          <Text style={[styles.launchBtnText, { color: getLineAccent() }]}>
            BEGIN {getLineLabel()}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sync Queue quick access */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>LOCAL DATABASE QUEUE</Text>
          <TouchableOpacity onPress={() => dispatch(navigateTo('QUEUE'))}>
            <Text style={styles.viewAllText}>VIEW ALL &gt;</Text>
          </TouchableOpacity>
        </View>

        {survey.syncQueue.length === 0 ? (
          <Text style={styles.emptyQueueText}>
            No offline items waiting in queue. All data synchronized.
          </Text>
        ) : (
          survey.syncQueue.slice(0, 2).map((item, idx) => (
            <View key={item.id} style={styles.queueItem}>
              <View>
                <Text style={styles.queueItemTitle}>
                  {item.lineType.replace('_', ' ')} line // {item.nodes.length} Nodes
                </Text>
                <Text style={styles.queueItemSub}>
                  {item.contractorName} // {new Date(item.startedAt).toLocaleTimeString()}
                </Text>
              </View>
              <View style={[styles.badge, { 
                borderColor: item.lineType === 'HT_33KV' ? Theme.colors.neon33KV : item.lineType === 'HT_11KV' ? Theme.colors.neon11KV : Theme.colors.neon440V 
              }]}>
                <Text style={[styles.badgeText, { 
                  color: item.lineType === 'HT_33KV' ? Theme.colors.neon33KV : item.lineType === 'HT_11KV' ? Theme.colors.neon11KV : Theme.colors.neon440V 
                }]}>
                  QUEUE
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingBottom: 16,
    marginBottom: 24,
  },
  srvLabel: {
    color: Theme.colors.glowCyan,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  srvName: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  srvDiv: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  logoutBtn: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statBox: {
    ...Theme.glassmorphic.container,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    padding: 12,
    position: 'relative',
  },
  statBoxActive: {
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  statVal: {
    color: Theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  syncAlertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.neon33KV,
    position: 'absolute',
    top: 8,
    right: 8,
  },
  panel: {
    ...Theme.glassmorphic.container,
    marginBottom: 24,
    padding: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingBottom: 12,
    marginBottom: 16,
  },
  panelTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
  },
  activePill: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activePillText: {
    color: Theme.colors.glowCyan,
    fontSize: 8,
    fontWeight: 'bold',
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: 'rgba(8, 11, 17, 0.6)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    color: Theme.colors.textPrimary,
    fontSize: 13,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pill: {
    flex: 1,
    marginHorizontal: 3,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pillText: {
    color: Theme.colors.textSecondary,
    fontSize: 11,
    letterSpacing: 0.5,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  launchBtn: {
    ...Theme.glassmorphic.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.3)',
  },
  launchBtnText: {
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 2,
  },
  viewAllText: {
    color: Theme.colors.glowCyan,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  emptyQueueText: {
    color: Theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 14,
  },
  queueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  queueItemTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  queueItemSub: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: 'bold',
  },
});
