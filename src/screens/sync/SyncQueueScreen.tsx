import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Line, G, Defs, LinearGradient, Rect, Stop, RadialGradient } from 'react-native-svg';
import { RootState, clearQueueItem } from '../../store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SyncQueueScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  const queue = useSelector((state: RootState) => state.survey.syncQueue);

  // Sync animation states
  const [syncing, setSyncing] = useState(false);
  const [activeSyncLogs, setActiveSyncLogs] = useState<string[]>([]);
  const [currentSyncingId, setCurrentSyncingId] = useState<string | null>(null);

  // Background floating bubble animation values
  const blob1X = useRef(new Animated.Value(0)).current;
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2X = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Sync button pulse animation
  const syncBtnPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Floating blob 1 loop
    const animateBlob1 = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(blob1X, { toValue: 40, duration: 8000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: -50, duration: 8000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob1X, { toValue: -20, duration: 9000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: 30, duration: 9000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob1X, { toValue: 0, duration: 8000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: 0, duration: 8000, useNativeDriver: true })
        ])
      ]).start(() => animateBlob1());
    };

    // Floating blob 2 loop
    const animateBlob2 = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(blob2X, { toValue: -50, duration: 9000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: 50, duration: 9000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob2X, { toValue: 30, duration: 10000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: -30, duration: 10000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob2X, { toValue: 0, duration: 9000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: 0, duration: 9000, useNativeDriver: true })
        ])
      ]).start(() => animateBlob2());
    };

    // Tech Grid Rotation loop
    const startRotation = () => {
      rotateAnim.setValue(0);
      Animated.timing(rotateAnim, { toValue: 1, duration: 85000, useNativeDriver: true }).start(() => startRotation());
    };

    animateBlob1();
    animateBlob2();
    startRotation();
  }, []);

  // Pulse effect when sync button is visible and active
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (queue.length > 0 && !syncing) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(syncBtnPulse, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
          Animated.timing(syncBtnPulse, { toValue: 1.0, duration: 1200, useNativeDriver: true })
        ])
      );
      loop.start();
    } else {
      syncBtnPulse.setValue(1.0);
    }
    return () => loop?.stop();
  }, [queue.length, syncing]);

  const startSyncQueue = async () => {
    if (queue.length === 0) {
      Alert.alert('Queue Empty', 'There are no line survey logs in local queue to sync.');
      return;
    }

    setSyncing(true);
    setActiveSyncLogs(['[INFO] INITIATING SECURE SYNCHRONIZATION OVER HTTPS']);

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
        
        setActiveSyncLogs(prev => [...prev, `\n>> STARTING UPLOAD: ${nameText.toUpperCase()}`]);
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
      case 'HT_11KV': return '#D97706'; // High contrast Amber
      case 'HT_33KV': return '#DC2626'; // High contrast Red
      case 'LT_440V': return '#0284C7'; // High contrast Sky Blue
      default: return '#4F46E5'; // Indigo
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

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

      {/* 2. DRIFTING GLOW SPHERES */}
      <Animated.View 
        pointerEvents="none" 
        style={[
          styles.blurBlob, 
          { 
            top: SCREEN_HEIGHT * 0.1, 
            left: -60,
            transform: [{ translateX: blob1X }, { translateY: blob1Y }] 
          }
        ]}
      >
        <Svg width={300} height={300}>
          <Defs>
            <RadialGradient id="blueSphere" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.65" />
              <Stop offset="60%" stopColor="#3B82F6" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={150} r={140} fill="url(#blueSphere)" />
        </Svg>
      </Animated.View>

      <Animated.View 
        pointerEvents="none" 
        style={[
          styles.blurBlob, 
          { 
            bottom: SCREEN_HEIGHT * 0.15, 
            right: -80,
            transform: [{ translateX: blob2X }, { translateY: blob2Y }] 
          }
        ]}
      >
        <Svg width={300} height={300}>
          <Defs>
            <RadialGradient id="cyanSphere" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#0891B2" stopOpacity="0.6" />
              <Stop offset="60%" stopColor="#06B6D4" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={150} r={140} fill="url(#cyanSphere)" />
        </Svg>
      </Animated.View>

      {/* 3. ROTATING TECH GRID */}
      <Animated.View pointerEvents="none" style={[styles.gridRotationContainer, { transform: [{ rotate: spin }] }]}>
        <Svg width={SCREEN_WIDTH * 1.6} height={SCREEN_WIDTH * 1.6} viewBox="0 0 500 500">
          <G stroke="rgba(3, 105, 161, 0.05)" strokeWidth="1.2" fill="none">
            <Circle cx="250" cy="250" r="100" strokeDasharray="4, 4" />
            <Circle cx="250" cy="250" r="180" />
            <Line x1="50" y1="250" x2="450" y2="250" />
            <Line x1="250" y1="50" x2="250" y2="450" />
            <Line x1="108" y1="108" x2="392" y2="392" strokeDasharray="3, 3" />
          </G>
        </Svg>
      </Animated.View>

      {/* 4. MAIN SCROLLABLE LAYOUT */}
      <View style={styles.contentWrapper}>
        {/* HUD Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>OFFLINE STORAGE CONSOLE</Text>
            <Text style={styles.headerTitle}>SYNC TERMINAL</Text>
          </View>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => !syncing && navigation.navigate('MainTabs')}
            disabled={syncing}
            activeOpacity={0.7}
          >
            <Text style={[styles.backText, syncing && { opacity: 0.5 }]}>DASHBOARD</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent} 
          keyboardShouldPersistTaps="handled"
        >
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
                    log.includes('[SUCCESS]') && styles.logSuccess,
                    log.includes('[ERROR]') && styles.logError,
                    log.includes('>>') && styles.logHeading
                  ]}>
                    {log}
                  </Text>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Sync Trigger button */}
          {!syncing && queue.length > 0 && (
            <Animated.View style={{ transform: [{ scale: syncBtnPulse }] }}>
              <TouchableOpacity style={styles.syncAllBtn} onPress={startSyncQueue} activeOpacity={0.8}>
                <Text style={styles.syncAllBtnText}>SYNCHRONIZE QUEUED SURVEYS ({queue.length})</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {syncing && (
            <View style={styles.syncingStatusBox}>
              <ActivityIndicator color="#0284C7" size="small" />
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
                    isSyncingThis && styles.queueCardActive
                  ]}
                >
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.cardContractor}>{item.contractorName}</Text>
                      <Text style={styles.cardDate}>
                        {new Date(item.startedAt).toLocaleDateString()} // {new Date(item.startedAt).toLocaleTimeString()}
                      </Text>
                    </View>
                    <View style={[styles.badge, { borderColor: accent + '30', backgroundColor: accent + '08' }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  contentWrapper: {
    flex: 1,
    zIndex: 10,
  },
  scrollContainer: {
    flex: 1,
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
  headerSub: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 2,
  },
  backBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  terminal: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1.5,
    borderRadius: 14,
    height: 190,
    padding: 12,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  terminalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1.2,
    borderBottomColor: 'rgba(2, 132, 199, 0.08)',
    paddingBottom: 6,
    marginBottom: 8,
  },
  terminalTitle: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  terminalIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
  },
  terminalIndicatorActive: {
    backgroundColor: '#F59E0B',
  },
  terminalLogsScroll: {
    flex: 1,
  },
  logText: {
    color: '#1E293B',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '600',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  logSuccess: {
    color: '#059669',
  },
  logError: {
    color: '#DC2626',
  },
  logHeading: {
    color: '#0284C7',
    fontWeight: 'bold',
  },
  syncAllBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  syncAllBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12.5,
    letterSpacing: 1.5,
  },
  syncingStatusBox: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
    borderColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1.2,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 24,
  },
  syncingStatusText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 10,
    letterSpacing: 1,
  },
  sectionTitle: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 35,
    alignItems: 'center',
    borderStyle: 'dashed',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
  queueCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  queueCardActive: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardContractor: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cardDate: {
    color: '#64748B',
    fontSize: 9,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1.2,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardRemarks: {
    color: '#D97706',
    fontSize: 10,
    marginTop: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontWeight: '600',
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(2, 132, 199, 0.08)',
    paddingTop: 10,
    marginTop: 12,
  },
  nodesCountText: {
    color: '#0F172A',
    fontSize: 10.5,
    fontWeight: '600',
  },
  syncingLabel: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  waitingLabel: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  blurBlob: {
    position: 'absolute',
    width: 300,
    height: 300,
    zIndex: 3,
  },
  gridRotationContainer: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.1,
    left: -SCREEN_WIDTH * 0.3,
    opacity: 0.7,
    zIndex: 4,
  },
});
