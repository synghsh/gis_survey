import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Theme from '../theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastOptions = {
  title?: string;
  duration?: number;
};

type ToastItem = ToastOptions & {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  show: (message: string, type?: ToastType, options?: ToastOptions) => void;
  success: (message: string, options?: ToastOptions) => void;
  error: (message: string, options?: ToastOptions) => void;
  warning: (message: string, options?: ToastOptions) => void;
  info: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_META: Record<ToastType, { color: string; label: string; mark: string }> = {
  success: { color: Theme.colors.success, label: 'Success', mark: '\u2713' },
  error: { color: Theme.colors.error, label: 'Error', mark: '!' },
  warning: { color: Theme.colors.warning, label: 'Warning', mark: '!' },
  info: { color: Theme.colors.glowCyan, label: 'Notice', mark: 'i' },
};

const DEFAULT_DURATION = 3500;

function Toast({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(1)).current;
  const closing = useRef(false);
  const meta = TOAST_META[toast.type];
  const duration = toast.duration ?? DEFAULT_DURATION;

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -16, duration: 180, useNativeDriver: true }),
    ]).start(onClose);
  }, [onClose, opacity, translateY]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 220, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    Animated.timing(progress, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start(({ finished }) => finished && close());

    return () => {
      translateY.stopAnimation();
      opacity.stopAnimation();
      progress.stopAnimation();
    };
  }, [close, duration, opacity, progress, translateY]);

  const progressWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={`${toast.title ?? meta.label}: ${toast.message}`}
        onPress={close}
        style={styles.pressable}
      >
        <View style={[styles.mark, { backgroundColor: meta.color }]}>
          <Text style={styles.markText}>{meta.mark}</Text>
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{toast.title ?? meta.label}</Text>
          <Text style={styles.message}>{toast.message}</Text>
        </View>
        <Text accessibilityLabel="Dismiss" style={styles.close}>x</Text>
      </Pressable>
      <Animated.View style={[styles.progress, { backgroundColor: meta.color, width: progressWidth }]} />
    </Animated.View>
  );
}

export function ToastProvider({ children }: React.PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastItem | null>(null);
  const nextId = useRef(0);

  const show = useCallback((message: string, type: ToastType = 'info', options: ToastOptions = {}) => {
    setToast({ id: ++nextId.current, message, type, ...options });
  }, []);

  const value = React.useMemo<ToastContextValue>(() => ({
    show,
    success: (message, options) => show(message, 'success', options),
    error: (message, options) => show(message, 'error', options),
    warning: (message, options) => show(message, 'warning', options),
    info: (message, options) => show(message, 'info', options),
  }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[styles.layer, { paddingTop: insets.top + 10 }]}>
        {toast && <Toast key={toast.id} toast={toast} onClose={() => setToast(null)} />}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside ToastProvider');
  return context;
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  toast: {
    width: '100%',
    maxWidth: 520,
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#161C27',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  pressable: {
    minHeight: 70,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  copy: { flex: 1, marginHorizontal: 12 },
  title: { color: Theme.colors.textPrimary, fontSize: 14, fontWeight: '700' },
  message: { color: '#C7CDD6', fontSize: 13, lineHeight: 18, marginTop: 3 },
  close: { color: Theme.colors.textSecondary, fontSize: 17, paddingHorizontal: 4 },
  progress: { height: 3 },
});
