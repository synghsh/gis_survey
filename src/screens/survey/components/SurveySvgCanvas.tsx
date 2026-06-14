import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import Svg, { Polyline, Circle, Text as SvgText, G, Path } from 'react-native-svg';

const SVG_WIDTH = 320;
const SVG_HEIGHT = 240;

const createCoiledPath = (x1: number, y1: number, x2: number, y2: number, numCoils = 12) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return `M ${x1} ${y1}`;
  
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  
  let path = `M ${x1} ${y1}`;
  const amp = 4.5;
  
  for (let i = 0; i < numCoils; i++) {
    const tStart = i / numCoils;
    const tEnd = (i + 1) / numCoils;
    const tA = tStart + 0.25;
    const tB = tStart + 0.75;
    
    const cx1 = x1 + dx * tA + px * amp;
    const cy1 = y1 + dy * tA + py * amp;
    const cx2 = x1 + dx * tB - px * amp;
    const cy2 = y1 + dy * tB - py * amp;
    const ex = x1 + dx * tEnd;
    const ey = y1 + dy * tEnd;
    
    path += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ex} ${ey}`;
  }
  return path;
};

const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

interface SurveySvgCanvasProps {
  projectedPoints: any[];
  selectedNodeId: string | null;
  selectedSpanNodeId: string | null;
  accentColor: string;
  zoomScale: number;
  handleSelectNode: (node: any, index: number) => void;
  handleSelectSpan: (node: any, index: number) => void;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleResetZoom: () => void;
}

export default function SurveySvgCanvas({
  projectedPoints,
  selectedNodeId,
  selectedSpanNodeId,
  accentColor,
  zoomScale,
  handleSelectNode,
  handleSelectSpan,
  handleZoomIn,
  handleZoomOut,
  handleResetZoom,
}: SurveySvgCanvasProps) {
  const warningColor = '#D97706';
  const dtrColor = '#8B5CF6';
  
  return (
    <View style={[styles.svgWrapper, { height: SVG_HEIGHT }]}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} nestedScrollEnabled={true}>
        <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
          <Svg
            width={SVG_WIDTH * zoomScale}
            height={SVG_HEIGHT * zoomScale}
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            style={styles.svgCanvas}
          >
            {/* Tech Grid Lines */}
            <G stroke="rgba(2, 132, 199, 0.08)" strokeWidth={0.8}>
              <Polyline points={`0,${SVG_HEIGHT/4} ${SVG_WIDTH},${SVG_HEIGHT/4}`} />
              <Polyline points={`0,${SVG_HEIGHT/2} ${SVG_WIDTH},${SVG_HEIGHT/2}`} />
              <Polyline points={`0,${SVG_HEIGHT*3/4} ${SVG_WIDTH},${SVG_HEIGHT*3/4}`} />
              <Polyline points={`${SVG_WIDTH/4},0 ${SVG_WIDTH/4},${SVG_HEIGHT}`} />
              <Polyline points={`${SVG_WIDTH/2},0 ${SVG_WIDTH/2},${SVG_HEIGHT}`} />
              <Polyline points={`${SVG_WIDTH*3/4},0 ${SVG_WIDTH*3/4},${SVG_HEIGHT}`} />
            </G>

            {/* DRAW CABLES (SPANS) */}
            {projectedPoints.map((node, index) => {
              let resolvedParentLabel = node.parentLabel;
              if (!resolvedParentLabel && index > 0) {
                resolvedParentLabel = projectedPoints[index - 1].nameLabel;
              }
              if (!resolvedParentLabel) return null;
              
              const parent = projectedPoints.find(p => p.nameLabel === resolvedParentLabel);
              if (!parent) return null;

              const spanPath = createCoiledPath(parent.x, parent.y, node.x, node.y);
              const isSpanSelected = selectedSpanNodeId === node.id;

              const midX = (parent.x + node.x) / 2;
              const midY = (parent.y + node.y) / 2;
              const dx = node.x - parent.x;
              const dy = node.y - parent.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const px = len > 0 ? -dy / len : 0;
              const py = len > 0 ? dx / len : 0;

              const labelX = midX + px * 13;
              const labelY = midY + py * 13;

              return (
                <G key={`span-${node.id}`}>
                  {/* Thick Touch target */}
                  <Path
                    d={spanPath}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={24}
                    onPress={() => handleSelectSpan(node, index)}
                  />

                  {/* Coiled Wavy Path */}
                  <Path
                    d={spanPath}
                    fill="none"
                    stroke={isSpanSelected ? warningColor : accentColor}
                    strokeWidth={isSpanSelected ? 2.5 : 1.5}
                    opacity={isSpanSelected ? 1.0 : 0.8}
                    onPress={() => handleSelectSpan(node, index)}
                  />
                  
                  {/* Label Text */}
                  <G onPress={() => handleSelectSpan(node, index)}>
                    <SvgText
                      x={labelX}
                      y={labelY}
                      fill={isSpanSelected ? warningColor : '#64748B'}
                      fontSize={7.2}
                      fontWeight="bold"
                      fontFamily="System"
                      textAnchor="middle"
                    >
                      {`${node.attributes.cableSize ? node.attributes.cableSize.replace(' sqmm ABC', 'sq') : 'Cable'} (${node.attributes.spanDistance || `${calculateDistanceMeters(parent.latitude, parent.longitude, node.latitude, node.longitude)}m`})`}
                    </SvgText>
                  </G>
                </G>
              );
            })}

            {/* DRAW NODES */}
            {projectedPoints.map((node, index) => {
              const isDtr = node.nodeType === 'DTR';
              const isSelected = selectedNodeId === node.id;
              const markerColor = isDtr ? dtrColor : accentColor;

              return (
                <G key={`node-${node.id}`} onPress={() => handleSelectNode(node, index)}>
                  {/* Selection Ring */}
                  {isSelected && (
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={isDtr ? 14 : 9}
                      fill="none"
                      stroke={warningColor}
                      strokeWidth={1.5}
                      strokeDasharray="2,2"
                    />
                  )}

                  {/* DTR Overlapping Circles */}
                  {isDtr ? (
                    <G>
                      <Circle
                        cx={node.x}
                        cy={node.y}
                        r={10}
                        fill="none"
                        stroke={markerColor}
                        strokeWidth={0.5}
                        opacity={0.3}
                      />
                      <Circle
                        cx={node.x - 4.5}
                        cy={node.y}
                        r={7}
                        fill="none"
                        stroke={markerColor}
                        strokeWidth={2}
                      />
                      <Circle
                        cx={node.x + 4.5}
                        cy={node.y}
                        r={7}
                        fill="none"
                        stroke={markerColor}
                        strokeWidth={2}
                      />
                      <Circle
                        cx={node.x}
                        cy={node.y}
                        r={2.5}
                        fill={markerColor}
                      />
                    </G>
                  ) : (
                    <Circle
                      cx={node.x}
                      cy={node.y}
                      r={5}
                      fill={markerColor}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  )}

                  {/* Node text label */}
                  <SvgText
                    x={node.x}
                    y={node.y - (isDtr ? 13 : 9)}
                    fill={isSelected ? warningColor : '#0F172A'}
                    fontSize={8.5}
                    fontWeight="900"
                    fontFamily="System"
                    textAnchor="middle"
                  >
                    {node.nameLabel}
                  </SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      </ScrollView>

      {/* Zoom controls overlay */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomOut} activeOpacity={0.7}>
          <Text style={styles.zoomBtnText}>-</Text>
        </TouchableOpacity>
        <View style={styles.zoomScaleIndicator}>
          <Text style={styles.zoomScaleText}>{Math.round(zoomScale * 100)}%</Text>
        </View>
        <TouchableOpacity style={styles.zoomBtn} onPress={handleZoomIn} activeOpacity={0.7}>
          <Text style={styles.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.zoomBtn, { width: 44, marginLeft: 6 }]} onPress={handleResetZoom} activeOpacity={0.7}>
          <Text style={[styles.zoomBtnText, { fontSize: 8 }]}>RESET</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  svgWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    overflow: 'hidden',
    alignItems: 'center',
    position: 'relative',
  },
  svgCanvas: {
    backgroundColor: '#FFFFFF',
  },
  zoomControls: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  zoomBtn: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  zoomScaleIndicator: {
    paddingHorizontal: 6,
  },
  zoomScaleText: {
    color: '#0284C7',
    fontSize: 8.5,
    fontWeight: 'bold',
  },
});
