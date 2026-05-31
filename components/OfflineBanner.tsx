import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';

// A tiny, well-known endpoint that returns HTTP 204 with an empty body.
// This is the same captive-portal / reachability check Android itself uses.
const REACHABILITY_URL = 'https://www.gstatic.com/generate_204';
const PROBE_TIMEOUT_MS = 5000; // give up on a single probe after 5s
const POLL_INTERVAL_MS = 8000; // re-check reachability on this cadence
const SHOW_DEBOUNCE_MS = 3000; // slow to show (avoid flicker), fast to hide

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mirrors the committed banner state so callbacks can read it without
  // re-subscribing, and so we never reset an in-flight "show" timer.
  const isOfflineRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Debounced, idempotent state transition.
    const setOffline = (offline: boolean) => {
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
      const handleOnline = () => setOffline(false);
      const handleOffline = () => setOffline(true);
      setOffline(!navigator.onLine);
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

    // --- Native: active reachability probe ---
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let netSub: { remove: () => void } | null = null;
    let appStateSub: { remove: () => void } | null = null;

    const probe = async () => {
      if (cancelled) return;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
        const res = await fetch(`${REACHABILITY_URL}?_=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        setOffline(!res.ok); // 204/200 => reachable
      } catch {
        // Network error or timeout => no real internet
        setOffline(true);
      }
    };

    // expo-network listener: only used to react instantly to interface changes.
    // We never trust `isConnected: true` to mean "online" — we re-probe instead.
    (async () => {
      try {
        const Network = await import('expo-network');
        if (typeof Network.addNetworkStateListener === 'function') {
          netSub = Network.addNetworkStateListener((state) => {
            if (state.isConnected === false) {
              setOffline(true); // no interface at all — definitely offline
            } else {
              probe(); // interface present — verify real reachability
            }
          });
        }
      } catch {
        // expo-network unavailable — the poll below still covers us.
      }
    })();

    // Re-probe when the app returns to the foreground.
    appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') probe();
    });

    probe(); // initial check
    pollTimer = setInterval(probe, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      try {
        netSub?.remove();
      } catch {/* ignore */}
      try {
        appStateSub?.remove();
      } catch {/* ignore */}
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
