import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';

interface SurveyAttributeEditorProps {
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
  onCancel: () => void;
  onApply: () => void;
}

export default function SurveyAttributeEditor({
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
  onCancel,
  onApply,
}: SurveyAttributeEditorProps) {
  if (!selectedNodeId && !selectedSpanNodeId) return null;

  return (
    <View style={styles.editorPanel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>
          {selectedNodeId ? `EDIT STRUCTURE NODE: ${nodeName}` : `EDIT SECTION SPAN: ${nodeName}`}
        </Text>
        <TouchableOpacity onPress={onCancel}>
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
            <View style={styles.formGroupThird}>
              <Text style={styles.formLabel}>CABLE SPECIFICATION</Text>
              <TextInput
                style={styles.formInput}
                value={nodeCableSize}
                onChangeText={setNodeCableSize}
                placeholder="e.g. 90 sqmm ABC"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupThird}>
              <Text style={styles.formLabel}>SPAN DISTANCE (METERS)</Text>
              <TextInput
                style={styles.formInput}
                value={nodeSpanDistance}
                onChangeText={setNodeSpanDistance}
                placeholder="e.g. 35m"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupThird}>
              <Text style={styles.formLabel}>PARENT NODE / ID (CONNECTION)</Text>
              <TextInput
                style={styles.formInput}
                value={nodeParentLabel}
                onChangeText={setNodeParentLabel}
                placeholder="e.g. DTR 100KVA or P1"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupThird}>
              <Text style={styles.formLabel}>STRUCTURE TYPE</Text>
              <TextInput
                style={styles.formInput}
                value={nodePoleType}
                onChangeText={setNodePoleType}
                placeholder="Concrete/Tubular"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupThird}>
              <Text style={styles.formLabel}>TILT DEVIATION</Text>
              <TextInput
                style={styles.formInput}
                value={nodeTilt}
                onChangeText={setNodeTilt}
                placeholder="0°"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>

            <View style={styles.formGroupThird}>
              <Text style={styles.formLabel}>SAG RATIO</Text>
              <TextInput
                style={styles.formInput}
                value={nodeSag}
                onChangeText={setNodeSag}
                placeholder="0.3m"
                placeholderTextColor="rgba(30, 41, 59, 0.35)"
              />
            </View>
          </>
        )}
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={onApply}>
        <Text style={styles.saveBtnText}>APPLY STRUCTURE CHANGES</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
