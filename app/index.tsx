
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

// Segment names that are public (no auth required).
// These match the file names in the app/ directory without the leading slash.
const PUBLIC_SEGMENTS = ['reset-password', 'auth', 'verify-otp', 'auth-popup', 'auth-callback'];

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading, profileLoading } = useAuth();
  // useSegments returns the current route path as an array, e.g. ['reset-password']
  // or ['(tabs)', 'sublet']. This is synchronous and always up-to-date.
  const segments = useSegments();

  useEffect(() => {
    console.log('[IndexScreen] Auth state:', {
      user: user?.id,
      loading,
      profileLoading,
      segments,
    });

    if (loading || profileLoading) {
      console.log('[IndexScreen] Still loading...');
      return;
    }

    // If expo-router has already navigated to a public screen (e.g. via deep link),
    // do not redirect — the user is exactly where they should be.
    const currentSegment = segments[0];
    const isOnPublicRoute = PUBLIC_SEGMENTS.includes(currentSegment as string);
    if (isOnPublicRoute) {
      console.log('[IndexScreen] Already on public route, skipping redirect:', currentSegment);
      return;
    }

    const timer = setTimeout(() => {
      if (!user) {
        console.log('[IndexScreen] No user, redirecting to auth');
        router.replace('/auth');
      } else {
        console.log('[IndexScreen] User authenticated, redirecting to home');
        router.replace('/(tabs)/sublet');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, profileLoading, segments, router]);

  const isLoading = loading || profileLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/Logo_LokaLinc.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.title}>LokaLinc</Text>
          <Text style={styles.tagline}>Living and Moving together</Text>
        </View>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
