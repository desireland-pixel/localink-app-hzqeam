
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';

const CATEGORY_COLORS: { [key: string]: { background: string; text: string } } = {
  'Visa': { background: '#DBEAFE', text: '#1E40AF' },
  'Insurance': { background: '#FEF3C7', text: '#92400E' },
  'Housing': { background: '#D1FAE5', text: '#065F46' },
  'Jobs': { background: '#FCE7F3', text: '#9F1239' },
  'Healthcare': { background: '#E0E7FF', text: '#3730A3' },
  'Banking': { background: '#FED7AA', text: '#9A3412' },
  'Education': { background: '#E9D5FF', text: '#6B21A8' },
  'General': { background: '#E5E7EB', text: '#374151' },
};

interface Reply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username?: string;
  };
}

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
  replies?: Reply[];
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  console.log('CommunityDetailsScreen: Viewing topic', { id });

  const fetchTopic = React.useCallback(async () => {
    try {
      console.log('[CommunityDetails] Fetching topic:', id);
      const data = await authenticatedGet<CommunityTopic>(`/api/community/topics/${id}`);
      console.log('[CommunityDetails] Topic fetched:', data);
      setTopic(data);
      
      const favoriteCheck = await authenticatedGet<{ isFavorited: boolean }>(`/api/favorites/check/${id}?postType=community`);
      setIsFavorited(favoriteCheck.isFavorited);
    } catch (err) {
      console.error('[CommunityDetails] Error fetching topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to load topic');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

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
      
      setReplyText('');
      await fetchTopic();
    } catch (err) {
      console.error('[CommunityDetails] Error posting reply:', err);
      setError(err instanceof Error ? err.message : 'Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

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

  const handleDelete = async () => {
    if (!topic) return;
    
    const isClosed = topic.status === 'closed';
    const actionText = isClosed ? 'delete' : 'close';
    
    console.log(`CommunityDetailsScreen: ${actionText} topic`, id);
    setDeleting(true);
    
    try {
      const response = await authenticatedDelete<{ success: boolean; action: string; message: string }>(
        `/api/community/topics/${id}`,
        {}
      );
      console.log('CommunityDetailsScreen: Topic action completed', response);
      
      setShowDeleteModal(false);
      
      router.replace('/(tabs)/carry');
    } catch (error: any) {
      console.error('CommunityDetailsScreen: Error with topic action', error);
      setError(error.message || `Failed to ${actionText} topic`);
    } finally {
      setDeleting(false);
    }
  };

  const toggleFavorite = async () => {
    if (!topic) return;
    console.log('CommunityDetailsScreen: Toggle favorite', id);
    
    const wasFavorited = isFavorited;
    setIsFavorited(!wasFavorited);
    
    try {
      if (wasFavorited) {
        await authenticatedDelete(`/api/favorites/${id}?postType=community`, {});
      } else {
        await authenticatedPost('/api/favorites', { postId: id, postType: 'community' });
      }
    } catch (error: any) {
      console.error('CommunityDetailsScreen: Error toggling favorite', error);
      setIsFavorited(wasFavorited);
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
  const isClosed = topic.status === 'closed';
  const deleteButtonText = isClosed ? 'Delete' : 'Close';
  const deleteModalTitle = isClosed ? 'Delete Discussion' : 'Close Discussion';
  const deleteModalMessage = isClosed 
    ? 'Are you sure you want to permanently delete this discussion? This action cannot be undone and will delete all replies.'
    : 'Are you sure you want to close this discussion? You can delete it permanently after closing.';
  
  const replyCountValue = topic.replies?.length || 0;
  
  const categoryColor = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS['General'];
  const categoryBackgroundColor = isClosed ? '#E5E7EB' : categoryColor.background;
  const categoryTextColor = isClosed ? '#6B7280' : categoryColor.text;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView style={styles.content}>
          <View style={styles.mainPostCard}>
            <View style={styles.headerRow}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryBackgroundColor }]}>
                <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>{topic.category}</Text>
              </View>
              <View style={styles.actionButtons}>
                {isOwnPost ? (
                  <>
                    {!isClosed && (
                      <TouchableOpacity style={styles.iconButton} onPress={handleEdit}>
                        <IconSymbol
                          ios_icon_name="pencil"
                          android_material_icon_name="edit"
                          size={20}
                          color={colors.primary}
                        />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
                      <IconSymbol
                        ios_icon_name="square.and.arrow.up"
                        android_material_icon_name="share"
                        size={20}
                        color={colors.text}
                      />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity style={styles.iconButton} onPress={toggleFavorite}>
                      <IconSymbol
                        ios_icon_name={isFavorited ? "heart.fill" : "heart"}
                        android_material_icon_name={isFavorited ? "favorite" : "favorite-border"}
                        size={20}
                        color={isFavorited ? colors.primary : colors.text}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconButton} onPress={() => {}}>
                      <IconSymbol
                        ios_icon_name="square.and.arrow.up"
                        android_material_icon_name="share"
                        size={20}
                        color={colors.text}
                      />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            <Text style={styles.title}>{topic.title}</Text>

            {topic.description && (
              <Text style={styles.description}>{topic.description}</Text>
            )}

            <View style={styles.metaRow}>
              <View style={styles.authorDateContainer}>
                <Text style={styles.authorText}>{authorName}</Text>
                <Text style={styles.dateSeparator}> o </Text>
                <Text style={styles.dateText}>{createdDate}</Text>
              </View>
              {isOwnPost && (
                <TouchableOpacity onPress={() => setShowDeleteModal(true)}>
                  <IconSymbol
                    ios_icon_name="trash"
                    android_material_icon_name="delete"
                    size={18}
                    color="#FF3B30"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>Replies ({replyCountValue})</Text>
            
            {topic.replies && topic.replies.length > 0 ? (
              topic.replies.map((reply) => {
                const replyDate = formatDateToDDMMYYYY(reply.createdAt);
                const replyAuthor = reply.user.username || reply.user.name;
                
                return (
                  <View key={reply.id} style={styles.replyCard}>
                    <View style={styles.replyHeader}>
                      <View style={styles.replyAuthorDateContainer}>
                        <Text style={styles.replyAuthor}>{replyAuthor}</Text>
                        <Text style={styles.replyDateSeparator}> o </Text>
                        <Text style={styles.replyDate}>{replyDate}</Text>
                      </View>
                      <TouchableOpacity style={styles.likeButton}>
                        <IconSymbol
                          ios_icon_name="hand.thumbsup"
                          android_material_icon_name="thumb-up"
                          size={16}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.replyContent}>{reply.content}</Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noRepliesText}>No replies yet. Be the first to comment!</Text>
            )}
          </View>
        </ScrollView>

        {topic.status === 'open' && (
          <View style={styles.commentInputBar}>
            <TextInput
              style={styles.commentInput}
              placeholder="Write your comment"
              placeholderTextColor={colors.textLight}
              value={replyText}
              onChangeText={setReplyText}
              editable={!submitting}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendButton, (!replyText.trim() || submitting) && styles.sendButtonDisabled]} 
              onPress={handleSubmitReply}
              disabled={!replyText.trim() || submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <IconSymbol
                  ios_icon_name="paperplane.fill"
                  android_material_icon_name="send"
                  size={20}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>
          </View>
        )}
        
        {topic.status === 'closed' && (
          <View style={styles.closedNotice}>
            <Text style={styles.closedNoticeText}>This discussion is closed. No new comments can be added.</Text>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={!!error}
        onClose={() => setError(null)}
        title="Error"
        message={error || ''}
        type="error"
      />

      <Modal
        visible={showDeleteModal}
        title={deleteModalTitle}
        message={deleteModalMessage}
        onClose={() => setShowDeleteModal(false)}
        type="warning"
        actions={[
          {
            text: 'Cancel',
            onPress: () => setShowDeleteModal(false),
            style: 'cancel',
          },
          {
            text: deleting ? `${deleteButtonText}ing...` : deleteButtonText,
            onPress: handleDelete,
            style: 'destructive',
            disabled: deleting,
          },
        ]}
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
  mainPostCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  iconButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.md,
    fontSize: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  authorDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 12,
  },
  dateSeparator: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 12,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 12,
  },
  repliesSection: {
    marginBottom: spacing.xl,
  },
  repliesTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
  },
  replyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  replyAuthorDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyAuthor: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  replyDateSeparator: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  replyDate: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  likeButton: {
    padding: spacing.xs,
  },
  replyContent: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
    fontSize: 13,
  },
  noRepliesText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  closedNotice: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
  },
  closedNoticeText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
});
