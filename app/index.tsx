
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, profile, loading, profileLoading } = useAuth();

  useEffect(() => {
    console.log('[WelcomeScreen] Auth state:', { 
      user: user?.id, 
      profile: profile?.name, 
      loading, 
      profileLoading 
    });
    
    // Wait for both user and profile to load
    if (loading || profileLoading) {
      console.log('[WelcomeScreen] Still loading...');
      return;
    }

    // Not authenticated -> go to auth
    if (!user) {
      console.log('[WelcomeScreen] No user, redirecting to auth');
      setTimeout(() => {
        router.replace('/auth');
      }, 1000);
      return;
    }

    // Authenticated but no profile -> go to create profile
    if (!profile || !profile.name || !profile.city) {
      console.log('[WelcomeScreen] User authenticated but profile incomplete, redirecting to create-profile');
      router.replace('/create-profile');
      return;
    }

    // Authenticated with complete profile -> go to main app
    console.log('[WelcomeScreen] User authenticated with complete profile, redirecting to tabs');
    router.replace('/(tabs)/sublet');
  }, [user, profile, loading, profileLoading, router]);

  const isLoading = loading || profileLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🔗</Text>
          <Text style={styles.title}>Localink</Text>
        </View>
        <Text style={styles.subtitle}>Connecting Indian expats in Germany</Text>
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
  logo: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
  },
  subtitle: {
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
