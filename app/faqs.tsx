
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'What is LokaLinc?',
    answer: 'LokaLinc is a community platform connecting expats in Germany. We help you find temporary accommodation (sublets), travel companions, and people who can carry (small/urgent) items between India and Germany.',
  },
  {
    question: 'How do I post a sublet?',
    answer: 'Navigate to the Sublet tab and tap the + icon in the top right. Select whether you are offering or seeking a sublet, fill in the required details (city, dates, rent), and tap Post. Please ensure you have any required landlord consent before subletting.',
  },
  {
    question: 'How do I post a travel request or offer?',
    answer: 'Navigate to the Travel tab and tap the + icon in the top right. Select whether you are Offering or Seeking travel companionship or item support. Fill in route, date, and details, then tap Post. Users are responsible for complying with airline and customs regulations.',
  },
  {
    question: 'How do I post in the Community section?',
    answer: 'Navigate to the Community tab and tap the + icon in the top right. Select a category (e.g., General, Insurance, Jobs, Visa), enter a clear title and description, then tap Post. Your discussion will be visible to other users who can reply and share their knowledge.',
  },
  {
    question: 'Is subletting allowed in Germany?',
    answer: 'Yes, Subletting is generally permitted under German law, but in most cases landlord consent is required (§§ 540, 553 BGB). Users are solely responsible for ensuring that their subletting arrangement complies with applicable laws and rental agreements. The platform does not provide legal advice or verify compliance.',
  },
  {
    question: 'How do I find a sublet?',
    answer: 'Open the Sublet tab to browse available listings. Enter city to filter listings. You can use filters to narrow results by dates, budget/rent, or role (Offering/Seeking). Tap on any post to see more details.',
  },
  {
    question: 'How do I find a travel companion or item support?',
    answer: 'Open the Travel tab to browse available listings. Enter the city/country of departure and/or destination. You can use filters to narrow down results. Tap on any post to see more details.',
  },
  {
    question: 'How do I contact someone about a post?',
    answer: 'Open any post and tap the "Contact" button at the bottom. This will start a conversation in your Inbox where you can chat directly with the poster. The platform only facilitates communication. Any agreements are made directly between users.',
  },
  {
    question: 'How do I edit my post after publishing?',
    answer: 'Go to Profile > My Posts, find your post, and tap the Edit button. You can update any details and save your changes.',
  },
  {
    question: 'How do I close or delete my post?',
    answer: 'Go to Profile > My Posts, find your post. In case of Sublet and Travel, you can tap "Delete" to remove it from the listings. In case of Community, if it\'s active, tap "Close" to mark it as closed. and if it\'s already closed, you can tap "Delete" to permanently remove it.',
  },
  {
    question: 'How do I save posts I like?',
    answer: 'Tap the heart icon on any post to add it to your favorites. You can view all your saved posts in Profile > Favourites.',
  },
  {
    question: 'What is the difference between offering and seeking?',
    answer: 'Offering means you have something to provide (e.g., a sublet to rent out, travel companionship to offer, or you can carry items). Seeking means you are looking for something (e.g., looking for a sublet, seeking a travel companion, or seeking an ally to carry items).',
  },
  {
    question: 'What is the Incentive offer in Travel posts?',
    answer: 'The Incentive is a voluntary appreciation offered by users who are seeking companionship or ally support. It is not a fee processed or guaranteed by the platform. Any agreement regarding incentives is made directly between users, and the platform does not handle payments or act as an intermediary.',
  },
  {
    question: 'Are incentives considered payment for a service?',
    answer: 'Incentives are voluntary gestures of appreciation between users. They do not create an employment, transport, or commercial service relationship with the platform. Users are solely responsible for complying with applicable laws, tax regulations, and transport restrictions.',
  },
  {
    question: 'What is the Community section?',
    answer: 'The Community section is where you can ask questions and discuss topics related to living in Germany - like visa, insurance, housing, jobs, healthcare, and more. It\'s a place to get help and share knowledge with other expats.',
  },
  {
    question: 'What should I do if I encounter inappropriate content?',
    answer: 'Please report any inappropriate content or behavior immediately by contacting us at support@lokalinc.de. We review all reports and take appropriate action to maintain a safe community. We reserve the right to suspend accounts that violate our Terms.',
  },
  {
    question: 'Can I change my username or city?',
    answer: 'Yes! Go to Profile > Personal Details to update your username, and city at any time.',
  },
  {
    question: 'Is my personal information safe?',
    answer: 'Yes, we take your privacy seriously. Your address and contact details are never publicly displayed. Only users you choose to message can communicate with you through our secure inbox.',
  },
  {
    question: 'How can I delete my account?',
    answer: 'You can contact us at support@lokalinc.de via your registered email with the subject "Account Deletation Request". We will process your request within 7 working days.',
  },
  {
    question: 'How can I contact to give feedback?',
    answer: 'You can contact us at info@lokalinc.de regarding any feedback you have.',
  },
];

export default function FAQsScreen() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    if (expandedIndex === index) {
      setExpandedIndex(null);
    } else {
      setExpandedIndex(index);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        {faqs.map((faq, index) => {
          const isExpanded = expandedIndex === index;
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.faqCard}
              onPress={() => toggleExpand(index)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.question}>{faq.question}</Text>
                <IconSymbol
                  ios_icon_name={isExpanded ? 'chevron.up' : 'chevron.down'}
                  android_material_icon_name={isExpanded ? 'expand-less' : 'expand-more'}
                  size={24}
                  color={colors.textSecondary}
                />
              </View>
              {isExpanded && (
                <Text style={styles.answer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          );
        })}

        <View style={styles.contactSection}>
          <Text style={styles.contactTitle}>Still have questions?</Text>
          <Text style={styles.contactText}>
            Contact us at <Text style={styles.contactEmail}>info@lokalinc.de</Text> and we&apos;ll be happy to help!
          </Text>
        </View>
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
  faqCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  question: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  answer: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 22,
  },
  contactSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  contactText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  contactEmail: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
