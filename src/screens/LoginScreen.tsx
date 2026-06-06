import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Theme from '../theme';

interface LoginScreenProps {
  onLogin: (username: string, surveyorId: string, division: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  // Input states
  const [username, setUsername] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [division, setDivision] = useState('Central Division');
  
  // Interactive UI states
  const [loading, setLoading] = useState(false);
  const [logText, setLogText] = useState('READY TO AUTHENTICATE');
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  // Animation Refs
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Available divisions
  const divisions = [
    'Central Division',
    'North Grid division',
    'Southern HT distribution',
    'East Coastal division',
    'West Rural electrification'
  ];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(cardSlide, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 80, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 80, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = () => {
    if (!username.trim() || !surveyorId.trim()) {
      setLogText('ERROR: CREDENTIALS CANNOT BE BLANK');
      triggerShake();
      return;
    }

    setLoading(true);
    setLogText('INITIALIZING HANDSHAKE...');

    // Simulate cyber auth logging process
    setTimeout(() => {
      setLogText('VERIFYING SURVEYOR SIGNATURE...');
      setTimeout(() => {
        setLogText('ESTABLISHING SECURE OFFLINE SESSION...');
        setTimeout(() => {
          setLoading(false);
          onLogin(username.trim(), surveyorId.trim(), division);
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Subtle top HUD line */}
        <View style={styles.topHudLine}>
          <Text style={styles.topHudText}>SECURE TERMINAL // PORT 443</Text>
          <View style={styles.liveIndicator} />
        </View>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardFade,
              transform: [{ translateY: cardSlide }, { translateX: shakeAnim }],
            },
          ]}
        >
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>PORTAL ACCESS</Text>
            <Text style={styles.cardSubtitle}>VERIFY SURVEYOR IDENTITY</Text>
          </View>

          {/* Input Form */}
          <View style={styles.form}>
            {/* Surveyor Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>SURVEYOR FULL NAME</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'username' && styles.inputFocused,
                ]}
                placeholder="Enter full name"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  setLogText('WRITING NAME DATA...');
                }}
                onFocus={() => setFocusedInput('username')}
                onBlur={() => setFocusedInput(null)}
                autoCorrect={false}
              />
            </View>

            {/* Surveyor ID */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>SURVEYOR ID / CERTIFICATE NO</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedInput === 'surveyorId' && styles.inputFocused,
                ]}
                placeholder="e.g. SRV-2026-889"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                value={surveyorId}
                onChangeText={(text) => {
                  setSurveyorId(text);
                  setLogText('WRITING ID DATA...');
                }}
                onFocus={() => setFocusedInput('surveyorId')}
                onBlur={() => setFocusedInput(null)}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>

            {/* Division dropdown selector */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>ASSIGNED GRID DIVISION</Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  showDropdown && styles.dropdownButtonActive,
                ]}
                onPress={() => setShowDropdown(!showDropdown)}
              >
                <Text style={styles.dropdownButtonText}>{division}</Text>
                <Text style={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showDropdown && (
                <View style={styles.dropdownList}>
                  {divisions.map((div, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.dropdownItem,
                        division === div && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setDivision(div);
                        setShowDropdown(false);
                        setLogText(`GRID SWAPPED TO: ${div.toUpperCase()}`);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          division === div && styles.dropdownItemTextActive,
                        ]}
                      >
                        {div}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Auth Action Button */}
            <TouchableOpacity
              style={[styles.loginButton, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={Theme.colors.glowCyan} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>INITIATE SECURITY LINK</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Logging HUD */}
          <View style={styles.logsHud}>
            <View style={styles.logHeader}>
              <Text style={styles.logLabel}>SYSTEM LOGS</Text>
              <View style={[styles.logIndicator, loading && styles.logIndicatorPulse]} />
            </View>
            <Text style={[styles.logText, logText.startsWith('ERROR') && styles.logTextError]}>
              &gt; {logText}
            </Text>
          </View>
        </Animated.View>

        {/* HUD Info Text */}
        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>
            ENCRYPTED AES-256 SURVEY DB // VERSION 56.0.0
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
  },
  topHudLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderColor: 'rgba(6, 182, 212, 0.1)',
    borderBottomWidth: 1,
    paddingBottom: 8,
    marginBottom: 40,
  },
  topHudText: {
    color: 'rgba(6, 182, 212, 0.4)',
    fontSize: 10,
    fontFamily: 'System',
    letterSpacing: 2,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Theme.colors.success,
    shadowColor: Theme.colors.success,
    shadowRadius: 3,
    shadowOpacity: 0.6,
  },
  card: {
    ...Theme.glassmorphic.container,
    width: '100%',
    padding: 24,
    backgroundColor: 'rgba(17, 24, 39, 0.82)', // slightly more solid glass
  },
  cardHeader: {
    marginBottom: 24,
    alignItems: 'center',
    borderColor: 'rgba(255,255,255,0.05)',
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  cardTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 3,
  },
  cardSubtitle: {
    color: Theme.colors.glowCyan,
    fontSize: 10,
    letterSpacing: 2.5,
    marginTop: 4,
    fontWeight: 'bold',
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
    position: 'relative',
  },
  label: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(8, 11, 17, 0.6)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: Theme.colors.textPrimary,
    fontSize: 14,
    fontFamily: 'System',
  },
  inputFocused: {
    borderColor: Theme.colors.glowCyan,
    shadowColor: Theme.colors.glowCyan,
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 11, 17, 0.6)',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownButtonActive: {
    borderColor: Theme.colors.glowCyan,
  },
  dropdownButtonText: {
    color: Theme.colors.textPrimary,
    fontSize: 14,
  },
  dropdownArrow: {
    color: Theme.colors.glowCyan,
    fontSize: 10,
  },
  dropdownList: {
    backgroundColor: 'rgba(17, 24, 39, 0.95)',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1,
    borderRadius: 6,
    marginTop: 6,
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    maxHeight: 180,
    overflow: 'scroll',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  dropdownItemText: {
    color: Theme.colors.textSecondary,
    fontSize: 13,
  },
  dropdownItemTextActive: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
  },
  loginButton: {
    ...Theme.glassmorphic.button,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonDisabled: {
    opacity: 0.5,
  },
  loginButtonText: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
  logsHud: {
    marginTop: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logLabel: {
    color: 'rgba(6, 182, 212, 0.5)',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  logIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.glowCyan,
  },
  logIndicatorPulse: {
    backgroundColor: Theme.colors.warning,
  },
  logText: {
    color: '#34D399', // soft green terminal text
    fontSize: 10,
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
  logTextError: {
    color: Theme.colors.error,
  },
  footerInfo: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.2)',
    fontSize: 9,
    fontFamily: 'System',
    letterSpacing: 1,
  },
});
