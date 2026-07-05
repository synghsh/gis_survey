import React, { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface DropdownOption {
  label: string;
  value: string;
}

interface DropdownProps {
  label: string;
  placeholder: string;
  options: readonly DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function Dropdown({ label, placeholder, options, value, onChange, disabled = false }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(option => option.value === value)?.label;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[styles.trigger, disabled && styles.triggerDisabled]}
      >
        <Text style={[styles.value, !selectedLabel && styles.placeholder]} numberOfLines={1}>
          {selectedLabel ?? placeholder}
        </Text>
        <Text style={styles.chevron}>v</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={styles.closeButton}>
                <Text style={styles.closeText}>x</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={item => item.value}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { color: '#64748B', fontSize: 9, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
  trigger: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(2, 132, 199, 0.20)',
    borderRadius: 8,
    paddingHorizontal: 14,
    backgroundColor: '#FFFFFF',
  },
  triggerDisabled: { opacity: 0.48, backgroundColor: '#F1F5F9' },
  value: { flex: 1, color: '#0F172A', fontSize: 13, fontWeight: '600' },
  placeholder: { color: '#94A3B8', fontWeight: '400' },
  chevron: { color: '#0284C7', fontSize: 13, fontWeight: '800', marginLeft: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.50)', justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sheetTitle: { color: '#0F172A', fontSize: 15, fontWeight: '800' },
  closeButton: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#64748B', fontSize: 18, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#E2E8F0' },
  option: { minHeight: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  optionSelected: { backgroundColor: 'rgba(2, 132, 199, 0.06)' },
  optionText: { flex: 1, color: '#334155', fontSize: 13 },
  optionTextSelected: { color: '#0369A1', fontWeight: '700' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: { borderColor: '#0284C7' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#0284C7' },
});
