import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, updateSurveyLineMetadata, updateSurveyNode } from '../../store';

import SurveySvgCanvas from './components/SurveySvgCanvas';
import SurveyAttributeEditor from './components/SurveyAttributeEditor';
import SurveyLegendForm from './components/SurveyLegendForm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 320;
const SVG_HEIGHT = 240;

export default function SurveyDetailsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  const { surveyId } = route.params;
  const historyList = useSelector((state: RootState) => state.survey.historyList);
  const survey = historyList.find(l => l.id === surveyId);

  const [zoomScale, setZoomScale] = useState(1.0);

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 1.0));
  const handleResetZoom = () => setZoomScale(1.0);

  // Selected sub-elements
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
  const [nodeSpanDistance, setNodeSpanDistance] = useState('');

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
      case 'HT_11KV': return '#F59E0B';
      case 'HT_33KV': return '#EF4444';
      case 'LT_440V': return '#0284C7';
      default: return '#0284C7';
    }
  };

  const accentColor = getLineAccent();
  const nodes = survey.nodes;
  const latitudes = nodes.map(n => n.latitude);
  const longitudes = nodes.map(n => n.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  const latRange = maxLat - minLat;
  const lngRange = maxLng - minLng;
  const padding = 35;

  const projectedPoints = nodes.map(node => {
    let x = SVG_WIDTH / 2;
    let y = SVG_HEIGHT / 2;

    if (latRange > 0 || lngRange > 0) {
      const normX = lngRange > 0 ? (node.longitude - minLng) / lngRange : 0.5;
      const normY = latRange > 0 ? (node.latitude - minLat) / latRange : 0.5;
      x = padding + normX * (SVG_WIDTH - 2 * padding);
      y = SVG_HEIGHT - (padding + normY * (SVG_HEIGHT - 2 * padding));
    }
    return { ...node, x, y };
  });

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
    
    let resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
    setNodeParentLabel(resolvedParent);
  };

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
    
    let resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
    setNodeParentLabel(resolvedParent);
  };

  const handleSaveNodeUpdates = () => {
    const activeId = selectedNodeId || selectedSpanNodeId;
    if (!activeId) return;

    dispatch(updateSurveyNode({
      lineId: survey.id,
      nodeId: activeId,
      nameLabel: nodeName.trim(),
      latitude: selectedNodeId ? parseFloat(nodeLat) || 0 : (survey.nodes.find(n => n.id === activeId)?.latitude || 0),
      longitude: selectedNodeId ? parseFloat(nodeLng) || 0 : (survey.nodes.find(n => n.id === activeId)?.longitude || 0),
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

      {/* 2. HUD HEADER */}
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

      {/* 3. SCROLLABLE LAYOUT */}
      <ScrollView style={styles.scrollContainerWrapper} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* DIAGRAM CANVAS */}
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
            <SurveySvgCanvas
              projectedPoints={projectedPoints}
              selectedNodeId={selectedNodeId}
              selectedSpanNodeId={selectedSpanNodeId}
              accentColor={accentColor}
              zoomScale={zoomScale}
              handleSelectNode={handleSelectNode}
              handleSelectSpan={handleSelectSpan}
              handleZoomIn={handleZoomIn}
              handleZoomOut={handleZoomOut}
              handleResetZoom={handleResetZoom}
            />
          )}

          {/* Canvas Legend Overlay */}
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

        {/* INLINE ATTRS EDITOR */}
        <SurveyAttributeEditor
          selectedNodeId={selectedNodeId}
          selectedSpanNodeId={selectedSpanNodeId}
          nodeName={nodeName}
          setNodeName={setNodeName}
          nodeParentLabel={nodeParentLabel}
          setNodeParentLabel={setNodeParentLabel}
          nodeHeight={nodeHeight}
          setNodeHeight={setNodeHeight}
          nodePoleType={nodePoleType}
          setNodePoleType={setNodePoleType}
          nodeLat={nodeLat}
          setNodeLat={setNodeLat}
          nodeLng={nodeLng}
          setNodeLng={setNodeLng}
          nodeCableSize={nodeCableSize}
          setNodeCableSize={setNodeCableSize}
          nodeTilt={nodeTilt}
          setNodeTilt={setNodeTilt}
          nodeSag={nodeSag}
          setNodeSag={setNodeSag}
          nodeSpanDistance={nodeSpanDistance}
          setNodeSpanDistance={setNodeSpanDistance}
          onCancel={() => { setSelectedNodeId(null); setSelectedSpanNodeId(null); }}
          onApply={handleSaveNodeUpdates}
        />

        {/* METADATA LEGEND FORM */}
        <SurveyLegendForm
          location={location}
          setLocation={setLocation}
          block={block}
          setBlock={setBlock}
          district={district}
          setDistrict={setDistrict}
          preparedBy={preparedBy}
          setPreparedBy={setPreparedBy}
          contractor={contractor}
          setContractor={setContractor}
          remarks={remarks}
          setRemarks={setRemarks}
          accentColor={accentColor}
          onSave={handleSaveMetadata}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 24,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 20,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
  },
  backText: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: 'bold',
  },
  backBtnText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  classBadge: {
    borderWidth: 1.2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  classBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollContainerWrapper: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  canvasPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelTitle: {
    color: '#0F172A',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 132, 199, 0.05)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  liveText: {
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  canvasSubtitle: {
    color: '#64748B',
    fontSize: 9.5,
    marginBottom: 12,
  },
  emptyCanvas: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
  },
  emptyCanvasText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  legendBox: {
    borderTopWidth: 1.2,
    borderTopColor: 'rgba(2, 132, 199, 0.08)',
    marginTop: 14,
    paddingTop: 12,
  },
  legendTitle: {
    color: 'rgba(15, 23, 42, 0.35)',
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  legendGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendSym: {
    width: 20,
    height: 12,
    position: 'relative',
    marginRight: 6,
  },
  legendCircleOverLeft: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderColor: '#8B5CF6',
    borderWidth: 1.2,
  },
  legendCircleOverRight: {
    position: 'absolute',
    left: 7,
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderColor: '#8B5CF6',
    borderWidth: 1.2,
  },
  legendText: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: '500',
  },
  legendWavySym: {
    color: '#0284C7',
    fontSize: 10,
    marginRight: 6,
    letterSpacing: -2,
  },
  legendDotSym: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
});
