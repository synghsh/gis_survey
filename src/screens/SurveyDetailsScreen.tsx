import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Polyline, Circle, Text as SvgText, G, Path } from 'react-native-svg';
import { RootState, updateSurveyLineMetadata, updateSurveyNode } from '../store';
import Theme from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 320;
const SVG_HEIGHT = 240;

// SVG spring-coiled path helper for ABC cables
const createCoiledPath = (x1: number, y1: number, x2: number, y2: number, numCoils = 12) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return `M ${x1} ${y1}`;
  
  const ux = dx / len; // direction vector
  const uy = dy / len;
  const px = -uy;      // perpendicular vector
  const py = ux;
  
  let path = `M ${x1} ${y1}`;
  const amp = 4.5;     // wave height
  
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

// GPS Haversine distance calculator in meters
const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const d = R * c; // in meters
  return Math.round(d);
};

export default function SurveyDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  const { surveyId } = route.params;
  const historyList = useSelector((state: RootState) => state.survey.historyList);
  const survey = historyList.find(l => l.id === surveyId);

  const [zoomScale, setZoomScale] = useState(1.0);

  const handleZoomIn = () => {
    setZoomScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setZoomScale(prev => Math.max(prev - 0.25, 1.0));
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
  };

  // Selected sub-elements for editing
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedSpanNodeId, setSelectedSpanNodeId] = useState<string | null>(null);

  // Metadata Legend state
  const [contractor, setContractor] = useState('');
  const [remarks, setRemarks] = useState('');
  const [location, setLocation] = useState('');
  const [block, setBlock] = useState('');
  const [district, setDistrict] = useState('');
  const [preparedBy, setPreparedBy] = useState('');

  // Node Edit form state
  const [nodeName, setNodeName] = useState('');
  const [nodeLat, setNodeLat] = useState('');
  const [nodeLng, setNodeLng] = useState('');
  const [nodeCableSize, setNodeCableSize] = useState('');
  const [nodePoleType, setNodePoleType] = useState('');
  const [nodeHeight, setNodeHeight] = useState('');
  const [nodeTilt, setNodeTilt] = useState('');
  const [nodeSag, setNodeSag] = useState('');
  const [nodeParentLabel, setNodeParentLabel] = useState('');

  // Load survey attributes on mount or change
  useEffect(() => {
    if (survey) {
      setContractor(survey.contractorName || '');
      setRemarks(survey.remarks || '');
      setLocation(survey.location || '');
      setBlock(survey.block || '');
      setDistrict(survey.district || '');
      setPreparedBy(survey.preparedBy || '');
    }
  }, [surveyId, survey]);

  if (!survey) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Survey line not found.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>GO BACK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const getLineAccent = () => {
    switch (survey.lineType) {
      case 'HT_11KV': return Theme.colors.neon11KV;
      case 'HT_33KV': return Theme.colors.neon33KV;
      case 'LT_440V': return Theme.colors.neon440V;
      default: return Theme.colors.glowCyan;
    }
  };

  const accentColor = getLineAccent();

  const [nodeSpanDistance, setNodeSpanDistance] = useState('');

  // Load node into editor
  const handleSelectNode = (node: any, index: number) => {
    setSelectedSpanNodeId(null);
    setSelectedNodeId(node.id);
    setNodeName(node.nameLabel);
    setNodeLat(node.latitude.toString());
    setNodeLng(node.longitude.toString());
    setNodeCableSize(node.attributes.cableSize || '');
    setNodePoleType(node.attributes.poleType || '');
    setNodeHeight(node.attributes.height || '');
    setNodeTilt(node.attributes.tilt || '');
    setNodeSag(node.attributes.sag || '');
    setNodeSpanDistance(node.attributes.spanDistance || '');
    
    let resolvedParent = node.parentLabel;
    if (!resolvedParent && index > 0) {
      resolvedParent = projectedPoints[index - 1]?.nameLabel;
    }
    setNodeParentLabel(resolvedParent || '');
  };

  // Load span (incoming connection of node) into editor
  const handleSelectSpan = (node: any, index: number) => {
    setSelectedNodeId(null);
    setSelectedSpanNodeId(node.id);
    setNodeName(node.nameLabel);
    setNodeCableSize(node.attributes.cableSize || '');
    setNodePoleType(node.attributes.poleType || '');
    setNodeHeight(node.attributes.height || '');
    setNodeTilt(node.attributes.tilt || '');
    setNodeSag(node.attributes.sag || '');
    setNodeSpanDistance(node.attributes.spanDistance || '');
    
    let resolvedParent = node.parentLabel;
    if (!resolvedParent && index > 0) {
      resolvedParent = projectedPoints[index - 1]?.nameLabel;
    }
    setNodeParentLabel(resolvedParent || '');
  };

  // Save node or span updates
  const handleSaveNodeUpdates = () => {
    const activeId = selectedNodeId || selectedSpanNodeId;
    if (!activeId) return;

    const latNum = parseFloat(nodeLat) || 0;
    const lngNum = parseFloat(nodeLng) || 0;

    dispatch(updateSurveyNode({
      lineId: survey.id,
      nodeId: activeId,
      nameLabel: nodeName.trim(),
      latitude: selectedNodeId ? latNum : (survey.nodes.find(n => n.id === activeId)?.latitude || 0),
      longitude: selectedNodeId ? lngNum : (survey.nodes.find(n => n.id === activeId)?.longitude || 0),
      parentLabel: nodeParentLabel.trim() || undefined,
      attributes: {
        cableSize: nodeCableSize.trim(),
        poleType: nodePoleType.trim(),
        height: nodeHeight.trim(),
        tilt: nodeTilt.trim(),
        sag: nodeSag.trim(),
        spanDistance: nodeSpanDistance.trim() || undefined,
      }
    }));

    Alert.alert('Success', 'Structure details updated successfully.');
    setSelectedNodeId(null);
    setSelectedSpanNodeId(null);
  };

  // Save meta legend changes
  const handleSaveMetadata = () => {
    dispatch(updateSurveyLineMetadata({
      id: survey.id,
      contractorName: contractor.trim(),
      remarks: remarks.trim(),
      location: location.trim(),
      block: block.trim(),
      district: district.trim(),
      preparedBy: preparedBy.trim(),
    }));
    Alert.alert('Success', 'Survey metadata parameters saved.');
  };

  // SVG Coordinates projection calculation
  const nodes = survey.nodes;
  const latitudes = nodes.map(n => n.latitude);
  const longitudes = nodes.map(n => n.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;

  const padding = 35; // margin to ensure labels fit inside SVG boundary

  const projectedPoints = nodes.map(node => {
    let x = SVG_WIDTH / 2;
    let y = SVG_HEIGHT / 2;

    if (latRange > 0 || lngRange > 0) {
      const normX = lngRange > 0 ? (node.longitude - minLng) / lngRange : 0.5;
      const normY = latRange > 0 ? (node.latitude - minLat) / latRange : 0.5;

      x = padding + normX * (SVG_WIDTH - 2 * padding);
      y = SVG_HEIGHT - (padding + normY * (SVG_HEIGHT - 2 * padding));
    }

    return {
      ...node,
      x,
      y
    };
  });

  return (
    <View style={styles.container}>
      {/* HUD HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>&lt; LOGS</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>SURVEY DETAILS</Text>
        <View style={[styles.classBadge, { borderColor: accentColor }]}>
          <Text style={[styles.classBadgeText, { color: accentColor }]}>
            {survey.lineType.replace('_', ' ')}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* INTERACTIVE DIAGRAM CANVAS */}
        <View style={styles.canvasPanel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>LINE ROUTING LAYOUT</Text>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.liveText, { color: accentColor }]}>INTERACTIVE</Text>
            </View>
          </View>
          <Text style={styles.canvasSubtitle}>Tap poles [📍] or spans [〰️] to edit physical parameters.</Text>

          {nodes.length === 0 ? (
            <View style={styles.emptyCanvas}>
              <Text style={styles.emptyCanvasText}>NO NODES RECORDED FOR SURVEY LINE</Text>
            </View>
          ) : (
            <View style={[styles.svgWrapper, { height: SVG_HEIGHT }]}>
              <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} nestedScrollEnabled={true}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Svg
                    width={SVG_WIDTH * zoomScale}
                    height={SVG_HEIGHT * zoomScale}
                    viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                    style={styles.svgCanvas}
                  >
                    {/* HUD Tech Grid Lines */}
                    <G stroke="rgba(6, 182, 212, 0.04)" strokeWidth={0.5}>
                      <Polyline points={`0,${SVG_HEIGHT/4} ${SVG_WIDTH},${SVG_HEIGHT/4}`} />
                      <Polyline points={`0,${SVG_HEIGHT/2} ${SVG_WIDTH},${SVG_HEIGHT/2}`} />
                      <Polyline points={`0,${SVG_HEIGHT*3/4} ${SVG_WIDTH},${SVG_HEIGHT*3/4}`} />
                      <Polyline points={`${SVG_WIDTH/4},0 ${SVG_WIDTH/4},${SVG_HEIGHT}`} />
                      <Polyline points={`${SVG_WIDTH/2},0 ${SVG_WIDTH/2},${SVG_HEIGHT}`} />
                      <Polyline points={`${SVG_WIDTH*3/4},0 ${SVG_WIDTH*3/4},${SVG_HEIGHT}`} />
                    </G>

                    {/* DRAW CABLES (SPANS) IN ORDER OF CONNECTION */}
                    {projectedPoints.map((node, index) => {
                      let resolvedParentLabel = node.parentLabel;
                      if (!resolvedParentLabel && index > 0) {
                        resolvedParentLabel = projectedPoints[index - 1].nameLabel;
                      }
                      if (!resolvedParentLabel) return null;
                      
                      // Find parent coordinates
                      const parent = projectedPoints.find(p => p.nameLabel === resolvedParentLabel);
                      if (!parent) return null;

                      const spanPath = createCoiledPath(parent.x, parent.y, node.x, node.y);
                      const isSpanSelected = selectedSpanNodeId === node.id;

                      // Label coordinates (midpoint + perpendicular offset)
                      const midX = (parent.x + node.x) / 2;
                      const midY = (parent.y + node.y) / 2;
                      const dx = node.x - parent.x;
                      const dy = node.y - parent.y;
                      const len = Math.sqrt(dx * dx + dy * dy);
                      const px = len > 0 ? -dy / len : 0;
                      const py = len > 0 ? dx / len : 0;

                      // Offset label text slightly to avoid overlapping span line
                      const labelX = midX + px * 13;
                      const labelY = midY + py * 13;

                      return (
                        <G key={`span-${node.id}`}>
                          {/* Thicker touch target for easy tap between poles */}
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
                            stroke={isSpanSelected ? Theme.colors.warning : accentColor}
                            strokeWidth={isSpanSelected ? 2.5 : 1.5}
                            opacity={isSpanSelected ? 1.0 : 0.8}
                            onPress={() => handleSelectSpan(node, index)}
                          />
                          
                          {/* Span Cable Size & Distance Label Text */}
                          <G onPress={() => handleSelectSpan(node, index)}>
                            <SvgText
                              x={labelX}
                              y={labelY}
                              fill={isSpanSelected ? Theme.colors.warning : '#9CA3AF'}
                              fontSize={7}
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

                    {/* DRAW NODES (CIRCLES & LABELS) */}
                    {projectedPoints.map((node, index) => {
                      const isDtr = node.nodeType === 'DTR';
                      const isSelected = selectedNodeId === node.id;
                      const markerColor = isDtr ? Theme.colors.neonDTR : accentColor;

                      return (
                        <G key={`node-${node.id}`} onPress={() => handleSelectNode(node, index)}>
                          {/* Selection Ring */}
                          {isSelected && (
                            <Circle
                              cx={node.x}
                              cy={node.y}
                              r={isDtr ? 14 : 9}
                              fill="none"
                              stroke={Theme.colors.warning}
                              strokeWidth={1.5}
                              strokeDasharray="2,2"
                            />
                          )}

                          {/* DTR Overlapping Circles Symbol */}
                          {isDtr ? (
                            <G>
                              {/* Inner Concentric Glow Ring */}
                              <Circle
                                cx={node.x}
                                cy={node.y}
                                r={10}
                                fill="none"
                                stroke={markerColor}
                                strokeWidth={0.5}
                                opacity={0.3}
                              />
                              {/* Left overlapping circle */}
                              <Circle
                                cx={node.x - 4.5}
                                cy={node.y}
                                r={7}
                                fill="none"
                                stroke={markerColor}
                                strokeWidth={2}
                              />
                              {/* Right overlapping circle */}
                              <Circle
                                cx={node.x + 4.5}
                                cy={node.y}
                                r={7}
                                fill="none"
                                stroke={markerColor}
                                strokeWidth={2}
                              />
                              {/* Core dot */}
                              <Circle
                                cx={node.x}
                                cy={node.y}
                                r={2.5}
                                fill={markerColor}
                              />
                            </G>
                          ) : (
                            /* Standard Pole Node */
                            <Circle
                              cx={node.x}
                              cy={node.y}
                              r={5}
                              fill={markerColor}
                              stroke="#080B11"
                              strokeWidth={1.5}
                            />
                          )}

                          {/* Node text label */}
                          <SvgText
                            x={node.x}
                            y={node.y - (isDtr ? 13 : 9)}
                            fill={isSelected ? Theme.colors.warning : '#F3F4F6'}
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

              {/* Zoom overlay controls */}
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
          )}

          {/* Canvas Legend Overlay (Mirroring Hand Drawing) */}
          <View style={styles.legendBox}>
            <Text style={styles.legendTitle}>HUD SYMBOL LEGEND</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View style={styles.legendSym}>
                  <View style={styles.legendCircleOverLeft} />
                  <View style={styles.legendCircleOverRight} />
                </View>
                <Text style={styles.legendText}>DTR Hub</Text>
              </View>
              <View style={styles.legendItem}>
                <Text style={styles.legendWavySym}>〰️〰️</Text>
                <Text style={styles.legendText}>ABC Cable</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDotSym, { backgroundColor: accentColor }]} />
                <Text style={styles.legendText}>Grid Pole</Text>
              </View>
            </View>
          </View>
        </View>

        {/* INLINE CONTEXT SENSITIVE EDITOR PANEL */}
        {(selectedNodeId || selectedSpanNodeId) && (
          <View style={[styles.panel, styles.editorPanel]}>
            <View style={styles.panelHeader}>
              <Text style={[styles.panelTitle, { color: Theme.colors.warning }]}>
                {selectedNodeId ? `EDIT NODE PARAMETERS: ${nodeName}` : `EDIT SECTION SPAN: ${nodeName}`}
              </Text>
              <TouchableOpacity onPress={() => { setSelectedNodeId(null); setSelectedSpanNodeId(null); }}>
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGrid}>
              {selectedNodeId ? (
                <>
                  <View style={styles.formGroupHalf}>
                    <Text style={styles.formLabel}>NODE SERIAL / ID</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeName}
                      onChangeText={setNodeName}
                    />
                  </View>

                  <View style={styles.formGroupHalf}>
                    <Text style={styles.formLabel}>PARENT NODE / ID (CONNECTION)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeParentLabel}
                      onChangeText={setNodeParentLabel}
                      placeholder="e.g. DTR 100KVA or P1"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupHalf}>
                    <Text style={styles.formLabel}>POLE HEIGHT SPEC</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeHeight}
                      onChangeText={setNodeHeight}
                      placeholder="e.g. 9m"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupHalf}>
                    <Text style={styles.formLabel}>STRUCTURE TYPE</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodePoleType}
                      onChangeText={setNodePoleType}
                      placeholder="Concrete/Tubular"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupHalf}>
                    <Text style={styles.formLabel}>LATITUDE</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeLat}
                      onChangeText={setNodeLat}
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroupHalf}>
                    <Text style={styles.formLabel}>LONGITUDE</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeLng}
                      onChangeText={setNodeLng}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.formGroupThird}>
                    <Text style={styles.formLabel}>CABLE NAME / SPECIFICATION</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeCableSize}
                      onChangeText={setNodeCableSize}
                      placeholder="e.g. 90 sqmm ABC"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupThird}>
                    <Text style={styles.formLabel}>SPAN DISTANCE (METERS)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeSpanDistance}
                      onChangeText={setNodeSpanDistance}
                      placeholder="e.g. 35m"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupThird}>
                    <Text style={styles.formLabel}>PARENT NODE / ID (CONNECTION)</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeParentLabel}
                      onChangeText={setNodeParentLabel}
                      placeholder="e.g. DTR 100KVA or P1"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupThird}>
                    <Text style={styles.formLabel}>STRUCTURE TYPE</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodePoleType}
                      onChangeText={setNodePoleType}
                      placeholder="Concrete/Tubular"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupThird}>
                    <Text style={styles.formLabel}>TILT DEVIATION</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeTilt}
                      onChangeText={setNodeTilt}
                      placeholder="0°"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>

                  <View style={styles.formGroupThird}>
                    <Text style={styles.formLabel}>SAG RATIO</Text>
                    <TextInput
                      style={styles.formInput}
                      value={nodeSag}
                      onChangeText={setNodeSag}
                      placeholder="0.3m"
                      placeholderTextColor="rgba(255,255,255,0.2)"
                    />
                  </View>
                </>
              )}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNodeUpdates}>
              <Text style={styles.saveBtnText}>APPLY STRUCTURE CHANGES</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* METADATA LEGEND FORM BLOCK (Matching Hand-Drawn Sheet Footer) */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>OFFLINE LEGEND PARAMETERS</Text>
          <Text style={styles.legendFormSubtitle}>Synchronized to centralized PostGIS server metadata fields.</Text>
          
          <View style={styles.formGrid}>
            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>LOCATION ZONE</Text>
              <TextInput
                style={styles.formInput}
                value={location}
                onChangeText={setLocation}
                placeholder="Sector or Area Name"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>SUB-DIVISION BLOCK</Text>
              <TextInput
                style={styles.formInput}
                value={block}
                onChangeText={setBlock}
                placeholder="e.g. Block-VII"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>DISTRICT FEEDED</Text>
              <TextInput
                style={styles.formInput}
                value={district}
                onChangeText={setDistrict}
                placeholder="District Division"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>PREPARED BY (SURVEYOR)</Text>
              <TextInput
                style={styles.formInput}
                value={preparedBy}
                onChangeText={setPreparedBy}
                placeholder="Your Name"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View style={styles.formGroupFull}>
              <Text style={styles.formLabel}>CONTRACTOR FIRM</Text>
              <TextInput
                style={styles.formInput}
                value={contractor}
                onChangeText={setContractor}
                placeholder="Contracting Agency"
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>

            <View style={styles.formGroupFull}>
              <Text style={styles.formLabel}>SURVEY LINE REMARKS</Text>
              <TextInput
                style={[styles.formInput, { height: 50, textAlignVertical: 'top' }]}
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={2}
                placeholder="General route remarks..."
                placeholderTextColor="rgba(255,255,255,0.2)"
              />
            </View>
          </View>

          <TouchableOpacity style={[styles.saveBtn, { borderColor: accentColor, backgroundColor: 'rgba(6, 182, 212, 0.05)' }]} onPress={handleSaveMetadata}>
            <Text style={[styles.saveBtnText, { color: accentColor }]}>SAVE LEGEND METADATA</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.background,
    padding: 24,
  },
  errorText: {
    color: Theme.colors.error,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: 'rgba(8, 11, 17, 0.95)',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 6,
  },
  backText: {
    color: Theme.colors.textPrimary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  backBtnText: {
    color: Theme.colors.textPrimary,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  classBadge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 18,
    paddingBottom: 40,
  },
  canvasPanel: {
    ...Theme.glassmorphic.container,
    padding: 16,
    marginBottom: 20,
    backgroundColor: 'rgba(17, 24, 39, 0.5)',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelTitle: {
    color: Theme.colors.textPrimary,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },
  liveText: {
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  canvasSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 9.5,
    marginBottom: 14,
  },
  emptyCanvas: {
    height: SVG_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 8,
  },
  emptyCanvasText: {
    color: Theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  svgWrapper: {
    backgroundColor: 'rgba(4, 6, 10, 0.5)',
    borderRadius: 8,
    borderColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
  },
  svgCanvas: {
    backgroundColor: 'rgba(3, 7, 18, 0.25)',
  },
  legendBox: {
    marginTop: 14,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 6,
    borderColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    padding: 10,
  },
  legendTitle: {
    color: Theme.colors.textSecondary,
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSym: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 6,
  },
  legendCircleOverLeft: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderColor: Theme.colors.neonDTR,
    borderWidth: 1.2,
    marginRight: -4,
  },
  legendCircleOverRight: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderColor: Theme.colors.neonDTR,
    borderWidth: 1.2,
  },
  legendWavySym: {
    fontSize: 10,
    marginRight: 4,
    color: '#9CA3AF',
    marginTop: -2,
  },
  legendDotSym: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: Theme.colors.textPrimary,
    fontSize: 9,
    fontWeight: '500',
  },
  panel: {
    ...Theme.glassmorphic.container,
    padding: 16,
    marginBottom: 20,
  },
  legendFormSubtitle: {
    color: Theme.colors.textSecondary,
    fontSize: 9.5,
    marginTop: 2,
    marginBottom: 14,
  },
  editorPanel: {
    borderColor: Theme.colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.02)',
  },
  cancelText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  formGroupHalf: {
    width: '48%',
    marginBottom: 12,
  },
  formGroupThird: {
    width: '31%',
    marginBottom: 12,
  },
  formGroupFull: {
    width: '100%',
    marginBottom: 12,
  },
  formLabel: {
    color: Theme.colors.textSecondary,
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: 'rgba(8, 11, 17, 0.7)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: Theme.colors.textPrimary,
    fontSize: 12,
  },
  saveBtn: {
    ...Theme.glassmorphic.button,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    borderColor: Theme.colors.warning,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  saveBtnText: {
    color: Theme.colors.warning,
    fontSize: 11.5,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  zoomControls: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderWidth: 1.2,
    borderRadius: 8,
    padding: 3,
  },
  zoomBtn: {
    width: 24,
    height: 24,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  zoomScaleIndicator: {
    paddingHorizontal: 6,
  },
  zoomScaleText: {
    color: Theme.colors.glowCyan,
    fontSize: 8.5,
    fontWeight: 'bold',
  },
});
