import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { setIsOnline } from '@/utils/networkState';
import { colors, borderRadius, spacing, typography } from '@/styles/commonStyles';

// Slow to show (avoid flicker on brief drops), fast to hide.
const SHOW_DEBOUNCE_MS = 3000;

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors committed modal state so callbacks can read it without re-subscribing.
  const isOfflineRef = useRef(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    let cancelled = false;

    // Update the singleton IMMEDIATELY — no debounce — so apiCall is blocked
    // as soon as we know the device is offline.
    const updateNetworkState = (offline: boolean) => {
      setIsOnline(!offline);
      console.log('[OfflineBanner] network state updated — offline:', offline);
    };

    // Debounced, idempotent state transition for the MODAL UI only.
    const setBannerOffline = (offline: boolean) => {
      if (cancelled) return;

      if (offline) {
        if (isOfflineRef.current) return; // already showing
        if (showTimerRef.current) return; // show already scheduled — don't reset it
        showTimerRef.current = setTimeout(() => {
          showTimerRef.current = null;
          isOfflineRef.current = true;
          setIsOffline(true);
          console.log('[OfflineBanner] offline confirmed — showing modal');
        }, SHOW_DEBOUNCE_MS);
      } else {
        if (showTimerRef.current) {
          clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
        if (isOfflineRef.current) {
          isOfflineRef.current = false;
          setIsOffline(false);
          console.log('[OfflineBanner] back online — hiding modal');
        }
      }
    };

    // --- Web: navigator.onLine is reliable and event-driven ---
    if (Platform.OS === 'web') {
      const handleOnline = () => {
        updateNetworkState(false);
        setBannerOffline(false);
      };
      const handleOffline = () => {
        updateNetworkState(true);
        setBannerOffline(true);
      };
      const initialOffline = !navigator.onLine;
      updateNetworkState(initialOffline);
      setBannerOffline(initialOffline);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        cancelled = true;
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (showTimerRef.current) {
          clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
      };
    }

    // --- Native: event-driven NetInfo subscription ---
    // isConnected === false  → no interface at all (airplane mode, etc.)
    // isInternetReachable === false → interface present but no real internet
    // isInternetReachable === null  → not yet determined; treat as online
    const handleNetInfoState = (state: import('@react-native-community/netinfo').NetInfoState) => {
      const offline = state.isConnected === false || state.isInternetReachable === false;
      console.log('[OfflineBanner] NetInfo event — isConnected:', state.isConnected, 'isInternetReachable:', state.isInternetReachable, '→ offline:', offline);
      updateNetworkState(offline);
      setBannerOffline(offline);
    };

    // Subscribe to connectivity changes.
    const unsubscribe = NetInfo.addEventListener(handleNetInfoState);

    // Re-query when the app returns to the foreground (state may have gone stale).
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        console.log('[OfflineBanner] app foregrounded — re-querying NetInfo');
        NetInfo.fetch().then(handleNetInfoState).catch(() => {/* ignore */});
      }
    });

    // Initial fetch so we don't wait for the first event.
    NetInfo.fetch().then(handleNetInfoState).catch(() => {/* ignore */});

    return () => {
      cancelled = true;
      unsubscribe();
      appStateSub.remove();
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }
    };
  }, []);

  const cardBg = isDark ? colors.cardDark : colors.background;
  const titleColor = isDark ? colors.textDark : colors.text;
  const subtitleColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <Modal
      visible={isOffline}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
      onRequestClose={() => {/* no-op — user must restore connectivity */}}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: cardBg }]}>
          <Text style={styles.icon}>
            {'\u{1F6AB}'}
          </Text>
          <Text style={[styles.title, { color: titleColor }]}>
            No internet connection
          </Text>
          <Text style={[styles.subtitle, { color: subtitleColor }]}>
            Check your Wi-Fi or mobile data and try again. The app will reconnect automatically.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
  },
});
