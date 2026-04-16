import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationBell } from "@/components/NotificationBell";

// Segment names that are public (no auth required).
const PUBLIC_SEGMENTS = ['reset-password', 'auth', 'verify-otp', 'auth-popup', 'auth-callback'];

// Segment names where an authenticated user is already in the right place
// (e.g. arrived via deep link). Do not redirect away from these.
const AUTHENTICATED_SEGMENTS = ['(tabs)', 'sublet', 'travel', 'community', 'chat'];

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading, profileLoading } = useAuth();
  const segments = useSegments();
  // Guard: only redirect once per app session. Prevents the 20-min session
  // refresh in AuthContext from re-firing router.replace and destroying the
  // navigation stack (which breaks the back button on all subsequent screens).
  const hasRedirected = useRef(false);

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

    // Only redirect once — never again after the first redirect.
    if (hasRedirected.current) {
      console.log('[IndexScreen] Already redirected, skipping');
      return;
    }

    const currentSegment = segments[0];

    // If already on a public route (e.g. deep link to reset-password), stay.
    const isOnPublicRoute = PUBLIC_SEGMENTS.includes(currentSegment as string);
    if (isOnPublicRoute) {
      console.log('[IndexScreen] Already on public route, skipping redirect:', currentSegment);
      return;
    }

    // If already on an authenticated content screen (e.g. deep link to
    // /community/[id] or /sublet/[id]), do not redirect away.
    const isAlreadyInApp = AUTHENTICATED_SEGMENTS.includes(currentSegment as string);
    if (isAlreadyInApp) {
      console.log('[IndexScreen] Already on authenticated route, skipping redirect:', currentSegment);
      hasRedirected.current = true;
      return;
    }

    hasRedirected.current = true;

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
