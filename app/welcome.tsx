
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { LinearGradient } from 'expo-linear-gradient';

export default function WelcomeScreen() {
  const router = useRouter();

  console.log('[WelcomeScreen] Rendering');

  const handleGetStarted = () => {
    console.log('[WelcomeScreen] Navigate to auth');
    router.push('/auth');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.logo}>🔗</Text>
            <Text style={styles.title}>Localink</Text>
            <Text style={styles.tagline}>Connecting Indian expats in Germany</Text>
          </View>

          <View style={styles.features}>
            <View style={styles.feature}>
              <Text style={styles.featureIcon}>🏠</Text>
              <Text style={styles.featureTitle}>Sublet</Text>
              <Text style={styles.featureText}>Find temporary accommodation</Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>✈️</Text>
              <Text style={styles.featureTitle}>Travel Buddy</Text>
              <Text style={styles.featureText}>Companionship for travelers</Text>
            </View>

            <View style={styles.feature}>
              <Text style={styles.featureIcon}>📦</Text>
              <Text style={styles.featureTitle}>Carry & Send</Text>
              <Text style={styles.featureText}>Send items via travelers</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  logo: {
    fontSize: 80,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  features: {
    gap: spacing.xl,
  },
  feature: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  featureTitle: {
    ...typography.h3,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  featureText: {
    ...typography.bodySmall,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    ...typography.button,
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
});
