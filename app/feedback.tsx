
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { apiPost } from '@/utils/api';

type Category = 'general' | 'bug' | 'feature';

const CATEGORY_LABELS: Record<Category, string> = {
  general: 'General Feedback',
  bug: 'Bug Report',
  feature: 'Feature Request',
};

const CATEGORIES: Category[] = ['general', 'bug', 'feature'];

const MAX_LENGTH = 500;
const MIN_LENGTH = 10;

export default function FeedbackScreen() {
  const [category, setCategory] = useState<Category>('general');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');

  const trimmedLength = message.trim().length;
  const isDisabled = trimmedLength < MIN_LENGTH || isSubmitting;
  const counterColor = trimmedLength < MIN_LENGTH ? colors.textSecondary : colors.primary;

  const handleCategoryPress = (cat: Category) => {
    console.log('[FeedbackScreen] Category selected:', cat);
    setCategory(cat);
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async () => {
    if (isDisabled) return;
    console.log('[FeedbackScreen] Submit pressed — category:', category, 'messageLength:', message.trim().length);
    setIsSubmitting(true);
    setError('');
    try {
      const result = await apiPost('/api/feedback', {
        category,
        message: message.trim(),
      });
      console.log('[FeedbackScreen] Feedback submitted successfully:', result);
      setShowSuccess(true);
    } catch (err: any) {
      console.error('[FeedbackScreen] Feedback submission failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendAnother = () => {
    console.log('[FeedbackScreen] Send Another pressed — resetting form');
    setMessage('');
    setCategory('general');
    setError('');
    setShowSuccess(false);
  };

  const kvBehavior = Platform.OS === 'ios' ? 'padding' : 'height';

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <StatusBar style="dark" />
        <View style={styles.successContainer}>
          <IconSymbol
            ios_icon_name="checkmark.circle.fill"
            android_material_icon_name="check-circle"
            size={64}
            color={colors.success}
          />
          <Text style={styles.successHeading}>Thank you for your feedback!</Text>
          <Text style={styles.successBody}>
            We read every message and use it to improve LokaLinc.
          </Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={handleSendAnother}>
            <Text style={styles.secondaryButtonText}>Send Another</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={kvBehavior}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Help us improve LokaLinc</Text>
          <Text style={styles.subtitle}>
            Tell us what you love, what&apos;s broken, or what&apos;s missing.
          </Text>

          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.pillsScroll}
            contentContainerStyle={styles.pillsContainer}
          >
            {CATEGORIES.map((cat) => {
              const isSelected = category === cat;
              const pillBg = isSelected ? colors.primary : colors.card;
              const pillTextColor = isSelected ? '#FFFFFF' : colors.text;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pill, { backgroundColor: pillBg }]}
                  onPress={() => handleCategoryPress(cat)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.pillText, { color: pillTextColor }]}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={styles.label}>Your message</Text>
          <TextInput
            style={styles.textInput}
            value={message}
            onChangeText={handleMessageChange}
            placeholder="Tell us what's on your mind…"
            placeholderTextColor={colors.textSecondary}
            multiline
            textAlignVertical="top"
            maxLength={MAX_LENGTH}
          />
          <View style={styles.counterRow}>
            {message.length > 0 && trimmedLength < MIN_LENGTH ? (
              <Text style={styles.minHint}>Minimum {MIN_LENGTH} characters required</Text>
            ) : (
              <View />
            )}
            <View style={styles.counterGroup}>
              <Text style={[styles.counter, { color: counterColor }]}>
                {message.length}
              </Text>
              <Text style={[styles.counter, { color: colors.textSecondary }]}>
                {' / '}
              </Text>
              <Text style={[styles.counter, { color: colors.textSecondary }]}>
                {MAX_LENGTH}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isDisabled}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Send Feedback</Text>
            )}
          </TouchableOpacity>

          {!!error && (
            <Text style={styles.errorText}>{error}</Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  pillsScroll: {
    marginBottom: spacing.xl,
  },
  pillsContainer: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: {
    ...typography.bodySmall,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 140,
    color: colors.text,
    ...typography.body,
    textAlignVertical: 'top',
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  counterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  minHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  counter: {
    ...typography.caption,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.45,
  },
  submitButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  successHeading: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  successBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  secondaryButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
