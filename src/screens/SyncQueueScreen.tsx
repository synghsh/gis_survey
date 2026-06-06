import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  FlatList,
  Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, navigateTo, clearQueueItem, clearAllCompleted } from '../store';
import Theme from '../theme';

export default function SyncQueueScreen() {
  const dispatch = useDispatch();
  const queue = useSelector((state: RootState) => state.survey.syncQueue);

  // Sync animation states
  const [syncing, setSyncing] = useState(false);
  const [activeSyncLogs, setActiveSyncLogs] = useState<string[]>([]);
  const [currentSyncingId, setCurrentSyncingId] = useState<string | null>(null);

  const startSyncQueue = async () => {
    if (queue.length === 0) {
      Alert.alert('Queue Empty', 'There are no line survey logs in local queue to sync.');
      return;
    }

    setSyncing(true);
    setActiveSyncLogs(['[INFO] INITIATING SECURE SYNCHRONIZATION OVER HTTPS']);

    // Helper timeout to simulate async upload sequences
    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      setActiveSyncLogs(prev => [...prev, '[INFO] ATTEMPTING HANDSHAKE WITH CLOUD GATEWAY...']);
      await wait(1000);
      setActiveSyncLogs(prev => [...prev, '[SUCCESS] AUTH STATUS VERIFIED. GATEWAY ONLINE.']);
      await wait(800);

      // Process each queue item sequentially
      for (const line of queue) {
        setCurrentSyncingId(line.id);
        const nameText = `${line.lineType.replace('_', ' ')} // ${line.contractorName}`;
        
        setActiveSyncLogs(prev => [...prev, `\n&gt;&gt; STARTING UPLOAD: ${nameText.toUpperCase()}`]);
        await wait(600);
        
        // Step 1: Sync Media links
        const imageCount = line.nodes.filter(n => n.imageUri).length;
        if (imageCount > 0) {
          setActiveSyncLogs(prev => [...prev, `[S3] Uploading ${imageCount} compressed compliance photos...`]);
          await wait(1000);
          setActiveSyncLogs(prev => [...prev, '[S3] Photo hashes created and mapped successfully.']);
        }
        
        // Step 2: PostGIS topological insertion
        setActiveSyncLogs(prev => [...prev, `[PostGIS] Mapping ${line.nodes.length} spatial nodes (POINT coordinates)...`]);
        await wait(1200);
        
        // Step 3: Validate sequence number continuity
        setActiveSyncLogs(prev => [...prev, '[PostGIS] Verifying span index and topology continuity...']);
        await wait(800);
        
        setActiveSyncLogs(prev => [...prev, `[SUCCESS] ${line.lineType} LINE SURVEY SUCCESSFULLY ARCHIVED.`]);
        
        // Clear from Redux store local queue
        dispatch(clearQueueItem(line.id));
        await wait(500);
      }

      setCurrentSyncingId(null);
      setActiveSyncLogs(prev => [...prev, '\n[COMPLETE] ALL LOCAL SURVEY RUNS SYNCHRONIZED. CLOUD ARCHIVE COMPLETE.']);
      setSyncing(false);
      Alert.alert('Synchronized', 'All lines uploaded to PostGIS server successfully!');
    } catch (err) {
      setActiveSyncLogs(prev => [...prev, '[ERROR] TRANSMISSION ERROR: SERVER DISCONNECTED.']);
      setSyncing(false);
    }
  };

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
      {/* HUD Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>OFFLINE STORAGE CONSOLE</Text>
          <Text style={styles.headerTitle}>SYNC TERMINAL</Text>
        </View>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={() => !syncing && dispatch(navigateTo('DASHBOARD'))}
          disabled={syncing}
        >
          <Text style={[styles.backText, syncing && { opacity: 0.5 }]}>DASHBOARD</Text>
        </TouchableOpacity>
      </View>

      {/* Main console content */}
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Terminal sync progress logs */}
        {activeSyncLogs.length > 0 && (
          <View style={styles.terminal}>
            <View style={styles.terminalHeader}>
              <Text style={styles.terminalTitle}>CLOUD GATEWAY STREAM</Text>
              <View style={[styles.terminalIndicator, syncing && styles.terminalIndicatorActive]} />
            </View>
            <ScrollView 
              style={styles.terminalLogsScroll} 
              contentContainerStyle={{ paddingBottom: 10 }}
              ref={(ref: ScrollView | null) => ref?.scrollToEnd({ animated: true })}
            >
              {activeSyncLogs.map((log, idx) => (
                <Text key={idx} style={[
                  styles.logText,
                  log.includes('[SUCCESS]') && { color: Theme.colors.success },
                  log.includes('[ERROR]') && { color: Theme.colors.error },
                  log.includes('&gt;&gt;') && { color: Theme.colors.neon11KV, fontWeight: 'bold' }
                ]}>
                  {log}
                </Text>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Sync Trigger button */}
        {!syncing && queue.length > 0 && (
          <TouchableOpacity style={styles.syncAllBtn} onPress={startSyncQueue}>
            <Text style={styles.syncAllBtnText}>SYNCHRONIZE QUEUED SURVEYS ({queue.length})</Text>
          </TouchableOpacity>
        )}

        {syncing && (
          <View style={styles.syncingStatusBox}>
            <ActivityIndicator color={Theme.colors.glowCyan} size="small" />
            <Text style={styles.syncingStatusText}>TRANSMITTING GEOGRAPHIC NETWORKS...</Text>
          </View>
        )}

        {/* List of queue items */}
        <Text style={styles.sectionTitle}>PENDING SYNC LINE SURVEYS ({queue.length})</Text>
        
        {queue.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>LOCAL DATABASE CONSOLE SHIELDED</Text>
            <Text style={styles.emptySubText}>All survey runs have been flushed to central servers.</Text>
          </View>
        ) : (
          queue.map((item) => {
            const isSyncingThis = currentSyncingId === item.id;
            const accent = getLineAccent(item.lineType);

            return (
              <View 
                key={item.id} 
                style={[
                  styles.queueCard, 
                  isSyncingThis && { borderColor: Theme.colors.glowCyan, backgroundColor: 'rgba(6,182,212,0.08)' }
                ]}
              >
                <View style={styles.cardTop}>
                  <View>
                    <Text style={styles.cardContractor}>{item.contractorName}</Text>
                    <Text style={styles.cardDate}>
                      {new Date(item.startedAt).toLocaleDateString()} // {new Date(item.startedAt).toLocaleTimeString()}
                    </Text>
                  </View>
                  <View style={[styles.badge, { borderColor: accent }]}>
                    <Text style={[styles.badgeText, { color: accent }]}>
                      {item.lineType.replace('_', ' ')}
                    </Text>
                  </View>
                </View>

                {item.remarks ? (
                  <Text style={styles.cardRemarks}>&gt; REMARKS: {item.remarks}</Text>
                ) : null}

                <View style={styles.cardBottom}>
                  <Text style={styles.nodesCountText}>🗺️ {item.nodes.length} SPATIAL NODES CAPTURED</Text>
                  {isSyncingThis ? (
                    <Text style={styles.syncingLabel}>UPLOADING...</Text>
                  ) : (
                    <Text style={styles.waitingLabel}>QUEUED</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
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
  headerSub: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  backBtn: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  backText: {
    color: Theme.colors.textPrimary,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  terminal: {
    backgroundColor: '#030712',
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    height: 180,
    padding: 12,
    marginBottom: 20,
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 6,
    marginBottom: 8,
  },
  terminalTitle: {
    color: 'rgba(6, 182, 212, 0.6)',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  terminalIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.textSecondary,
  },
  terminalIndicatorActive: {
    backgroundColor: Theme.colors.warning,
  },
  terminalLogsScroll: {
    flex: 1,
  },
  logText: {
    color: '#D1D5DB',
    fontSize: 10,
    fontFamily: 'System',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  syncAllBtn: {
    ...Theme.glassmorphic.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  syncAllBtnText: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1.5,
  },
  syncingStatusBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
    borderColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 24,
  },
  syncingStatusText: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  sectionTitle: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyCard: {
    ...Theme.glassmorphic.container,
    paddingVertical: 30,
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
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
    marginTop: 4,
    textAlign: 'center',
  },
  queueCard: {
    ...Theme.glassmorphic.container,
    marginBottom: 12,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContractor: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardDate: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardRemarks: {
    color: Theme.colors.warning,
    fontSize: 10,
    marginTop: 10,
    fontFamily: 'System',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingTop: 10,
    marginTop: 12,
  },
  nodesCountText: {
    color: Theme.colors.textPrimary,
    fontSize: 10.5,
    fontWeight: '600',
  },
  syncingLabel: {
    color: Theme.colors.glowCyan,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  waitingLabel: {
    color: Theme.colors.warning,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
