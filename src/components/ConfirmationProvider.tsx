import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ConfirmationTone = 'primary' | 'warning' | 'destructive';

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
  onConfirm: () => void;
}

interface ConfirmationContextValue {
  confirm: (options: ConfirmationOptions) => void;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(null);

const TONE_COLORS: Record<ConfirmationTone, string> = {
  primary: '#0284C7',
  warning: '#D97706',
  destructive: '#DC2626',
};

export function ConfirmationProvider({ children }: React.PropsWithChildren) {
  const [dialog, setDialog] = useState<ConfirmationOptions | null>(null);
  const confirm = useCallback((options: ConfirmationOptions) => setDialog(options), []);
  const value = useMemo(() => ({ confirm }), [confirm]);

  const close = () => setDialog(null);
  const handleConfirm = () => {
    const action = dialog?.onConfirm;
    close();
    action?.();
  };

  const tone = dialog?.tone ?? 'primary';
  const accent = TONE_COLORS[tone];

  return (
    <ConfirmationContext.Provider value={value}>
      {children}
      <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.overlay} onPress={close}>
          <Pressable style={styles.dialog} onPress={event => event.stopPropagation()}>
            <View style={[styles.icon, { backgroundColor: `${accent}14`, borderColor: `${accent}40` }]}>
              <Text style={[styles.iconText, { color: accent }]}>{tone === 'primary' ? '?' : '!'}</Text>
            </View>
            <Text style={styles.title}>{dialog?.title}</Text>
            <Text style={styles.message}>{dialog?.message}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={close} activeOpacity={0.75}>
                <Text style={styles.cancelText}>{dialog?.cancelLabel ?? 'CANCEL'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, { backgroundColor: accent }]}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmText}>{dialog?.confirmLabel ?? 'CONFIRM'}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmationContext.Provider>
  );
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error('useConfirmation must be used inside ConfirmationProvider');
  return context;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.50)',
    padding: 22,
  },
  dialog: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 14,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 12,
  },
  iconText: { fontSize: 17, fontWeight: '900' },
  title: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  message: { color: '#64748B', fontSize: 12, lineHeight: 18, marginTop: 7 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
  cancelButton: {
    minHeight: 40,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    marginRight: 9,
  },
  cancelText: { color: '#475569', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.6 },
  confirmButton: {
    minHeight: 40,
    minWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  confirmText: { color: '#FFFFFF', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.6 },
});
