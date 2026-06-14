import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState } from '../../store';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const auth = useSelector((state: RootState) => state.auth);
  const survey = useSelector((state: RootState) => state.survey);

  const dailyTarget = 5;
  const totalCompleted = survey.completedCount;
  const progressPercent = Math.min(100, Math.round((totalCompleted / dailyTarget) * 100));

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

      {/* 2. SCROLLABLE LAYOUT */}
      <ScrollView 
        style={styles.scrollContainerWrapper} 
        contentContainerStyle={styles.scrollContent} 
        keyboardShouldPersistTaps="handled"
      >
        {/* Top Header Row with Hamburger & Profile Widget */}
        <View style={styles.header}>
          <View style={styles.brandingWrapper}>
            <Text style={styles.brandingIcon}>⚡</Text>
            <Text style={styles.brandingText}>GIS GRID</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileBadge} 
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <View style={styles.profileTextWrapper}>
              <Text style={styles.badgeSrvName}>{auth.surveyorName.split(' ')[0]}</Text>
              <Text style={styles.badgeSrvId}>{auth.surveyorId}</Text>
            </View>
            {auth.profileImage ? (
              <Image source={{ uri: auth.profileImage }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarFallback}>
                <Text style={styles.avatarLetter}>{auth.surveyorName.charAt(0).toUpperCase()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Status Display Title */}
        <View style={styles.hudHeader}>
          <Text style={styles.hudSub}>GIS GRID CONSOLE</Text>
          <Text style={styles.hudTitle}>SYSTEM DASHBOARD</Text>
        </View>

        {/* Stats Cards Row */}
        <View style={styles.statsRow}>
          <TouchableOpacity 
            style={[styles.statBox, survey.syncQueue.length > 0 && styles.statBoxAlert]} 
            onPress={() => navigation.navigate('SyncQueue')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statVal, survey.syncQueue.length > 0 && { color: '#D97706' }]}>
              {survey.syncQueue.length}
            </Text>
            <Text style={styles.statLabel}>LOCAL QUEUE</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.statBox} 
            onPress={() => navigation.navigate('SurveyList')}
            activeOpacity={0.7}
          >
            <Text style={[styles.statVal, { color: '#059669' }]}>{totalCompleted}</Text>
            <Text style={styles.statLabel}>COMPLETED RUNS</Text>
          </TouchableOpacity>

          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: '#0284C7' }]}>1.8m</Text>
            <Text style={styles.statLabel}>GPS ACCURACY</Text>
          </View>
        </View>

        {/* Daily Progress Tracker Panel */}
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>DAILY TARGET PROGRESSION</Text>
            <Text style={styles.progressText}>{totalCompleted}/{dailyTarget} LINES</Text>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
          </View>

          <View style={styles.progressFooter}>
            <Text style={styles.progressSubtext}>GRID TARGET: {progressPercent}% COMPLETED</Text>
            <Text style={styles.statusText}>STATUS: {progressPercent >= 100 ? 'SUCCESS' : 'ACTIVE'}</Text>
          </View>
        </View>

        {/* Quick Navigation Cards */}
        <Text style={styles.sectionTitle}>FIELD RUN COMMANDS</Text>

        {/* Card 1: Surveys List */}
        <TouchableOpacity 
          style={styles.navCard}
          onPress={() => navigation.navigate('SurveyList')}
          activeOpacity={0.75}
        >
          <View style={styles.navCardIconBox}>
            <Text style={styles.navCardIcon}>🗺️</Text>
          </View>
          <View style={styles.navCardContent}>
            <Text style={styles.navCardTitle}>SURVEY LOGS & FAB</Text>
            <Text style={styles.navCardDesc}>
              Manage ongoing grid runs, filter by voltage class, or launch new surveys via floating icon.
            </Text>
          </View>
          <Text style={styles.navArrow}>&gt;</Text>
        </TouchableOpacity>

        {/* Card 2: Offline Sync Queue */}
        <TouchableOpacity 
          style={styles.navCard}
          onPress={() => navigation.navigate('SyncQueue')}
          activeOpacity={0.75}
        >
          <View style={[styles.navCardIconBox, { borderColor: 'rgba(139, 92, 246, 0.25)', backgroundColor: 'rgba(139, 92, 246, 0.05)' }]}>
            <Text style={styles.navCardIcon}>📡</Text>
          </View>
          <View style={styles.navCardContent}>
            <Text style={styles.navCardTitle}>OFFLINE SYNC TERMINAL</Text>
            <Text style={styles.navCardDesc}>
              Synchronize cached coordinates, sag details, and compliance photos to PostGIS database.
            </Text>
          </View>
          <Text style={styles.navArrow}>&gt;</Text>
        </TouchableOpacity>

        {/* Card 3: Profile Screen */}
        <TouchableOpacity 
          style={styles.navCard}
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.75}
        >
          <View style={[styles.navCardIconBox, { borderColor: 'rgba(16, 185, 129, 0.25)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }]}>
            <Text style={styles.navCardIcon}>👤</Text>
          </View>
          <View style={styles.navCardContent}>
            <Text style={styles.navCardTitle}>SURVEYOR SAFETY GATE</Text>
            <Text style={styles.navCardDesc}>
              View safety certification, division assignment, or capture front compliance avatar picture.
            </Text>
          </View>
          <Text style={styles.navArrow}>&gt;</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContainerWrapper: {
    flex: 1,
    zIndex: 10,
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
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingBottom: 16,
    marginBottom: 20,
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
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
  },
  profileTextWrapper: {
    marginRight: 10,
    alignItems: 'flex-end',
  },
  badgeSrvName: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeSrvId: {
    color: '#0284C7',
    fontSize: 8,
    fontFamily: 'System',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: '#0284C7',
    borderWidth: 1,
  },
  headerAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: '#0284C7',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  hudHeader: {
    marginBottom: 20,
  },
  hudSub: {
    color: '#0284C7',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  hudTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 14,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    padding: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  statBoxAlert: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  statVal: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  panel: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  progressText: {
    color: '#0284C7',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0284C7',
    borderRadius: 2,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressSubtext: {
    color: '#64748B',
    fontSize: 8.5,
  },
  statusText: {
    color: '#0284C7',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  navCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 14,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  navCardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderColor: 'rgba(2, 132, 199, 0.18)',
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
  },
  navCardIcon: {
    fontSize: 18,
  },
  navCardContent: {
    flex: 1,
    paddingHorizontal: 14,
  },
  navCardTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  navCardDesc: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 2,
    lineHeight: 13,
  },
  navArrow: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
