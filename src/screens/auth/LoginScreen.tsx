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
  Dimensions,
} from 'react-native';
import Theme from '../../theme';
import Svg, { Circle, Line, G, Defs, LinearGradient, Rect, Stop, Path, RadialGradient } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface LoginScreenProps {
  onLogin: (username: string, surveyorId: string, division: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [logText, setLogText] = useState('READY TO AUTHENTICATE');
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Entrance animations
  const cardFade = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(30)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Background floating bubble animation values
  const blob1X = useRef(new Animated.Value(0)).current;
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2X = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Action button breathe animation
  const buttonPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Card Entrance
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(cardSlide, { toValue: 0, duration: 800, useNativeDriver: true })
    ]).start();

    // Floating blob 1 loop
    const animateBlob1 = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(blob1X, { toValue: 50, duration: 8000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: -60, duration: 8000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob1X, { toValue: -30, duration: 9000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: 40, duration: 9000, useNativeDriver: true })
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
          Animated.timing(blob2X, { toValue: -60, duration: 9000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: 60, duration: 9000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob2X, { toValue: 40, duration: 10000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: -40, duration: 10000, useNativeDriver: true })
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
      Animated.timing(rotateAnim, { toValue: 1, duration: 80000, useNativeDriver: true }).start(() => startRotation());
    };

    // Button pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, { toValue: 1.025, duration: 1500, useNativeDriver: true }),
        Animated.timing(buttonPulse, { toValue: 1.0, duration: 1500, useNativeDriver: true })
      ])
    ).start();

    animateBlob1();
    animateBlob2();
    startRotation();
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

  const handleLoginClick = () => {
    setLoading(true);
    setLogText('INITIALIZING HANDSHAKE...');
    const finalUsername = username.trim() || 'Surveyor';
    
    setTimeout(() => {
      setLogText('VERIFYING SURVEYOR SIGNATURE...');
      setTimeout(() => {
        setLogText('ESTABLISHING SECURE OFFLINE SESSION...');
        setTimeout(() => {
          setLoading(false);
          onLogin(finalUsername, 'SRV-2026-OK' + Math.floor(100 + Math.random() * 900), 'Central Division');
        }, 800);
      }, 800);
    }, 800);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
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

      {/* 2. DRIFTING GLOW SPHERES (radial gradient glow layers) */}
      <Animated.View 
        pointerEvents="none" 
        style={[
          styles.blurBlob, 
          { 
            top: SCREEN_HEIGHT * 0.08, 
            left: -60,
            transform: [{ translateX: blob1X }, { translateY: blob1Y }] 
          }
        ]}
      >
        <Svg width={300} height={300}>
          <Defs>
            <RadialGradient id="blueSphere" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.75" />
              <Stop offset="60%" stopColor="#3B82F6" stopOpacity="0.45" />
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
            bottom: SCREEN_HEIGHT * 0.08, 
            right: -80,
            transform: [{ translateX: blob2X }, { translateY: blob2Y }] 
          }
        ]}
      >
        <Svg width={300} height={300}>
          <Defs>
            <RadialGradient id="cyanSphere" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#0891B2" stopOpacity="0.7" />
              <Stop offset="60%" stopColor="#06B6D4" stopOpacity="0.4" />
              <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={150} r={140} fill="url(#cyanSphere)" />
        </Svg>
      </Animated.View>

      {/* 4. ROTATING TECH GRAPH */}
      <Animated.View pointerEvents="none" style={[styles.gridRotationContainer, { transform: [{ rotate: spin }] }]}>
        <Svg width={SCREEN_WIDTH * 1.8} height={SCREEN_WIDTH * 1.8} viewBox="0 0 500 500">
          <G stroke="rgba(3, 105, 161, 0.05)" strokeWidth="1" fill="none">
            <Circle cx="250" cy="250" r="80" strokeDasharray="3, 3" />
            <Circle cx="250" cy="250" r="140" />
            <Circle cx="250" cy="250" r="200" strokeDasharray="6, 4" />
            <Line x1="50" y1="250" x2="450" y2="250" />
            <Line x1="250" y1="50" x2="250" y2="450" />
            <Line x1="108" y1="108" x2="392" y2="392" strokeDasharray="4, 2" />
            <Line x1="108" y1="392" x2="392" y2="108" />
            <Circle cx="250" cy="110" r="5" fill="rgba(2, 132, 199, 0.3)" />
            <Circle cx="110" cy="250" r="5.5" fill="rgba(2, 132, 199, 0.3)" />
          </G>
        </Svg>
      </Animated.View>

      {/* 5. SCROLLABLE LAYOUT */}
      <ScrollView style={styles.scrollContainerWrapper} contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.topHudLine}>
          <Text style={styles.topHudText}>GIS SURVEY ENGINE // SECURE GATEWAY</Text>
          <View style={styles.liveIndicator} />
        </View>

        {/* CARD BOX */}
        <Animated.View style={[styles.card, { opacity: cardFade, transform: [{ translateY: cardSlide }, { translateX: shakeAnim }] }]}>
          <View style={styles.cardHeader}>
            <View style={styles.lockIconContainer}><Text style={styles.lockIcon}>🔑</Text></View>
            <Text style={styles.cardTitle}>SURVEYOR ACCESS</Text>
            <Text style={styles.cardSubtitle}>VERIFY FIELD CREDENTIALS</Text>
          </View>

          <View style={styles.form}>
            {/* Username */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>SURVEYOR USERNAME</Text>
              <View style={[styles.inputWrapper, focusedInput === 'username' && styles.inputFocused]}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter username"
                  placeholderTextColor="rgba(30, 41, 59, 0.35)"
                  value={username}
                  onChangeText={setUsername}
                  onFocus={() => setFocusedInput('username')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>SECURITY PASSWORD</Text>
              <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputFocused]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(30, 41, 59, 0.35)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity style={styles.toggleShowBtn} onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.toggleShowText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pulsing Breathing Action Button */}
            <Animated.View style={{ transform: [{ scale: buttonPulse }] }}>
              <TouchableOpacity
                style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                onPress={handleLoginClick}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.loginButtonText}>AUTHORIZE & LINK CHANNEL</Text>}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Handshake logs */}
          <View style={styles.logsHud}>
            <View style={styles.logHeader}>
              <Text style={styles.logLabel}>GRID TRANSACTION STREAM</Text>
              <View style={[styles.logIndicator, loading && styles.logIndicatorPulse]} />
            </View>
            <Text style={[styles.logText, logText.startsWith('ERROR') && styles.logTextError]}>&gt; {logText}</Text>
          </View>
        </Animated.View>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>SECURE RSA-4096 ENCRYPTED SESSION // EXP-V56</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContainerWrapper: { flex: 1, zIndex: 10 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 50 },
  
  // BACKGROUND LAYERS
  blurBlob: { position: 'absolute', width: 300, height: 300, zIndex: 3 },
  gridRotationContainer: { position: 'absolute', top: SCREEN_HEIGHT * 0.05, left: -SCREEN_WIDTH * 0.4, opacity: 0.7, zIndex: 4 },

  topHudLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderColor: 'rgba(2, 132, 199, 0.12)', borderBottomWidth: 1.2, paddingBottom: 8, marginBottom: 30 },
  topHudText: { color: '#0284C7', fontSize: 9.5, fontWeight: '800', letterSpacing: 1.5 },
  liveIndicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },

  // CARD
  card: { backgroundColor: 'rgba(255, 255, 255, 0.85)', borderColor: 'rgba(255, 255, 255, 0.7)', borderWidth: 1.5, borderRadius: 20, padding: 24, shadowColor: '#0284C7', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  cardHeader: { marginBottom: 20, alignItems: 'center', borderColor: 'rgba(2, 132, 199, 0.08)', borderBottomWidth: 1.2, paddingBottom: 16 },
  lockIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(2, 132, 199, 0.06)', borderColor: 'rgba(2, 132, 199, 0.18)', borderWidth: 1.2, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  lockIcon: { fontSize: 18 },
  cardTitle: { color: '#0F172A', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  cardSubtitle: { color: '#0284C7', fontSize: 9, letterSpacing: 2, marginTop: 4, fontWeight: 'bold' },

  form: { width: '100%' },
  inputContainer: { marginBottom: 18 },
  label: { color: '#64748B', fontSize: 8.5, fontWeight: '800', letterSpacing: 1.2, marginBottom: 6 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(2, 132, 199, 0.15)', borderWidth: 1.2, borderRadius: 10, paddingHorizontal: 12 },
  inputIcon: { fontSize: 14, color: '#64748B', marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, color: '#1E293B', fontSize: 13.5, fontWeight: '600' },
  inputFocused: { borderColor: '#0284C7' },
  toggleShowBtn: { padding: 6 },
  toggleShowText: { color: '#0284C7', fontSize: 8.5, fontWeight: '800', letterSpacing: 1 },

  // BUTTON
  loginButton: { backgroundColor: '#0284C7', borderRadius: 10, paddingVertical: 14, alignItems: 'center', shadowColor: '#0284C7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  loginButtonDisabled: { opacity: 0.6 },
  loginButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 12.5, letterSpacing: 1.5 },

  // LOGS PANEL
  logsHud: { marginTop: 20, backgroundColor: 'rgba(240, 249, 255, 0.8)', borderColor: 'rgba(2, 132, 199, 0.15)', borderWidth: 1, borderRadius: 8, padding: 12 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  logLabel: { color: '#0369A1', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  logIndicator: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#0284C7' },
  logIndicatorPulse: { backgroundColor: '#F59E0B' },
  logText: { color: '#1E293B', fontSize: 10, fontFamily: 'System', fontWeight: '700', letterSpacing: 0.5 },
  logTextError: { color: '#EF4444' },

  footerInfo: { marginTop: 30, alignItems: 'center' },
  footerText: { color: '#94A3B8', fontSize: 8.5, fontWeight: '600', letterSpacing: 1 },
});
