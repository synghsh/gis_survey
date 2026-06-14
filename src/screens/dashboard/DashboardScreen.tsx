import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { RootState } from '../../store';
import Theme from '../../theme';

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const auth = useSelector((state: RootState) => state.auth);
  const survey = useSelector((state: RootState) => state.survey);

  // Constants
  const dailyTarget = 5; // e.g. target 5 line surveys logged
  const totalCompleted = survey.completedCount;
  const progressPercent = Math.min(100, Math.round((totalCompleted / dailyTarget) * 100));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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

      {/* Cyber Grid HUD Status Display */}
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
          <Text style={[styles.statVal, survey.syncQueue.length > 0 && { color: Theme.colors.warning }]}>
            {survey.syncQueue.length}
          </Text>
          <Text style={styles.statLabel}>LOCAL QUEUE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statBox} 
          onPress={() => navigation.navigate('SurveyList')}
          activeOpacity={0.7}
        >
          <Text style={[styles.statVal, { color: Theme.colors.success }]}>{totalCompleted}</Text>
          <Text style={styles.statLabel}>COMPLETED RUNS</Text>
        </TouchableOpacity>

        <View style={styles.statBox}>
          <Text style={[styles.statVal, { color: Theme.colors.glowCyan }]}>1.8m</Text>
          <Text style={styles.statLabel}>GPS ACCURACY</Text>
        </View>
      </View>

      {/* Daily Progress Tracker Panel */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>DAILY TARGET PROGRESSION</Text>
          <Text style={styles.progressText}>{totalCompleted}/{dailyTarget} LINES</Text>
        </View>
        
        {/* Progression Bar */}
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
        <View style={[styles.navCardIconBox, { borderColor: Theme.colors.glowPurple }]}>
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
        <View style={[styles.navCardIconBox, { borderColor: Theme.colors.success }]}>
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
    marginBottom: 20,
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
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 1,
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
    color: Theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  badgeSrvId: {
    color: Theme.colors.glowCyan,
    fontSize: 8,
    fontFamily: 'System',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1,
  },
  headerAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    color: Theme.colors.glowCyan,
    fontSize: 12,
    fontWeight: 'bold',
  },
  hudHeader: {
    marginBottom: 20,
  },
  hudSub: {
    color: Theme.colors.glowCyan,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  hudTitle: {
    color: Theme.colors.textPrimary,
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
    ...Theme.glassmorphic.container,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    padding: 12,
  },
  statBoxAlert: {
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  statVal: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  statBoxTextAlert: {
    color: Theme.colors.warning,
  },
  statLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 4,
  },
  panel: {
    ...Theme.glassmorphic.container,
    marginBottom: 24,
    padding: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  panelTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  progressText: {
    color: Theme.colors.glowCyan,
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  progressBarBg: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Theme.colors.glowCyan,
    borderRadius: 2,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  progressSubtext: {
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
  },
  statusText: {
    color: Theme.colors.glowCyan,
    fontSize: 8.5,
    fontWeight: 'bold',
  },
  sectionTitle: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  navCard: {
    ...Theme.glassmorphic.container,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 14,
    backgroundColor: 'rgba(17, 24, 39, 0.65)',
  },
  navCardIconBox: {
    width: 42,
    height: 42,
    borderRadius: 6,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  navCardIcon: {
    fontSize: 18,
  },
  navCardContent: {
    flex: 1,
    paddingHorizontal: 14,
  },
  navCardTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  navCardDesc: {
    color: Theme.colors.textSecondary,
    fontSize: 9.5,
    marginTop: 2,
    lineHeight: 13,
  },
  navArrow: {
    color: Theme.colors.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
