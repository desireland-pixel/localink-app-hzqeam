import React, { useEffect, useRef, useState } from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/styles/commonStyles';

export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateOfflineState = (offline: boolean) => {
    // Always clear any pending show timer first
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (offline) {
      // Slow to show: wait 3s before declaring offline
      showTimerRef.current = setTimeout(() => {
        console.log('[OfflineBanner] Network offline confirmed after debounce — showing banner');
        setIsOffline(true);
        showTimerRef.current = null;
      }, 3000);
    } else {
      // Fast to hide: immediate
      console.log('[OfflineBanner] Network back online — hiding banner immediately');
      setIsOffline(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Web: use navigator.onLine + window events
      const handleOnline = () => updateOfflineState(false);
      const handleOffline = () => updateOfflineState(true);
      updateOfflineState(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        if (showTimerRef.current) {
          clearTimeout(showTimerRef.current);
          showTimerRef.current = null;
        }
      };
    }

    // Native: use expo-network listener
    let sub: { remove: () => void } | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const setupNative = async () => {
      try {
        const Network = await import('expo-network');

        if (typeof Network.addNetworkStateListener === 'function') {
          sub = Network.addNetworkStateListener((state) => {
            const offline = state.isConnected === false || state.isInternetReachable === false;
            updateOfflineState(offline);
          });
          // Seed initial state
          Network.getNetworkStateAsync().then((state) => {
            const offline = state.isConnected === false || state.isInternetReachable === false;
            updateOfflineState(offline);
          }).catch(() => {/* ignore */});
        } else {
          // Polling fallback
          const check = async () => {
            try {
              const state = await Network.getNetworkStateAsync();
              const offline = state.isConnected === false || state.isInternetReachable === false;
              updateOfflineState(offline);
            } catch {
              // Ignore — treat as online to avoid false positives
            }
          };
          await check();
          pollInterval = setInterval(check, 5000);
        }
      } catch {
        // expo-network unavailable — render nothing
      }
    };

    setupNative();

    return () => {
      try {
        sub?.remove();
      } catch {/* ignore */}
      if (pollInterval !== null) {
        clearInterval(pollInterval);
      }
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
