
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal as RNModal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';

interface PostOutcomeModalProps {
  visible: boolean;
  postId: string;
  postType: 'sublet' | 'travel' | 'community';
  postSubtype?: 'offering' | 'seeking';
  onClose: () => void;
}

const COMMENT_MAX_LENGTH = 300;

export default function PostOutcomeModal({
  visible,
  postId,
  postType,
  postSubtype,
  onClose,
}: PostOutcomeModalProps) {
  const [selected, setSelected] = useState<'yes' | 'no' | null>(null);
  const [comment, setComment] = useState('');
  const [thanksVisible, setThanksVisible] = useState(false);

  // Reset state whenever modal closes
  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setComment('');
      setThanksVisible(false);
    }
  }, [visible]);

  const getQuestion = (): string => {
    if (postType === 'sublet') {
      return postSubtype === 'offering' ? 'Did you find a tenant?' : 'Did you find a place?';
    }
    if (postType === 'travel') {
      return 'Did you find what you were looking for?';
    }
    return 'Did you get the help you needed?';
  };

  const handleSelect = (value: 'yes' | 'no') => {
    console.log('PostOutcomeModal: User selected outcome', { postId, postType, outcome: value });
    setSelected(value);
    setThanksVisible(true);
  };

  const submitOutcome = async () => {
    try {
      await authenticatedPost('/api/posts/outcome', {
        postId,
        postType,
        outcome: selected,
        comment: comment.trim() || undefined,
      });
      console.log('PostOutcomeModal: Outcome submitted', { postId, postType, outcome: selected });
    } catch (error) {
      // Fire-and-forget — never show error to user. Just log.
      console.error('PostOutcomeModal: Outcome submission failed (ignored)', error);
    }
  };

  const handleClose = () => {
    console.log('PostOutcomeModal: Close button tapped', { postId, postType, outcome: selected });
    submitOutcome(); // fire-and-forget — no await
    onClose();
  };

  const handleDismiss = () => {
    console.log('PostOutcomeModal: Dismissed without submitting', { postId, postType });
    onClose();
  };

  const questionText = getQuestion();
  const commentLength = comment.length;
  const isCloseEnabled = selected !== null;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleDismiss}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={styles.card}>
              {/* Top-right X button — dismisses without submitting */}
              <TouchableOpacity style={styles.closeX} onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>

              {/* Question */}
              <Text style={styles.question}>{questionText}</Text>

              {/* Yes / No buttons */}
              <View style={styles.yesNoRow}>
                <TouchableOpacity
                  style={[styles.yesNoButton, selected === 'yes' && styles.yesNoButtonSelected]}
                  onPress={() => handleSelect('yes')}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    ios_icon_name="checkmark"
                    android_material_icon_name="check"
                    size={16}
                    color={selected === 'yes' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.yesNoText, selected === 'yes' && styles.yesNoTextSelected]}>
                    Yes
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.yesNoButton, selected === 'no' && styles.yesNoButtonSelected]}
                  onPress={() => handleSelect('no')}
                  activeOpacity={0.8}
                >
                  <IconSymbol
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={16}
                    color={selected === 'no' ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[styles.yesNoText, selected === 'no' && styles.yesNoTextSelected]}>
                    No
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Thank-you line */}
              {thanksVisible && (
                <Text style={styles.thanks}>Thanks for letting us know! 🙌</Text>
              )}

              {/* Optional comment */}
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment (optional)"
                placeholderTextColor={colors.textLight}
                value={comment}
                onChangeText={setComment}
                maxLength={COMMENT_MAX_LENGTH}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.charCounter}>{commentLength}/{COMMENT_MAX_LENGTH}</Text>

              {/* Close / submit button */}
              <TouchableOpacity
                style={[styles.closeButton, !isCloseEnabled && styles.closeButtonDisabled]}
                onPress={handleClose}
                disabled={!isCloseEnabled}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md + 4,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    position: 'relative',
  },
  closeX: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 1,
    padding: spacing.xs,
  },
  question: {
    ...typography.h3,
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  yesNoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  yesNoButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.highlight,
  },
  yesNoText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  yesNoTextSelected: {
    color: colors.primary,
  },
  thanks: {
    ...typography.bodySmall,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  commentInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    color: colors.text,
    minHeight: 72,
    textAlignVertical: 'top',
    marginBottom: spacing.xs,
  },
  charCounter: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
    textAlign: 'right',
    marginBottom: spacing.md,
  },
  closeButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  closeButtonDisabled: {
    opacity: 0.4,
  },
  closeButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
