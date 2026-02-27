
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

export default function DataPrivacyScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Data Controller</Text>
          <Text style={styles.paragraph}>
            LokaLinc ("we", "us", "our") is the data controller responsible for your personal data. For any privacy-related inquiries, contact us at{' '}
            <Text style={styles.contactEmail}>info.lokalinc@gmail.com</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Legal Basis for Processing</Text>
          <Text style={styles.paragraph}>
            We process your personal data based on:
          </Text>
          <Text style={styles.bulletPoint}>• Your consent (Article 6(1)(a) GDPR)</Text>
          <Text style={styles.bulletPoint}>• Performance of a contract (Article 6(1)(b) GDPR)</Text>
          <Text style={styles.bulletPoint}>• Compliance with legal obligations (Article 6(1)(c) GDPR)</Text>
          <Text style={styles.bulletPoint}>• Legitimate interests (Article 6(1)(f) GDPR)</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Personal Data We Collect</Text>
          <Text style={styles.paragraph}>
            We collect and process the following categories of personal data:
          </Text>
          <Text style={styles.bulletPoint}>• Identity data: Full name, username</Text>
          <Text style={styles.bulletPoint}>• Contact data: Email address</Text>
          <Text style={styles.bulletPoint}>• Location data: City of residence</Text>
          <Text style={styles.bulletPoint}>• User-generated content: Posts, messages, photos</Text>
          <Text style={styles.bulletPoint}>• Technical data: IP address, device information, usage data</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Purpose of Data Processing</Text>
          <Text style={styles.paragraph}>
            We process your personal data for the following purposes:
          </Text>
          <Text style={styles.bulletPoint}>• Providing and maintaining our services</Text>
          <Text style={styles.bulletPoint}>• Facilitating connections between users</Text>
          <Text style={styles.bulletPoint}>• Sending service-related communications</Text>
          <Text style={styles.bulletPoint}>• Ensuring platform safety and security</Text>
          <Text style={styles.bulletPoint}>• Improving our services and user experience</Text>
          <Text style={styles.bulletPoint}>• Complying with legal obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal data only for as long as necessary to fulfill the purposes outlined in this policy or as required by law. When data is no longer needed, we securely delete or anonymize it.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Your Rights Under GDPR</Text>
          <Text style={styles.paragraph}>
            You have the following rights regarding your personal data:
          </Text>
          <Text style={styles.bulletPoint}>• Right of access (Article 15): Request a copy of your personal data</Text>
          <Text style={styles.bulletPoint}>• Right to rectification (Article 16): Correct inaccurate data</Text>
          <Text style={styles.bulletPoint}>• Right to erasure (Article 17): Request deletion of your data</Text>
          <Text style={styles.bulletPoint}>• Right to restriction (Article 18): Limit processing of your data</Text>
          <Text style={styles.bulletPoint}>• Right to data portability (Article 20): Receive your data in a structured format</Text>
          <Text style={styles.bulletPoint}>• Right to object (Article 21): Object to processing based on legitimate interests</Text>
          <Text style={styles.bulletPoint}>• Right to withdraw consent: Withdraw consent at any time</Text>
          <Text style={styles.paragraph}>
            To exercise these rights, contact us at{' '}
            <Text style={styles.contactEmail}>info.lokalinc@gmail.com</Text>
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate technical and organizational measures to protect your personal data:
          </Text>
          <Text style={styles.bulletPoint}>• Encryption of data in transit and at rest</Text>
          <Text style={styles.bulletPoint}>• Secure authentication mechanisms</Text>
          <Text style={styles.bulletPoint}>• Regular security audits and assessments</Text>
          <Text style={styles.bulletPoint}>• Access controls and authorization procedures</Text>
          <Text style={styles.bulletPoint}>• Employee training on data protection</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Data Sharing and Transfers</Text>
          <Text style={styles.paragraph}>
            We do not sell your personal data. We may share data with:
          </Text>
          <Text style={styles.bulletPoint}>• Service providers who assist in operating our platform (under strict data processing agreements)</Text>
          <Text style={styles.bulletPoint}>• Law enforcement or regulatory authorities when legally required</Text>
          <Text style={styles.bulletPoint}>• Other users as necessary to provide our services (e.g., your posts are visible to other users)</Text>
          <Text style={styles.paragraph}>
            If we transfer data outside the EU/EEA, we ensure appropriate safeguards are in place (e.g., Standard Contractual Clauses).
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Cookies and Tracking</Text>
          <Text style={styles.paragraph}>
            We use cookies and similar technologies to improve your experience. You can manage cookie preferences through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our services are not intended for individuals under 16 years of age. We do not knowingly collect personal data from children.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this privacy policy from time to time. We will notify you of significant changes via email or through the app.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Supervisory Authority</Text>
          <Text style={styles.paragraph}>
            You have the right to lodge a complaint with your local data protection authority if you believe we have not handled your personal data in accordance with GDPR.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Contact Us</Text>
          <Text style={styles.paragraph}>
            For any questions about this privacy policy or to exercise your rights, contact us at:
          </Text>
          <Text style={styles.contactEmail}>info.lokalinc@gmail.com</Text>
        </View>

        <Text style={styles.lastUpdated}>Last updated: February 2026</Text>
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
