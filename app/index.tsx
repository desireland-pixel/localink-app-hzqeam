
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('WelcomeScreen: Checking auth state', { user, loading });
    
    if (!loading) {
      if (user) {
        console.log('WelcomeScreen: User authenticated, checking profile');
        // Check if user has completed profile
        // Note: user.city is stored in the profile table, not in the auth user object
        // We'll check for it via the profile API in the tabs layout
        if (user.name) {
          console.log('WelcomeScreen: User has name, redirecting to tabs');
          router.replace('/(tabs)');
        } else {
          console.log('WelcomeScreen: Profile incomplete, redirecting to create-profile');
          router.replace('/create-profile');
        }
      } else {
        console.log('WelcomeScreen: No user, redirecting to auth');
        // Delay to show welcome screen briefly
        const timer = setTimeout(() => {
          router.replace('/auth');
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🔗</Text>
          <Text style={styles.title}>Localink</Text>
        </View>
        <Text style={styles.subtitle}>Connecting Indian expats in Germany</Text>
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
});
