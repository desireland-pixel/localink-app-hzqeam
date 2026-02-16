
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';

interface CommunityTopic {
  id: string;
  shortId?: string;
  userId: string;
  category: string;
  title: string;
  description?: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
  };
  replies?: Array<{
    id: string;
    userId: string;
    content: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
      username?: string;
    };
  }>;
}

export default function CommunityDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('CommunityDetailsScreen: Viewing topic', { id });

  useEffect(() => {
    fetchTopic();
  }, [id]);

  const fetchTopic = async () => {
    try {
      console.log('[CommunityDetails] Fetching topic:', id);
      const data = await authenticatedGet<CommunityTopic>(`/api/community/topics/${id}`);
      console.log('[CommunityDetails] Topic fetched:', data);
      setTopic(data);
    } catch (err) {
      console.error('[CommunityDetails] Error fetching topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to load topic');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!topic || !replyText.trim() || submitting) return;
    
    console.log('CommunityDetailsScreen: Submitting reply');
    setSubmitting(true);

    try {
      console.log('[CommunityDetails] Posting reply to topic:', id);
      await authenticatedPost(`/api/community/topics/${id}/replies`, {
        content: replyText.trim(),
      });
      console.log('[CommunityDetails] Reply posted successfully');
      
      // Clear input and refresh
      setReplyText('');
      await fetchTopic();
    } catch (err) {
      console.error('[CommunityDetails] Error posting reply:', err);
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!topic) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Discussion not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwnPost = topic.userId === user?.id;
  const createdDate = formatDateToDDMMYYYY(topic.createdAt);
  const authorName = topic.user.username || topic.user.name;
  const postedByText = `${authorName} • ${createdDate}`;

  const handleEdit = () => {
    if (!topic) return;
    console.log('CommunityDetailsScreen: Edit topic', id);
    router.push({
      pathname: '/post-community-topic',
      params: {
        editId: id,
        editData: JSON.stringify(topic),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{topic.title}</Text>
            {isOwnPost && (
              <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                <IconSymbol
                  ios_icon_name="pencil"
                  android_material_icon_name="edit"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.shareButton} onPress={() => {
              // TODO: Implement share functionality
              console.log('Share discussion');
            }}>
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          {topic.description && (
            <Text style={styles.description}>{topic.description}</Text>
          )}

          <View style={styles.metaContainer}>
            <Text style={styles.postedByText}>{postedByText}</Text>
            <View style={[styles.tagBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.tagBadgeText}>{topic.category}</Text>
            </View>
          </View>
        </View>

        {/* Replies Section */}
        <View style={styles.repliesSection}>
          <Text style={styles.repliesTitle}>Replies ({topic.replies?.length || 0})</Text>
          
          {topic.replies && topic.replies.length > 0 ? (
            topic.replies.map((reply) => {
              const replyDate = formatDateToDDMMYYYY(reply.createdAt);
              const replyAuthor = reply.user.username || reply.user.name;
              
              return (
                <View key={reply.id} style={styles.replyCard}>
                  <Text style={styles.replyContent}>{reply.content}</Text>
                  <View style={styles.replyFooter}>
                    <Text style={styles.replyAuthor}>{replyAuthor}</Text>
                    <Text style={styles.replyDate}> {replyDate}</Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={styles.noRepliesText}>No replies yet. Be the first to comment!</Text>
          )}
        </View>

        {/* Reply Input - Only show if discussion is open */}
        {topic.status === 'open' && (
          <View style={styles.replyInputSection}>
            <Text style={styles.replyInputLabel}>Add a comment</Text>
            <TextInput
              style={styles.replyInput}
              placeholder="Write your comment..."
              placeholderTextColor={colors.textLight}
              value={replyText}
              onChangeText={setReplyText}
              multiline
              numberOfLines={4}
              editable={!submitting}
            />
            <TouchableOpacity 
              style={[styles.submitButton, (!replyText.trim() || submitting) && styles.submitButtonDisabled]} 
              onPress={handleSubmitReply}
              disabled={!replyText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Post Comment</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {topic.status === 'closed' && (
          <View style={styles.closedNotice}>
            <Text style={styles.closedNoticeText}>This discussion is closed. No new comments can be added.</Text>
          </View>
        )}
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!error}
        onClose={() => setError(null)}
        title="Error"
        message={error || ''}
        type="error"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
    fontSize: 18,
  },
  editButton: {
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.xs,
  },
  shareButton: {
    padding: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  postedByText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 12,
    flex: 1,
  },
  tagBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  tagBadgeText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  repliesSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  repliesTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontSize: 16,
  },
  replyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyContent: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  replyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
  },
  replyAuthor: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 10,
  },
  replyDate: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 10,
  },
  noRepliesText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  replyInputSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  replyInputLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  replyInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  closedNotice: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  closedNoticeText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
