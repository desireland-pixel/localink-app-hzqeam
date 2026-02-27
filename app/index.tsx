
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const router = useRouter();
  const { user, loading, profileLoading } = useAuth();

  useEffect(() => {
    console.log('[IndexScreen] Auth state:', { 
      user: user?.id, 
      loading, 
      profileLoading,
    });
    
    if (loading || profileLoading) {
      console.log('[IndexScreen] Still loading...');
      return;
    }

    // Use setTimeout to ensure navigation happens after render
    const timer = setTimeout(() => {
      if (!user) {
        console.log('[IndexScreen] No user, redirecting to auth');
        router.replace('/auth');
      } else {
        // User is authenticated - go directly to home page, no profile completion check
        console.log('[IndexScreen] User authenticated, redirecting to home');
        router.replace('/(tabs)/sublet');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, loading, profileLoading, router]);

  const isLoading = loading || profileLoading;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/e0ef75c7-f2f2-4978-a582-c04be452d5cf.png')}
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
