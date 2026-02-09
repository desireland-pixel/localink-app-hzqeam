
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { user, profile, loading, profileLoading } = useAuth();

  useEffect(() => {
    console.log('[IndexScreen] Auth state:', { 
      user: user?.id, 
      profile: profile?.name, 
      loading, 
      profileLoading,
      segments: segments.join('/')
    });
    
    if (loading || profileLoading) {
      console.log('[IndexScreen] Still loading...');
      return;
    }

    if (!user) {
      console.log('[IndexScreen] No user, showing welcome');
      router.replace('/welcome');
      return;
    }

    if (!profile || !profile.name || !profile.city) {
      console.log('[IndexScreen] User authenticated but profile incomplete, redirecting to create-profile');
      router.replace('/create-profile');
      return;
    }

    console.log('[IndexScreen] User authenticated with complete profile, redirecting to tabs');
    router.replace('/(tabs)/sublet');
  }, [user, profile, loading, profileLoading]);

  const isLoading = loading || profileLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🔗</Text>
          <Text style={styles.title}>Localink</Text>
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
  logo: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: '700',
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
