import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput } from 'react-native';
import Theme from '../../../theme';

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
    <View style={[styles.panel, styles.editorPanel]}>
      <View style={styles.panelHeader}>
        <Text style={[styles.panelTitle, { color: Theme.colors.warning }]}>
          {selectedNodeId ? `EDIT NODE PARAMETERS: ${nodeName}` : `EDIT SECTION SPAN: ${nodeName}`}
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

      <TouchableOpacity style={styles.saveBtn} onPress={onApply}>
        <Text style={styles.saveBtnText}>APPLY STRUCTURE CHANGES</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    ...Theme.glassmorphic.container,
    padding: 16,
    marginBottom: 20,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  panelTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.5,
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
});
