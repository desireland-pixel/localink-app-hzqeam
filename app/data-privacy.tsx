
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

export default function DataPrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Controller</Text>
          <Text style={styles.paragraph}>
            LokaLinc (“we”, “us”) is the controller within the meaning of the EU General Data Protection Regulation (GDPR).
          </Text>
          <Text style={styles.paragraph}>
            Contact:{' '}
            <Text style={styles.contactEmail}>privacy@lokalinc.de</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Categories of Personal Data</Text>
          <Text style={styles.paragraph}>
            We process the following categories of personal data:
          </Text>
          <Text style={styles.bulletPoint}>• Account data (name, username, email address)</Text>
          <Text style={styles.bulletPoint}>• Profile information (city)</Text>
          <Text style={styles.bulletPoint}>• User-generated content (posts, messages, photos)</Text>
          <Text style={styles.bulletPoint}>• Communication data (support requests, inquiries)</Text>
          <Text style={styles.bulletPoint}>• Technical data (IP address, device information, log data, timestamps)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Purposes and Legal Basis (Art. 6 GDPR)</Text>
          <Text style={styles.paragraph}>
            Processing is carried out on the following legal bases:
          </Text>
          <Text style={styles.bulletPoint}>• Art. 6(1)(b) GDPR – performance of contract (provision of the platform)</Text>
          <Text style={styles.bulletPoint}>• Art. 6(1)(f) GDPR – legitimate interests (platform security, fraud prevention, service improvement, enforcement of terms)</Text>
          <Text style={styles.bulletPoint}>• Art. 6(1)(c) GDPR – compliance with legal obligations</Text>
          <Text style={styles.bulletPoint}>• Art. 6(1)(a) GDPR – consent, where applicable</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Hosting and Infrastructure</Text>
          <Text style={styles.paragraph}>
            The platform is hosted by external service providers. Data is stored on secure infrastructure within the European Union or in jurisdictions offering adequate data protection safeguards pursuant to Art. 44 et seq. GDPR.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Communication Content</Text>
          <Text style={styles.paragraph}>
            Messages, posts and other user-generated content are stored on service provider. Access by administrators is restricted and may occur only where necessary for security, abuse prevention, technical maintenance, or legal compliance.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            Personal data is retained for the duration of the user relationship. Upon verified deletion request, account data is erased within 30 days unless statutory retention obligations require otherwise.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Data Sharing</Text>
          <Text style={styles.paragraph}>
            We do not sell personal data. Data may be disclosed:
          </Text>
          <Text style={styles.bulletPoint}>• To service providers under data processing agreements (Art. 28 GDPR)</Text>
          <Text style={styles.bulletPoint}>• To competent authorities where legally required</Text>
          <Text style={styles.bulletPoint}>• To other users where inherent to platform functionality</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Security Measures</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures pursuant to Art. 32 GDPR, including encrypted data transmission (HTTPS), hashed passwords, and access controls.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Your Rights</Text>
          <Text style={styles.paragraph}>
            You have rights under Articles 15–21 GDPR, including access, rectification, deletion, restriction, objection, and data portability.
          </Text>
          <Text style={styles.paragraph}>
            Requests may be directed to:{' '}
            <Text style={styles.contactEmail}>privacy@lokalinc.de</Text>
          </Text>
        </View>

        <Text style={styles.lastUpdated}>Last updated: March 2026</Text>
        <Text style={styles.lastUpdated}>This policy complies with the EU General Data Protection Regulation (GDPR)</Text>
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
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '700',
  },
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
    fontSize: 14,
  },
  bulletPoint: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginLeft: spacing.md,
    fontSize: 14,
  },
  contactEmail: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  lastUpdated: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontSize: 12,
  },
});
