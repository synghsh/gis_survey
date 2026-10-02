import React from 'react';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';

interface SurveyAttributeEditorProps {
  appearance?: 'default' | 'erection';
  selectedNodeId: string | null;
  selectedSpanNodeId: string | null;
  nodeName: string;
  setNodeName: (v: string) => void;
  nodeParentLabel: string;
  setNodeParentLabel: (v: string) => void;
  nodeHeight: string;
  setNodeHeight: (v: string) => void;
  nodePoleType: string;
  setNodePoleType: (v: string) => void;
  nodeLat: string;
  setNodeLat: (v: string) => void;
  nodeLng: string;
  setNodeLng: (v: string) => void;
  nodeCableSize: string;
  setNodeCableSize: (v: string) => void;
  nodeTilt: string;
  setNodeTilt: (v: string) => void;
  nodeSag: string;
  setNodeSag: (v: string) => void;
  nodeSpanDistance: string;
  setNodeSpanDistance: (v: string) => void;
  isSaving?: boolean;
  onCancel: () => void;
  onApply: () => void;
}

export default function SurveyAttributeEditor({
  appearance = 'default',
  selectedNodeId,
  selectedSpanNodeId,
  nodeName,
  setNodeName,
  nodeParentLabel,
  setNodeParentLabel,
  nodeHeight,
  setNodeHeight,
  nodePoleType,
  setNodePoleType,
  nodeLat,
  setNodeLat,
  nodeLng,
  setNodeLng,
  nodeCableSize,
  setNodeCableSize,
  nodeTilt,
  setNodeTilt,
  nodeSag,
  setNodeSag,
  nodeSpanDistance,
  setNodeSpanDistance,
  isSaving = false,
  onCancel,
  onApply,
}: SurveyAttributeEditorProps) {
  if (!selectedNodeId && !selectedSpanNodeId) return null;

  return (
    <View style={[styles.editorPanel, appearance === 'erection' && styles.erectionPanel]}>
      <View style={styles.panelHeader}>
        <Text style={[styles.panelTitle, appearance === 'erection' && styles.erectionTitle]}>
          {selectedNodeId ? `EDIT STRUCTURE NODE: ${nodeName}` : `EDIT SECTION SPAN: ${nodeName}`}
        </Text>
        <TouchableOpacity onPress={onCancel} disabled={isSaving}>
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
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>POLE HEIGHT SPEC</Text>
              <TextInput
                style={styles.formInput}
                value={nodeHeight}
                onChangeText={setNodeHeight}
                placeholder="e.g. 9m"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>STRUCTURE TYPE</Text>
              <TextInput
                style={styles.formInput}
                value={nodePoleType}
                onChangeText={setNodePoleType}
                placeholder="Concrete/Tubular"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
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
            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>SPAN DISTANCE (METERS)</Text>
              <TextInput
                style={styles.formInput}
                value={nodeSpanDistance}
                onChangeText={setNodeSpanDistance}
                placeholder="e.g. 35m or 35"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupHalf}>
              <Text style={styles.formLabel}>PARENT NODE / ID (CONNECTION)</Text>
              <TextInput
                style={styles.formInput}
                value={nodeParentLabel}
                onChangeText={setNodeParentLabel}
                placeholder="e.g. DTR 100KVA or P1"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>
          </>
        )}
      </View>

      <TouchableOpacity 
        style={[styles.saveBtn, appearance === 'erection' && styles.erectionSaveButton, isSaving && { opacity: 0.6 }]}
        onPress={onApply}
        disabled={isSaving}
      >
        {appearance === 'erection' && <View style={[StyleSheet.absoluteFill, { borderRadius: 12, overflow: 'hidden' }]} pointerEvents="none"><Svg width="100%" height="100%"><Defs><LinearGradient id="structureSaveGradient" x1="0%" y1="100%" x2="100%" y2="0%"><Stop offset="0%" stopColor="#1744FF" /><Stop offset="55%" stopColor="#783BFF" /><Stop offset="100%" stopColor="#D348FA" /></LinearGradient></Defs><Rect width="100%" height="100%" fill="url(#structureSaveGradient)" /></Svg></View>}
        <Text style={styles.saveBtnText}>
          {isSaving ? 'APPLYING CHANGES...' : 'APPLY STRUCTURE CHANGES'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  erectionPanel: { backgroundColor: '#FCFEFF', borderColor: '#C09AF0', borderLeftWidth: 3, borderLeftColor: '#983EFF', borderRadius: 18, padding: 12, marginBottom: 12, shadowColor: '#C09AF0', shadowOpacity: 0.13, shadowRadius: 8, elevation: 3, shadowOffset: { width: 0, height: 3 }, },
  erectionTitle: { color: '#151A54', fontSize: 11, letterSpacing: 0 },
  erectionSaveButton: { backgroundColor: '#7940F6', borderRadius: 12 },
  editorPanel: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomColor: 'rgba(2, 132, 199, 0.08)',
    borderBottomWidth: 1.2,
    paddingBottom: 8,
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: '#0284C7',
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
  formLabel: {
    color: '#64748B',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 5,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(2, 132, 199, 0.15)',
    borderWidth: 1.2,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#0F172A',
    fontSize: 12,
  },
  saveBtn: {
    backgroundColor: '#0284C7',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
