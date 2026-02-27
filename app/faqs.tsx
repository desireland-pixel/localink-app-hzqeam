
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
    question: 'How do I post a sublet?',
    answer: 'Navigate to the Sublet tab and tap the + icon in the top right. Select whether you are offering or seeking a sublet, fill in the required details, and tap Post.',
  },
  {
    question: 'How do I contact someone about a post?',
    answer: 'Open any post and tap the "Contact" or message button. This will start a conversation in your Inbox where you can chat directly with the poster.',
  },
  {
    question: 'Can I edit my post after publishing?',
    answer: 'Yes! Go to Profile > My Posts, find your post, and tap the Edit button. You can update any details and save your changes.',
  },
  {
    question: 'How do I close or delete my post?',
    answer: 'Go to Profile > My Posts, find your post, and tap the Close button. This will mark your post as closed and it will no longer appear in search results.',
  },
  {
    question: 'What is the difference between offering and seeking?',
    answer: 'Offering means you have something to provide (e.g., a sublet to rent out, travel companionship to offer). Seeking means you are looking for something (e.g., looking for a sublet, seeking a travel companion).',
  },
  {
    question: 'How do I save posts I like?',
    answer: 'Tap the heart icon on any post to add it to your favorites. You can view all your saved posts in Profile > Favourites.',
  },
  {
    question: 'Is my personal information safe?',
    answer: 'Yes, we take your privacy seriously. Your address and contact details are never publicly displayed. Only users you choose to message can communicate with you through our secure inbox.',
  },
  {
    question: 'What should I do if I encounter inappropriate content?',
    answer: 'Please report any inappropriate content or behavior immediately. We review all reports and take appropriate action to maintain a safe community.',
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
            Contact us at <Text style={styles.contactEmail}>info.lokalinc@gmail.com</Text> and we&apos;ll be happy to help!
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
