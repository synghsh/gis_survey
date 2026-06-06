import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import Svg, { Line, Circle, Path } from 'react-native-svg';
import Theme from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 3D Point Interface
interface Point3D {
  x: number;
  y: number;
  z: number;
}

// 2D Projected Point
interface Point2D {
  x: number;
  y: number;
  z: number; // Keep Z for sorting or scale
}

export default function IntroScreen({ onEnter }: { onEnter: () => void }) {
  // Animation state values
  const [angleY, setAngleY] = useState(0.4); // Initial rotation around Y
  const [angleX, setAngleX] = useState(0.15); // Initial rotation around X
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [systemStatus, setSystemStatus] = useState('SYSTEM CHECK');

  // Animation values for transitions
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const buttonPulse = useRef(new Animated.Value(1)).current;

  // 3D Grid Data (represented as coordinates)
  const gridLines: { p1: Point3D; p2: Point3D }[] = [];
  const gridY = 80;
  const gridSize = 120;
  const gridStep = 40;

  // Build grid lines on X-Z plane
  for (let x = -gridSize; x <= gridSize; x += gridStep) {
    gridLines.push({
      p1: { x, y: gridY, z: -gridSize },
      p2: { x, y: gridY, z: gridSize }
    });
  }
  for (let z = -gridSize; z <= gridSize; z += gridStep) {
    gridLines.push({
      p1: { x: -gridSize, y: gridY, z },
      p2: { x: gridSize, y: gridY, z }
    });
  }

  // Define 3D Transmission Tower Vertices
  const baseWidth = 35;
  const midWidth = 15;
  const topWidth = 8;
  const towerHeightY = -90;

  const towerVertices: { [key: string]: Point3D } = {
    // Base joints on ground
    b1: { x: -baseWidth, y: gridY, z: -baseWidth },
    b2: { x: baseWidth, y: gridY, z: -baseWidth },
    b3: { x: baseWidth, y: gridY, z: baseWidth },
    b4: { x: -baseWidth, y: gridY, z: baseWidth },

    // Middle platform joints
    m1: { x: -midWidth, y: 0, z: -midWidth },
    m2: { x: midWidth, y: 0, z: -midWidth },
    m3: { x: midWidth, y: 0, z: midWidth },
    m4: { x: -midWidth, y: 0, z: midWidth },

    // Upper platform joints
    u1: { x: -topWidth, y: -60, z: -topWidth },
    u2: { x: topWidth, y: -60, z: -topWidth },
    u3: { x: topWidth, y: -60, z: topWidth },
    u4: { x: -topWidth, y: -60, z: topWidth },

    // Tower top peak
    peak: { x: 0, y: towerHeightY - 15, z: 0 },

    // Cross-arm Left/Right Ends (for cables)
    armL1: { x: -45, y: -50, z: 0 },
    armR1: { x: 45, y: -50, z: 0 },
    armL2: { x: -35, y: -20, z: 0 },
    armR2: { x: 35, y: -20, z: 0 },
  };

  // Define Tower connections (edges)
  const towerEdges = [
    // Legs
    ['b1', 'm1'], ['b2', 'm2'], ['b3', 'm3'], ['b4', 'm4'],
    ['m1', 'u1'], ['m2', 'u2'], ['m3', 'u3'], ['m4', 'u4'],
    ['u1', 'peak'], ['u2', 'peak'], ['u3', 'peak'], ['u4', 'peak'],

    // Base horizontal rings
    ['b1', 'b2'], ['b2', 'b3'], ['b3', 'b4'], ['b4', 'b1'],
    ['m1', 'm2'], ['m2', 'm3'], ['m3', 'm4'], ['m4', 'm1'],
    ['u1', 'u2'], ['u2', 'u3'], ['u3', 'u4'], ['u4', 'u1'],

    // Diagonal lattice braces (Middle Section)
    ['b1', 'm2'], ['b2', 'm1'],
    ['b2', 'm3'], ['b3', 'm2'],
    ['b3', 'm4'], ['b4', 'm3'],
    ['b4', 'm1'], ['b1', 'm4'],

    // Diagonal lattice braces (Upper Section)
    ['m1', 'u2'], ['m2', 'u1'],
    ['m2', 'u3'], ['m3', 'm2'],
    ['m3', 'u4'], ['m4', 'u3'],
    ['m4', 'u1'], ['m1', 'u4'],

    // Cross Arms
    ['u1', 'armL1'], ['u2', 'armR1'],
    ['m1', 'armL2'], ['m2', 'armR2'],
  ];

  // Cable paths (extending out of bounds representing network spans)
  const cables = [
    { from: 'armL1', toLeft: { x: -150, y: -30, z: -150 }, toRight: { x: -150, y: -30, z: 150 } },
    { from: 'armR1', toLeft: { x: 150, y: -30, z: -150 }, toRight: { x: 150, y: -30, z: 150 } },
    { from: 'armL2', toLeft: { x: -140, y: -10, z: -150 }, toRight: { x: -140, y: -10, z: 150 } },
    { from: 'armR2', toLeft: { x: 140, y: -10, z: -150 }, toRight: { x: 140, y: -10, z: 150 } },
  ];

  // 3D Perspective Projection Function
  const project = (pt: Point3D): Point2D => {
    // 1. Rotate around Y-axis
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);
    const x1 = pt.x * cosY - pt.z * sinY;
    const z1 = pt.x * sinY + pt.z * cosY;

    // 2. Rotate around X-axis
    const cosX = Math.cos(angleX);
    const sinX = Math.sin(angleX);
    const y2 = pt.y * cosX - z1 * sinX;
    const z2 = pt.y * sinX + z1 * cosX;

    // 3. Perspective Math
    const cameraDistance = 250;
    const scale = 180 / (z2 + cameraDistance);

    // Offset to center of viewport (assume center is at SCREEN_WIDTH/2, height/2 - 20)
    const centerX = SCREEN_WIDTH / 2;
    const centerY = SCREEN_HEIGHT * 0.4;

    return {
      x: centerX + x1 * scale,
      y: centerY + y2 * scale,
      z: z2
    };
  };

  // Auto-rotation & Loading lifecycle
  useEffect(() => {
    // 1. Fade in UI components
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      })
    ]).start();

    // 2. Start button pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonPulse, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(buttonPulse, {
          toValue: 1.0,
          duration: 1200,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 3. Simulation initialization loader
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(interval);
          setSystemStatus('SYSTEM READY');
          return 100;
        }

        // Cycle through status messages
        if (next === 20) setSystemStatus('GRID SYNCHRONIZATION');
        if (next === 45) setSystemStatus('GPS RECEIVER WARMUP');
        if (next === 75) setSystemStatus('LOCAL DATABASE CHECK');
        if (next === 90) setSystemStatus('DECRYPTION KEYS READY');

        return next;
      });
    }, 45);

    // 4. Smooth continuous Y/X rotation loop
    let animationFrameId: number;
    let rotationAngle = 0.4;
    const animateRotation = () => {
      rotationAngle += 0.007; // Slow rotation speed
      setAngleY(rotationAngle);
      // Subtle oscillation on X axis
      setAngleX(0.18 + Math.sin(rotationAngle * 0.5) * 0.08);
      animationFrameId = requestAnimationFrame(animateRotation);
    };
    animateRotation();

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Project all tower vertices
  const projectedVertices: { [key: string]: Point2D } = {};
  Object.keys(towerVertices).forEach((key) => {
    projectedVertices[key] = project(towerVertices[key]);
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Cyber Grid Background lines */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill}>
          {/* Floor grid */}
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
                stroke="rgba(6, 182, 212, 0.06)"
                strokeWidth={1}
              />
            );
          })}
        </Svg>
      </View>

      {/* 3D Animated Vector Tower Display */}
      <View style={styles.viewport3D}>
        <Svg style={StyleSheet.absoluteFill}>
          {/* Draping power line cables */}
          {cables.map((cable, idx) => {
            const node = projectedVertices[cable.from];
            const left = project(cable.toLeft);
            const right = project(cable.toRight);
            if (!node) return null;

            return (
              <React.Fragment key={`cable-${idx}`}>
                {/* Curved paths using Bezier paths (replicates catenary sag of cable) */}
                <Path
                  d={`M ${left.x} ${left.y} Q ${(left.x + node.x) / 2} ${(left.y + node.y) / 2 + 15} ${node.x} ${node.y}`}
                  stroke={Theme.colors.neon440V}
                  strokeWidth={1.5}
                  opacity={0.6}
                  fill="none"
                />
                <Path
                  d={`M ${node.x} ${node.y} Q ${(node.x + right.x) / 2} ${(node.y + right.y) / 2 + 15} ${right.x} ${right.y}`}
                  stroke={Theme.colors.neon440V}
                  strokeWidth={1.5}
                  opacity={0.6}
                  fill="none"
                />
              </React.Fragment>
            );
          })}

          {/* Tower steel framework edges */}
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
                stroke={Theme.colors.glowCyan}
                strokeWidth={edge[0] === 'peak' || edge[1] === 'peak' ? 1.5 : 1}
                opacity={0.7}
              />
            );
          })}

          {/* Glowing node joins */}
          {Object.keys(projectedVertices).map((key) => {
            const pt = projectedVertices[key];
            const isArmEnd = key.startsWith('arm');
            const isPeak = key === 'peak';

            return (
              <Circle
                key={`vertex-${key}`}
                cx={pt.x}
                cy={pt.y}
                r={isPeak ? 4 : isArmEnd ? 3.5 : 2}
                fill={isPeak ? Theme.colors.neon33KV : isArmEnd ? Theme.colors.neon11KV : Theme.colors.glowCyan}
                opacity={0.9}
              />
            );
          })}
        </Svg>
      </View>

      {/* Title & Brand Panel */}
      <Animated.View style={[styles.brandContainer, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoBadgeText}>GIS 3D</Text>
        </View>
        <Text style={styles.title}>GRID-NET</Text>
        <Text style={styles.subtitle}>ELECTRICAL LINE SURVEYING SYSTEM</Text>
        <View style={styles.divider} />
      </Animated.View>

      {/* Loading HUD & Sync Panel */}
      <View style={styles.hudPanel}>
        <View style={styles.hudHeader}>
          <Text style={styles.hudText}>{systemStatus}</Text>
          <Text style={styles.hudPercentage}>{loadingProgress}%</Text>
        </View>

        {/* Progress Bar Container */}
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${loadingProgress}%` }]} />
        </View>

        <Text style={styles.gpsLockText}>
          🛰️ OFFLINE ENGINE v2.4 // COORD: WGS84 EGM96
        </Text>
      </View>

      {/* Interaction Button */}
      {loadingProgress >= 100 && (
        <Animated.View style={[styles.buttonContainer, { transform: [{ scale: buttonPulse }] }]}>
          <TouchableOpacity style={styles.actionButton} onPress={onEnter} activeOpacity={0.7}>
            <Text style={styles.actionButtonText}>LAUNCH CORE CONSOLE</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
    justifyContent: 'space-between',
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  viewport3D: {
    height: SCREEN_HEIGHT * 0.42,
    marginTop: 20,
    width: '100%',
    position: 'relative',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: -20,
  },
  logoBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: Theme.colors.glowCyan,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  logoBadgeText: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontFamily: Theme.typography.fontFamily,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  title: {
    color: Theme.colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: Theme.colors.glowCyan,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textAlign: 'center',
    marginTop: 6,
    opacity: 0.85,
  },
  divider: {
    height: 2,
    backgroundColor: Theme.colors.glowCyan,
    width: 60,
    marginTop: 15,
    opacity: 0.3,
  },
  hudPanel: {
    ...Theme.glassmorphic.container,
    padding: 14,
    marginVertical: 10,
  },
  hudHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hudText: {
    color: Theme.colors.glowCyan,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  hudPercentage: {
    color: Theme.colors.textPrimary,
    fontSize: 11,
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
    shadowColor: Theme.colors.glowCyan,
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  gpsLockText: {
    color: Theme.colors.textSecondary,
    fontSize: 9,
    fontFamily: 'System',
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  buttonContainer: {
    alignItems: 'center',
  },
  actionButton: {
    ...Theme.glassmorphic.button,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  actionButtonText: {
    color: Theme.colors.glowCyan,
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 2,
  },
});
