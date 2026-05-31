import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';
import { setIsOnline } from '@/utils/networkState';

// Slow to show (avoid flicker on brief drops), fast to hide.
const SHOW_DEBOUNCE_MS = 3000;

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors committed banner state so callbacks can read it without re-subscribing.
  const isOfflineRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Update the singleton IMMEDIATELY — no debounce — so apiCall is blocked
    // as soon as we know the device is offline.
    const updateNetworkState = (offline: boolean) => {
      setIsOnline(!offline);
      console.log('[OfflineBanner] network state updated — offline:', offline);
    };

    // Debounced, idempotent state transition for the BANNER UI only.
    const setBannerOffline = (offline: boolean) => {
      if (cancelled) return;

      if (offline) {
        if (isOfflineRef.current) return; // already showing
        if (showTimerRef.current) return; // show already scheduled — don't reset it
        showTimerRef.current = setTimeout(() => {
          showTimerRef.current = null;
          isOfflineRef.current = true;
          setIsOffline(true);
          console.log('[OfflineBanner] offline confirmed — showing banner');
        }, SHOW_DEBOUNCE_MS);
      } else {
        if (showTimerRef.current) {
          clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
        if (isOfflineRef.current) {
          isOfflineRef.current = false;
          setIsOffline(false);
          console.log('[OfflineBanner] back online — hiding banner');
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

  if (!isOffline) {
    return null;
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <Text style={styles.text}>No internet connection</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    zIndex: 9999,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
});
