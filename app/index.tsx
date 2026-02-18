
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function IndexScreen() {
  const router = useRouter();
  const { user, profile, loading, profileLoading } = useAuth();

  useEffect(() => {
    console.log('[IndexScreen] Auth state:', { 
      user: user?.id, 
      profile: profile?.name, 
      loading, 
      profileLoading,
      username: profile?.username,
      city: profile?.city,
      gdprConsent: profile?.gdprConsentAccepted
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
        // Check if profile is complete (username, city, and GDPR consent)
        const isProfileComplete = profile && profile.username && profile.city && profile.gdprConsentAccepted;
        
        if (isProfileComplete) {
          // Profile is complete, go to home page
          console.log('[IndexScreen] User authenticated with complete profile, redirecting to home');
          router.replace('/(tabs)/sublet');
        } else {
          // Profile is incomplete, go to personal details
          console.log('[IndexScreen] User authenticated but profile incomplete, redirecting to personal-details');
          router.replace('/personal-details');
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, profile, loading, profileLoading]);

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
          <Text style={styles.title}>Localink</Text>
          <Text style={styles.tagline}>Living and moving together</Text>
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
