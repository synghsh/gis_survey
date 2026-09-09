import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { RootState, resumeSurvey, resumeSurveyWithPole, updateSurveyLineMetadata, updateSurveyNode } from '../../store';
import { fetchErectionPoleDetailsAction } from '../../store/actions/erectionAction';
import { useToast } from '../../components/ToastProvider';
import { useConfirmation } from '../../components/ConfirmationProvider';
import { getLineTypeLabel } from '../../utils/surveyLabels';

import SurveySvgCanvas from './components/SurveySvgCanvas';
import SurveyAttributeEditor from './components/SurveyAttributeEditor';
import SurveyLegendForm from './components/SurveyLegendForm';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SVG_WIDTH = 320;
const SVG_HEIGHT = 240;

export default function ErectionDetailsScreen() {
  const toast = useToast();
  const { confirm } = useConfirmation();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();
  
  const { surveyId } = route.params;
  const historyList = useSelector((state: RootState) => state.survey.historyList);
  const survey = historyList.find(l => l.id === surveyId);
  const isLocked = Boolean(survey?.isCompleted);

  const [zoomScale, setZoomScale] = useState(1.0);

  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.25, 3.0));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.25, 0));
  const handleResetZoom = () => setZoomScale(1.0);

  // Selected sub-elements
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedSpanNodeId, setSelectedSpanNodeId] = useState<string | null>(null);

  const [confirmEditModalVisible, setConfirmEditModalVisible] = useState(false);
  const [selectedEditPole, setSelectedEditPole] = useState<string>('');
  const [loadingPoleDetails, setLoadingPoleDetails] = useState<boolean>(false);

  const handleOpenEditModal = () => {
    if (!survey || survey.nodes.length === 0) {
      toast.info('No recorded poles found in this survey run.');
      return;
    }
    const currentSelected = selectedNodeId ? survey.nodes.find(n => n.id === selectedNodeId) : null;
    const initialPole = currentSelected?.nameLabel || survey.nodes[0]?.nameLabel || '';
    setSelectedEditPole(initialPole);
    setConfirmEditModalVisible(true);
  };

  const handleEditChosenPole = (poleLabel: string) => {
    if (!survey) return;
    const targetNode = survey.nodes.find(n => n.nameLabel === poleLabel);
    const rawId = survey.id.replace('erect-', '');
    const erectionDbId = !isNaN(Number(rawId)) ? Number(rawId) : undefined;
    const drawingNum = survey.drawingNo || undefined;

    setLoadingPoleDetails(true);
    dispatch(fetchErectionPoleDetailsAction(
      {
        drawing_no: drawingNum,
        erection_id: erectionDbId,
        pole_no: poleLabel,
        node_id: targetNode?.id && !isNaN(Number(targetNode.id)) ? Number(targetNode.id) : undefined,
      },
      (data) => {
        setLoadingPoleDetails(false);
        setConfirmEditModalVisible(false);
        const serverNode = data?.selected_node;
        const finalNode = serverNode || targetNode;
        dispatch(resumeSurveyWithPole({
          lineId: survey.id,
          poleLabel,
          editingNode: finalNode,
        }));
        navigation.navigate('ActiveSurvey', {
          isEditingNode: true,
          targetPoleLabel: poleLabel,
          serverNodeData: finalNode || null,
          workflowType: 'ERECTION',
        });
      },
      (err) => {
        setLoadingPoleDetails(false);
        console.log('Using local pole details for edit:', err);
        setConfirmEditModalVisible(false);
        dispatch(resumeSurveyWithPole({
          lineId: survey.id,
          poleLabel,
          editingNode: targetNode,
        }));
        navigation.navigate('ActiveSurvey', {
          isEditingNode: true,
          targetPoleLabel: poleLabel,
          serverNodeData: targetNode || null,
          workflowType: 'ERECTION',
        });
      }
    ) as any);
  };

  const handleContinueFromChosenPole = (poleLabel: string) => {
    if (!survey) return;
    setConfirmEditModalVisible(false);
    dispatch(resumeSurveyWithPole({
      lineId: survey.id,
      poleLabel,
    }));
    navigation.navigate('ActiveSurvey', {
      isContinuation: true,
      targetPoleLabel: poleLabel,
      workflowType: 'ERECTION',
    });
  };

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
        <Text style={styles.errorText}>Erection details not found.</Text>
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
    if (isLocked) {
      toast.info('This completed erection is locked and can only be viewed.', { title: 'Editing unavailable' });
      return;
    }
    setSelectedSpanNodeId(null);
    setSelectedNodeId(node.id);
    setNodeName(node.nameLabel);
    setNodeLat(node.latitude.toString());
    setNodeLng(node.longitude.toString());
    setNodeCableSize(node.attributes.cableSize !== undefined && node.attributes.cableSize !== null ? String(node.attributes.cableSize) : '');
    setNodePoleType(node.attributes.poleType !== undefined && node.attributes.poleType !== null ? String(node.attributes.poleType) : '');
    setNodeHeight(node.attributes.height !== undefined && node.attributes.height !== null ? String(node.attributes.height) : '');
    setNodeTilt(node.attributes.tilt !== undefined && node.attributes.tilt !== null ? String(node.attributes.tilt) : '');
    setNodeSag(node.attributes.sag !== undefined && node.attributes.sag !== null ? String(node.attributes.sag) : '');
    setNodeSpanDistance(node.attributes.spanDistance !== undefined && node.attributes.spanDistance !== null ? String(node.attributes.spanDistance) : '');
    
    let resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
    setNodeParentLabel(resolvedParent);
  };

  const handleSelectSpan = (node: any, index: number) => {
    if (isLocked) {
      toast.info('This completed erection is locked and can only be viewed.', { title: 'Editing unavailable' });
      return;
    }
    setSelectedNodeId(null);
    setSelectedSpanNodeId(node.id);
    setNodeName(node.nameLabel);
    setNodeCableSize(node.attributes.cableSize !== undefined && node.attributes.cableSize !== null ? String(node.attributes.cableSize) : '');
    setNodePoleType(node.attributes.poleType !== undefined && node.attributes.poleType !== null ? String(node.attributes.poleType) : '');
    setNodeHeight(node.attributes.height !== undefined && node.attributes.height !== null ? String(node.attributes.height) : '');
    setNodeTilt(node.attributes.tilt !== undefined && node.attributes.tilt !== null ? String(node.attributes.tilt) : '');
    setNodeSag(node.attributes.sag !== undefined && node.attributes.sag !== null ? String(node.attributes.sag) : '');
    setNodeSpanDistance(node.attributes.spanDistance !== undefined && node.attributes.spanDistance !== null ? String(node.attributes.spanDistance) : '');
    
    let resolvedParent = node.parentLabel || (index > 0 ? projectedPoints[index - 1]?.nameLabel : '');
    setNodeParentLabel(resolvedParent);
  };

  const handleSaveNodeUpdates = () => {
    if (isLocked) return;
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

    toast.success('Structure details updated successfully.');
    setSelectedNodeId(null);
    setSelectedSpanNodeId(null);
  };

  const handleSaveMetadata = () => {
    if (isLocked) return;
    dispatch(updateSurveyLineMetadata({
      id: survey.id,
      contractorName: contractor.trim(),
      remarks: remarks.trim(),
      location: location.trim(),
      block: block.trim(),
      district: district.trim(),
      preparedBy: preparedBy.trim(),
    }));
    toast.success('Erection metadata parameters saved.');
  };

  const selectedPole = selectedNodeId
    ? survey.nodes.find(node => node.id === selectedNodeId && node.nodeType === 'POLE')
    : undefined;

  const handleContinueFromPole = () => {
    if (!selectedPole || isLocked) return;
    confirm({
      title: 'Continue From This Pole?',
      message: `New structures will branch from ${selectedPole.nameLabel}. Existing structures and spans remain unchanged.`,
      confirmLabel: 'CONTINUE ERECTION',
      onConfirm: () => {
        dispatch(resumeSurvey({ lineId: survey.id, parentLabel: selectedPole.nameLabel }));
        navigation.navigate('ActiveSurvey');
      },
    });
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
        <Text style={styles.headerTitle}>ERECTION DETAILS</Text>
        <View style={[styles.classBadge, { borderColor: accentColor }]}>
          <Text style={[styles.classBadgeText, { color: accentColor }]}>
            {getLineTypeLabel(survey.lineType)}
          </Text>
        </View>
      </View>

      {/* 3. SCROLLABLE LAYOUT */}
      <ScrollView style={styles.scrollContainerWrapper} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {isLocked ? (
          <View style={styles.lockedBanner}>
            <Text style={styles.lockedTitle}>COMPLETED ERECTION - VIEW ONLY</Text>
            <Text style={styles.lockedText}>This line was confirmed as complete and can no longer be edited or continued.</Text>
          </View>
        ) : (
          <View style={styles.editGuide}>
            <Text style={styles.editGuideTitle}>CHOOSE A POLE OR SPAN</Text>
            <Text style={styles.editGuideText}>Tap a span to edit it, or tap any pole to edit its details or continue the line from that point.</Text>
          </View>
        )}
        {/* DIAGRAM CANVAS */}
        <View style={styles.canvasPanel}>
          <View style={styles.panelHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.panelTitle}>LINE ROUTING LAYOUT</Text>
              {!isLocked && (
                <TouchableOpacity
                  style={styles.editIconButton}
                  onPress={handleOpenEditModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.editIconText}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
              <Text style={[styles.liveText, { color: isLocked ? '#64748B' : accentColor }]}>
                {isLocked ? 'VIEW ONLY' : 'INTERACTIVE'}
              </Text>
            </View>
          </View>
          <Text style={styles.canvasSubtitle}>
            {isLocked ? 'Routing layout is permanently locked.' : 'Tap a pole or span to edit physical parameters.'}
          </Text>

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
              showMixedVoltage={survey.lineType === 'LT_440V' && survey.ltStartingPoint === 'HT_TAPPING_POINT'}
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
            <Text style={styles.legendTitle}>STRUCTURE STATUS LEGEND</Text>
            <View style={styles.legendGrid}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDotSym, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.legendText}>New Pole / DTR</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDotSym, { backgroundColor: '#64748B' }]} />
                <Text style={styles.legendText}>Old Pole / DTR</Text>
              </View>
            </View>
          </View>
        </View>

        {/* INLINE ATTRS EDITOR */}
        {!isLocked && <SurveyAttributeEditor
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
        />}

        {!isLocked && selectedPole && (
          <View style={styles.continuationPanel}>
            <View style={styles.continuationCopy}>
              <Text style={styles.continuationTitle}>CONTINUE FROM {selectedPole.nameLabel}</Text>
              <Text style={styles.continuationText}>Capture a new branch or extend the route from this pole.</Text>
            </View>
            <TouchableOpacity style={styles.continuationButton} onPress={handleContinueFromPole}>
              <Text style={styles.continuationButtonText}>START HERE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* METADATA LEGEND FORM */}
        {!isLocked && <SurveyLegendForm
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
        />}
      </ScrollView>

      {/* Beautiful Edit Structure / Continuation Modal */}
      <Modal
        visible={confirmEditModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!loadingPoleDetails) setConfirmEditModalVisible(false);
        }}
      >
        <Pressable 
          style={styles.modalOverlayCenter} 
          onPress={() => {
            if (!loadingPoleDetails) setConfirmEditModalVisible(false);
          }}
        >
          <Pressable style={styles.confirmCard} onPress={e => e.stopPropagation()}>
            <View style={styles.confirmHeader}>
              <Text style={styles.confirmIcon}>✏️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.confirmTitle}>EDIT STRUCTURE / CONTINUATION</Text>
                {survey.drawingNo ? (
                  <Text style={styles.dwgBadgeText}>DWG NO: {survey.drawingNo}</Text>
                ) : null}
              </View>
            </View>

            <Text style={styles.confirmBodyText}>
              Select a pole to load its saved details from the database against this drawing, or continue line branching from it:
            </Text>

            {/* Pole Selection List */}
            <Text style={styles.polePickerLabel}>CHOOSE POLE / STRUCTURE:</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.poleChipsScroll}
              contentContainerStyle={styles.poleChipsContent}
            >
              {survey.nodes.map((node) => {
                const isSelected = selectedEditPole === node.nameLabel;
                const isDtr = node.nodeType === 'DTR';
                return (
                  <TouchableOpacity
                    key={node.id}
                    style={[
                      styles.poleChip,
                      isSelected && styles.poleChipSelected,
                      isDtr && styles.poleChipDtr,
                      isDtr && isSelected && styles.poleChipDtrSelected,
                    ]}
                    onPress={() => setSelectedEditPole(node.nameLabel)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.poleChipText,
                      isSelected && styles.poleChipTextSelected,
                      isDtr && styles.poleChipTextDtr,
                    ]}>
                      {node.nameLabel}
                    </Text>
                    <Text style={[
                      styles.poleChipSeq,
                      isSelected && styles.poleChipSeqSelected,
                    ]}>
                      #{node.sequenceNumber}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingPoleDetails ? (
              <View style={styles.loadingPoleBox}>
                <ActivityIndicator size="small" color="#0284C7" />
                <Text style={styles.loadingPoleText}>
                  Fetching {selectedEditPole} details from DB...
                </Text>
              </View>
            ) : (
              <View style={styles.modalActionButtonsCol}>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, !selectedEditPole && styles.actionBtnDisabled]}
                  disabled={!selectedEditPole || loadingPoleDetails}
                  onPress={() => handleEditChosenPole(selectedEditPole)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryActionBtnText}>
                    EDIT POLE DETAILS ({selectedEditPole || 'SELECT'})
                  </Text>
                  <Text style={styles.actionBtnSubtext}>
                    Loads and fills all saved database details for updating
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryActionBtn, !selectedEditPole && styles.actionBtnDisabled]}
                  disabled={!selectedEditPole || loadingPoleDetails}
                  onPress={() => handleContinueFromChosenPole(selectedEditPole)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.secondaryActionBtnText}>
                    CONTINUE LINE FROM {selectedEditPole || 'THIS POLE'}
                  </Text>
                  <Text style={styles.secondaryBtnSubtext}>
                    Add new pole structures with GPS connecting line
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.cancelLinkBtn}
                  onPress={() => setConfirmEditModalVisible(false)}
                >
                  <Text style={styles.cancelLinkText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
      </Modal>
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
  lockedBanner: {
    borderWidth: 1.2,
    borderColor: '#94A3B8',
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    padding: 14,
    marginBottom: 14,
  },
  lockedTitle: { color: '#334155', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  lockedText: { color: '#64748B', fontSize: 10.5, lineHeight: 16, marginTop: 4 },
  editGuide: {
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderRadius: 8,
    backgroundColor: 'rgba(2, 132, 199, 0.06)',
    padding: 14,
    marginBottom: 14,
  },
  editGuideTitle: { color: '#0369A1', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  editGuideText: { color: '#475569', fontSize: 10.5, lineHeight: 16, marginTop: 4 },
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
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginHorizontal: -4,
  },
  legendItem: {
    width: '50%',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 5,
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
    flex: 1,
    color: '#64748B',
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 13,
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
  continuationPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: '#059669',
    borderRadius: 8,
    backgroundColor: 'rgba(5, 150, 105, 0.06)',
    padding: 14,
    marginBottom: 20,
  },
  continuationCopy: { flex: 1, marginRight: 12 },
  continuationTitle: { color: '#047857', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.8 },
  continuationText: { color: '#64748B', fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  continuationButton: {
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  continuationButtonText: { color: '#FFFFFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
  editIconButton: {
    marginLeft: 10,
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
    borderColor: 'rgba(2, 132, 199, 0.25)',
    borderWidth: 1,
    borderRadius: 6,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconText: {
    fontSize: 10,
  },
  modalOverlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
    borderColor: 'rgba(2, 132, 199, 0.12)',
    borderWidth: 1,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  confirmTitle: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  confirmBodyText: {
    color: '#475569',
    fontSize: 10.5,
    lineHeight: 16,
    marginBottom: 20,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  confirmCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  confirmCancelText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  confirmResumeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  confirmResumeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  dwgBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0284C7',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  polePickerLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  poleChipsScroll: {
    maxHeight: 56,
    marginBottom: 16,
  },
  poleChipsContent: {
    gap: 8,
    paddingVertical: 2,
  },
  poleChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  poleChipSelected: {
    borderColor: '#0284C7',
    backgroundColor: 'rgba(2, 132, 199, 0.08)',
  },
  poleChipDtr: {
    borderColor: '#DDD6FE',
    backgroundColor: '#F5F3FF',
  },
  poleChipDtrSelected: {
    borderColor: '#7C3AED',
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
  },
  poleChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  poleChipTextSelected: {
    color: '#0284C7',
  },
  poleChipTextDtr: {
    color: '#7C3AED',
  },
  poleChipSeq: {
    fontSize: 8,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 1,
  },
  poleChipSeqSelected: {
    color: '#0284C7',
  },
  loadingPoleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  loadingPoleText: {
    fontSize: 11,
    color: '#0284C7',
    fontWeight: '700',
  },
  modalActionButtonsCol: {
    gap: 10,
  },
  primaryActionBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  actionBtnSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 8.5,
    marginTop: 2,
  },
  secondaryActionBtn: {
    backgroundColor: 'rgba(5, 150, 105, 0.08)',
    borderColor: '#059669',
    borderWidth: 1.2,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    color: '#059669',
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryBtnSubtext: {
    color: '#047857',
    fontSize: 8.5,
    marginTop: 2,
  },
  actionBtnDisabled: {
    opacity: 0.45,
  },
  cancelLinkBtn: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 4,
  },
  cancelLinkText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
