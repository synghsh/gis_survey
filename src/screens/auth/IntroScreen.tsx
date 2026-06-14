import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Line, Circle, Path, Defs, LinearGradient, Stop, Rect, RadialGradient } from 'react-native-svg';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
  z: number;
}

export default function IntroScreen({ onEnter }: { onEnter: () => void }) {
  const [angleY, setAngleY] = useState(0.4);
  const [angleX, setAngleX] = useState(0.15);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [systemStatus, setSystemStatus] = useState('SYSTEM CHECK');

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  // Drifting Spheres animations
  const blob1X = useRef(new Animated.Value(0)).current;
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2X = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;

  // Grid config
  const gridLines: { p1: Point3D; p2: Point3D }[] = [];
  const gridY = 85;
  const gridSize = 120;
  const gridStep = 40;

  for (let x = -gridSize; x <= gridSize; x += gridStep) {
    gridLines.push({ p1: { x, y: gridY, z: -gridSize }, p2: { x, y: gridY, z: gridSize } });
  }
  for (let z = -gridSize; z <= gridSize; z += gridStep) {
    gridLines.push({ p1: { x: -gridSize, y: gridY, z }, p2: { x: gridSize, y: gridY, z } });
  }

  // Tower Config
  const baseWidth = 35;
  const midWidth = 15;
  const topWidth = 8;
  const towerHeightY = -90;

  const towerVertices: { [key: string]: Point3D } = {
    b1: { x: -baseWidth, y: gridY, z: -baseWidth }, b2: { x: baseWidth, y: gridY, z: -baseWidth },
    b3: { x: baseWidth, y: gridY, z: baseWidth }, b4: { x: -baseWidth, y: gridY, z: baseWidth },
    m1: { x: -midWidth, y: 0, z: -midWidth }, m2: { x: midWidth, y: 0, z: -midWidth },
    m3: { x: midWidth, y: 0, z: midWidth }, m4: { x: -midWidth, y: 0, z: midWidth },
    u1: { x: -topWidth, y: -60, z: -topWidth }, u2: { x: topWidth, y: -60, z: -topWidth },
    u3: { x: topWidth, y: -60, z: topWidth }, u4: { x: -topWidth, y: -60, z: topWidth },
    peak: { x: 0, y: towerHeightY - 15, z: 0 },
    armL1: { x: -45, y: -50, z: 0 }, armR1: { x: 45, y: -50, z: 0 },
    armL2: { x: -35, y: -20, z: 0 }, armR2: { x: 35, y: -20, z: 0 },
  };

  const towerEdges = [
    ['b1', 'm1'], ['b2', 'm2'], ['b3', 'm3'], ['b4', 'm4'],
    ['m1', 'u1'], ['m2', 'u2'], ['m3', 'u3'], ['m4', 'u4'],
    ['u1', 'peak'], ['u2', 'peak'], ['u3', 'peak'], ['u4', 'peak'],
    ['b1', 'b2'], ['b2', 'b3'], ['b3', 'b4'], ['b4', 'b1'],
    ['m1', 'm2'], ['m2', 'm3'], ['m3', 'm4'], ['m4', 'm1'],
    ['u1', 'u2'], ['u2', 'u3'], ['u3', 'u4'], ['u4', 'u1'],
    ['b1', 'm2'], ['b2', 'm1'], ['b2', 'm3'], ['b3', 'm2'],
    ['b3', 'm4'], ['b4', 'm3'], ['b4', 'm1'], ['b1', 'm4'],
    ['m1', 'u2'], ['m2', 'u1'], ['m2', 'u3'], ['m3', 'u2'],
    ['m3', 'u4'], ['m4', 'u3'], ['m4', 'u1'], ['m1', 'u4'],
    ['u1', 'armL1'], ['u2', 'armR1'], ['m1', 'armL2'], ['m2', 'armR2'],
  ];

  const cables = [
    { from: 'armL1', toLeft: { x: -150, y: -30, z: -150 }, toRight: { x: -150, y: -30, z: 150 } },
    { from: 'armR1', toLeft: { x: 150, y: -30, z: -150 }, toRight: { x: 150, y: -30, z: 150 } },
    { from: 'armL2', toLeft: { x: -140, y: -10, z: -150 }, toRight: { x: -140, y: -10, z: 150 } },
    { from: 'armR2', toLeft: { x: 140, y: -10, z: -150 }, toRight: { x: 140, y: -10, z: 150 } },
  ];

  const project = (pt: Point3D): Point2D => {
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const x1 = pt.x * cosY - pt.z * sinY;
    const z1 = pt.x * sinY + pt.z * cosY;

    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const y2 = pt.y * cosX - z1 * sinX;
    const z2 = pt.y * sinX + z1 * cosX;

    const cameraDistance = 250;
    const scale = 180 / (z2 + cameraDistance);
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT * 0.38;

    return { x: centerX + x1 * scale, y: centerY + y2 * scale, z: z2 };
  };

  useEffect(() => {
    // Entrances
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 1000, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
    ]).start();

    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(buttonPulse, { toValue: 1.0, duration: 1500, useNativeDriver: true })
      ])
    ).start();

    // Loading sequence
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(interval);
          setSystemStatus('SYSTEM READY');
          return 100;
        }
        if (next === 20) setSystemStatus('GRID SYNCHRONIZATION');
        if (next === 45) setSystemStatus('GPS RECEIVER WARMUP');
        if (next === 75) setSystemStatus('LOCAL DATABASE CHECK');
        if (next === 90) setSystemStatus('DECRYPTION KEYS READY');
        return next;
      });
    }, 35);

    // Continuous rotation
    let animationFrameId: number;
    let rotationAngle = 0.4;
    const animateRotation = () => {
      rotationAngle += 0.006;
      setAngleY(rotationAngle);
      setAngleX(0.18 + Math.sin(rotationAngle * 0.5) * 0.07);
      animationFrameId = requestAnimationFrame(animateRotation);
    };
    animateRotation();

    // Spheres animations
    const animateBlob1 = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(blob1X, { toValue: 45, duration: 9000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: -55, duration: 9000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob1X, { toValue: -25, duration: 10000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: 35, duration: 10000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob1X, { toValue: 0, duration: 9000, useNativeDriver: true }),
          Animated.timing(blob1Y, { toValue: 0, duration: 9000, useNativeDriver: true })
        ])
      ]).start(() => animateBlob1());
    };

    const animateBlob2 = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(blob2X, { toValue: -50, duration: 10000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: 50, duration: 10000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob2X, { toValue: 30, duration: 11000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: -30, duration: 11000, useNativeDriver: true })
        ]),
        Animated.parallel([
          Animated.timing(blob2X, { toValue: 0, duration: 10000, useNativeDriver: true }),
          Animated.timing(blob2Y, { toValue: 0, duration: 10000, useNativeDriver: true })
        ])
      ]).start(() => animateBlob2());
    };

    animateBlob1();
    animateBlob2();

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const projectedVertices: { [key: string]: Point2D } = {};
  Object.keys(towerVertices).forEach((key) => {
    projectedVertices[key] = project(towerVertices[key]);
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
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
            top: SCREEN_HEIGHT * 0.06, 
            left: -60,
            transform: [{ translateX: blob1X }, { translateY: blob1Y }] 
          }
        ]}
      >
        <Svg width={300} height={300}>
          <Defs>
            <RadialGradient id="blueSphere" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#1D4ED8" stopOpacity="0.45" />
              <Stop offset="60%" stopColor="#3B82F6" stopOpacity="0.25" />
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
            bottom: SCREEN_HEIGHT * 0.12, 
            right: -80,
            transform: [{ translateX: blob2X }, { translateY: blob2Y }] 
          }
        ]}
      >
        <Svg width={300} height={300}>
          <Defs>
            <RadialGradient id="cyanSphere" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#0891B2" stopOpacity="0.4" />
              <Stop offset="60%" stopColor="#06B6D4" stopOpacity="0.2" />
              <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={150} cy={150} r={140} fill="url(#cyanSphere)" />
        </Svg>
      </Animated.View>

      {/* 3. Cyber Grid Floor (under tower) */}
      <View style={[StyleSheet.absoluteFill, { zIndex: 3 }]} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          {gridLines.map((line, idx) => {
            const p1 = project(line.p1);
            const p2 = project(line.p2);
            return (
              <Line
                key={`g-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgba(2, 132, 199, 0.08)"
                strokeWidth={1}
              />
            );
          })}
        </Svg>
      </View>

      {/* 4. 3D Animated Vector Tower Display */}
      <View style={[styles.viewport3D, { zIndex: 4 }]} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          {cables.map((cable, idx) => {
            const node = projectedVertices[cable.from];
            const left = project(cable.toLeft);
            const right = project(cable.toRight);
            if (!node) return null;

            return (
              <React.Fragment key={`cable-${idx}`}>
                <Path
                  d={`M ${left.x} ${left.y} Q ${(left.x + node.x) / 2} ${(left.y + node.y) / 2 + 15} ${node.x} ${node.y}`}
                  stroke="#0284C7"
                  strokeWidth={1.3}
                  opacity={0.5}
                  fill="none"
                />
                <Path
                  d={`M ${node.x} ${node.y} Q ${(node.x + right.x) / 2} ${(node.y + right.y) / 2 + 15} ${right.x} ${right.y}`}
                  stroke="#0284C7"
                  strokeWidth={1.3}
                  opacity={0.5}
                  fill="none"
                />
              </React.Fragment>
            );
          })}

          {towerEdges.map((edge, idx) => {
            const p1 = projectedVertices[edge[0]];
            const p2 = projectedVertices[edge[1]];
            if (!p1 || !p2) return null;

            return (
              <Line
                key={`edge-${idx}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="#0369A1"
                strokeWidth={edge[0] === 'peak' || edge[1] === 'peak' ? 1.5 : 1}
                opacity={0.7}
              />
            );
          })}

          {Object.keys(projectedVertices).map((key) => {
            const pt = projectedVertices[key];
            const isArmEnd = key.startsWith('arm');
            const isPeak = key === 'peak';

            return (
              <Circle
                key={`vertex-${key}`}
                cx={pt.x}
                cy={pt.y}
                r={isPeak ? 3.5 : isArmEnd ? 3 : 1.8}
                fill={isPeak ? '#EF4444' : isArmEnd ? '#F59E0B' : '#0284C7'}
                opacity={0.85}
              />
            );
          })}
        </Svg>
      </View>

      {/* 5. INTERACTIVE CONTENT OVERLAY */}
      <View style={styles.contentOverlay}>
        {/* Title & Brand Panel */}
        <Animated.View style={[styles.brandContainer, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>GIS SURVEY ENGINE</Text>
          </View>
          <Text style={styles.title}>GRID-NET</Text>
          <Text style={styles.subtitle}>OFFLINE ELECTRICAL MAPPING SYSTEM</Text>
          <View style={styles.divider} />
        </Animated.View>

        {/* Loading HUD & Sync Panel */}
        <View style={styles.hudPanel}>
          <View style={styles.hudHeader}>
            <Text style={styles.hudText}>{systemStatus}</Text>
            <Text style={styles.hudPercentage}>{loadingProgress}%</Text>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${loadingProgress}%` }]} />
          </View>

          <Text style={styles.gpsLockText}>
            🛰️ SECURE LOCAL DATABASE // COORD: WGS84 EGM96
          </Text>
        </View>

        {/* Interaction Button */}
        <View style={styles.buttonPlaceholder}>
          {loadingProgress >= 100 && (
            <Animated.View style={{ transform: [{ scale: buttonPulse }], width: '100%' }}>
              <TouchableOpacity style={styles.actionButton} onPress={onEnter} activeOpacity={0.8}>
                <Text style={styles.actionButtonText}>LAUNCH CORE CONSOLE</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  viewport3D: {
    height: SCREEN_HEIGHT * 0.44,
    marginTop: 10,
    width: '100%',
    position: 'relative',
    zIndex: 3,
  },
  blurBlob: {
    position: 'absolute',
    width: 300,
    height: 300,
    zIndex: 2,
  },
  contentOverlay: {
    zIndex: 10,
    width: '100%',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(2, 132, 199, 0.2)',
    borderWidth: 1.2,
    borderRadius: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 12,
  },
  logoBadgeText: {
    color: '#0284C7',
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#0F172A',
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2.5,
    textAlign: 'center',
    marginTop: 6,
  },
  divider: {
    height: 1.5,
    backgroundColor: 'rgba(2, 132, 199, 0.2)',
    width: 60,
    marginTop: 16,
  },
  hudPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hudText: {
    color: '#0284C7',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  hudPercentage: {
    color: '#0F172A',
    fontSize: 10.5,
    fontWeight: '800',
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
  gpsLockText: {
    color: '#64748B',
    fontSize: 8.5,
    fontWeight: '700',
    fontFamily: 'System',
    textAlign: 'center',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  buttonPlaceholder: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  actionButton: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 15,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
    letterSpacing: 2,
  },
});
