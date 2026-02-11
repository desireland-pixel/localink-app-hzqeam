
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

export default function DataPrivacyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Data & Privacy</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide when creating an account and posting content, including:
          </Text>
          <Text style={styles.bulletPoint}>• Name and email address</Text>
          <Text style={styles.bulletPoint}>• City and location preferences</Text>
          <Text style={styles.bulletPoint}>• Posts and messages you create</Text>
          <Text style={styles.bulletPoint}>• Photos you upload</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How We Use Your Data</Text>
          <Text style={styles.paragraph}>
            Your information is used to:
          </Text>
          <Text style={styles.bulletPoint}>• Provide and improve our services</Text>
          <Text style={styles.bulletPoint}>• Connect you with other users</Text>
          <Text style={styles.bulletPoint}>• Send important updates and notifications</Text>
          <Text style={styles.bulletPoint}>• Ensure platform safety and security</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Protection</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard security measures to protect your data:
          </Text>
          <Text style={styles.bulletPoint}>• Encrypted data transmission</Text>
          <Text style={styles.bulletPoint}>• Secure authentication</Text>
          <Text style={styles.bulletPoint}>• Regular security audits</Text>
          <Text style={styles.bulletPoint}>• Limited data access</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Privacy Rights</Text>
          <Text style={styles.paragraph}>
            You have the right to:
          </Text>
          <Text style={styles.bulletPoint}>• Access your personal data</Text>
          <Text style={styles.bulletPoint}>• Request data correction or deletion</Text>
          <Text style={styles.bulletPoint}>• Opt out of marketing communications</Text>
          <Text style={styles.bulletPoint}>• Export your data</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal information. We only share data:
          </Text>
          <Text style={styles.bulletPoint}>• With your explicit consent</Text>
          <Text style={styles.bulletPoint}>• To comply with legal obligations</Text>
          <Text style={styles.bulletPoint}>• With service providers who help operate our platform</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Us</Text>
          <Text style={styles.paragraph}>
            For privacy-related questions or to exercise your rights, contact us at{' '}
            <Text style={styles.contactEmail}>info.localink@gmail.com</Text>
          </Text>
        </View>

        <Text style={styles.lastUpdated}>Last updated: January 2024</Text>
      </ScrollView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  bulletPoint: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginLeft: spacing.md,
  },
  contactEmail: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  lastUpdated: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
