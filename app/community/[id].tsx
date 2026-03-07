
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform, TextInput, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  'Finance': { background: '#FED7AA', text: '#9A3412' },
  'Education': { background: '#E9D5FF', text: '#6B21A8' },
  'General': { background: '#FDE68A', text: '#78350F' },
};

interface Reply {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  likes: number;
  isLikedByMe: boolean;
  isRead?: boolean;
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
  location?: string;
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
  const { user, fetchCommunityUnreadCount } = useAuth();
  const [topic, setTopic] = useState<CommunityTopic | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [unreadReplyIds, setUnreadReplyIds] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();

  console.log('CommunityDetailsScreen: Viewing topic', { id, insets });

  const fetchTopic = React.useCallback(async () => {
    try {
      console.log('[CommunityDetails] Fetching topic:', id);
      const data = await authenticatedGet<CommunityTopic>(`/api/community/topics/${id}`);
      console.log('[CommunityDetails] Topic fetched:', data);
      
      const isOwner = data.userId === user?.id;
      
      if (data.replies && Array.isArray(data.replies)) {
        const sortedReplies = [...data.replies].sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA;
        });
        data.replies = sortedReplies;
        
        if (isOwner) {
          const unreadIds = new Set(
            sortedReplies
              .filter(r => r.isRead === false)
              .map(r => r.id)
          );
          console.log('[CommunityDetails] Found unread replies:', unreadIds.size, Array.from(unreadIds));
          setUnreadReplyIds(unreadIds);
          
          if (unreadIds.size > 0) {
            setTimeout(() => {
              console.log('[CommunityDetails] Removing unread borders after 2 seconds');
              setUnreadReplyIds(new Set());
            }, 2000);
          }
        }
      }
      
      setTopic(data);
      
      const favoriteCheck = await authenticatedGet<{ isFavorited: boolean }>(`/api/favorites/check/${id}?postType=community`);
      setIsFavorited(favoriteCheck.isFavorited);
      
      if (isOwner) {
        try {
          await authenticatedPost(`/api/community/topics/${id}/mark-replies-read`, {});
          console.log('[CommunityDetails] Marked replies as read');
          await fetchCommunityUnreadCount();
        } catch (err) {
          console.error('[CommunityDetails] Error marking replies as read:', err);
        }
      }
    } catch (err) {
      console.error('[CommunityDetails] Error fetching topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to load topic');
    } finally {
      setLoading(false);
    }
  }, [id, user?.id]);

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
      Keyboard.dismiss();
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

  const handleShare = async () => {
    if (!topic) return;
  
    console.log('CommunityDetailsScreen: Share topic', id);
  
    try {
      const shareData = await authenticatedGet<{
        shareUrl: string;
        title: string;
        description: string;
      }>(`/api/posts/community/${id}/share`);
  
      await Share.share({
        message: `${shareData.title}\n\n${shareData.description}\n\n${shareData.shareUrl}`,
        title: shareData.title,
        url: shareData.shareUrl,
      });
    } catch (error) {
      console.error('CommunityDetailsScreen: Error sharing', error);
  
      const fallbackMessage = `Check out this discussion: ${topic.title}`;
  
      await Share.share({
        message: fallbackMessage,
        title: topic.title,
      });
    }
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
      
      router.replace('/(tabs)/(home)');
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

  const toggleReplyLike = async (replyId: string) => {
    if (!topic || !topic.replies) return;
    
    console.log('CommunityDetailsScreen: Toggle reply like', replyId);
    
    const targetReply = topic.replies.find(r => r.id === replyId);
    
    if (!targetReply) return;
    
    const wasLiked = targetReply.isLikedByMe || false;
    const currentLikes = typeof targetReply.likes === 'number' ? targetReply.likes : 0;
    
    const newLikeCount = wasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    
    const updatedReplies = topic.replies.map(reply => {
      if (reply.id === replyId) {
        return {
          ...reply,
          isLikedByMe: !wasLiked,
          likes: newLikeCount,
        };
      }
      return reply;
    });
    
    setTopic({ ...topic, replies: updatedReplies });
    
    try {
      const result = await authenticatedPost<{ liked: boolean; likeCount: number }>(`/api/community/replies/${replyId}/like`, {});
      console.log('CommunityDetailsScreen: Like toggled, server response:', result);
      setTopic(prev => {
        if (!prev || !prev.replies) return prev;
        return {
          ...prev,
          replies: prev.replies.map(reply => {
            if (reply.id === replyId) {
              return {
                ...reply,
                isLikedByMe: result.liked,
                likes: result.likeCount,
              };
            }
            return reply;
          }),
        };
      });
    } catch (error) {
      console.error('CommunityDetailsScreen: Error toggling reply like', error);
      setTopic(prev => {
        if (!prev || !prev.replies) return prev;
        return {
          ...prev,
          replies: prev.replies.map(reply => {
            if (reply.id === replyId) {
              return {
                ...reply,
                isLikedByMe: wasLiked,
                likes: currentLikes,
              };
            }
            return reply;
          }),
        };
      });
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    console.log('[CommunityDetails] Deleting comment:', commentToDelete);
    setDeletingComment(true);
    try {
      await authenticatedDelete(`/api/community/replies/${commentToDelete}`, {});
      console.log('[CommunityDetails] Comment deleted successfully');
      setShowDeleteCommentModal(false);
      setCommentToDelete(null);
      setTopic(prev => {
        if (!prev || !prev.replies) return prev;
        return {
          ...prev,
          replies: prev.replies.filter(r => r.id !== commentToDelete),
        };
      });
    } catch (err) {
      console.error('[CommunityDetails] Error deleting comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
      setShowDeleteCommentModal(false);
      setCommentToDelete(null);
    } finally {
      setDeletingComment(false);
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
  const locationDisplay = topic.location || 'Germany';
  const isClosed = topic.status === 'closed';
  const deleteButtonText = isClosed ? 'Delete' : 'Close';
  const deleteModalTitle = isClosed ? 'Delete Discussion' : 'Close Discussion';
  const deleteModalMessage = isClosed 
    ? 'Are you sure you want to permanently delete this discussion? This action cannot be undone and will delete all replies.'
    : 'Are you sure you want to close this discussion? You can delete it permanently after closing.';
  
  const replyCountValue = topic.replies?.length || 0;
  const hasComments = replyCountValue > 0;
  
  const categoryColor = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS['General'];
  const categoryBackgroundColor = isClosed ? '#E5E7EB' : categoryColor.background;
  const categoryTextColor = isClosed ? '#6B7280' : categoryColor.text;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 65}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={{ paddingBottom: spacing.md }}
        >
          <View style={styles.mainPostCard}>
            <View style={styles.headerRow}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryBackgroundColor }]}>
                <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>{topic.category}</Text>
              </View>
              <View style={styles.actionButtons}>
                {isOwnPost ? (
                  <>
                    <View style={styles.iconButtonBox}>
                      <TouchableOpacity style={styles.iconButton} onPress={handleEdit}>
                        <IconSymbol
                          ios_icon_name="pencil"
                          android_material_icon_name="edit"
                          size={20}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.iconButtonBox}>
                      <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <IconSymbol
                          ios_icon_name="square.and.arrow.up"
                          android_material_icon_name="share"
                          size={20}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={styles.iconButtonBox}>
                      <TouchableOpacity style={styles.iconButton} onPress={toggleFavorite}>
                        <IconSymbol
                          ios_icon_name={isFavorited ? "heart.fill" : "heart"}
                          android_material_icon_name={isFavorited ? "favorite" : "favorite-border"}
                          size={20}
                          color={isFavorited ? colors.primary : colors.text}
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.iconButtonBox}>
                      <TouchableOpacity style={styles.iconButton} onPress={handleShare}>
                        <IconSymbol
                          ios_icon_name="square.and.arrow.up"
                          android_material_icon_name="share"
                          size={20}
                          color={colors.text}
                        />
                      </TouchableOpacity>
                    </View>
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
                <Text style={styles.dateSeparator}> • </Text>
                <Text style={styles.dateText}>{createdDate}</Text>
                <Text style={styles.dateSeparator}> • </Text>
                <Text style={styles.locationText}>{locationDisplay}</Text>
              </View>
              {isOwnPost && (
                <View style={styles.iconButtonBox}>
                  <TouchableOpacity style={styles.iconButton} onPress={() => setShowDeleteModal(true)}>
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={20}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={styles.repliesSection}>
            <Text style={styles.repliesTitle}>Comments ({replyCountValue})</Text>
            
            {hasComments ? (
              topic.replies!.map((reply) => {
                const replyDate = formatDateToDDMMYYYY(reply.createdAt);
                const replyAuthor = reply.user.username || reply.user.name;
                const likeCount = reply.likes || 0;
                const isLiked = reply.isLikedByMe || false;
                const isUnread = unreadReplyIds.has(reply.id);
                const isOwnComment = reply.userId === user?.id;
                
                return (
                  <View 
                    key={reply.id} 
                    style={[
                      styles.replyCard,
                      styles.replyCardIndented,
                      isUnread && styles.replyCardUnread
                    ]}
                  >
                    <View style={styles.replyTopRow}>
                      <Text style={styles.replyAuthor}>{replyAuthor}</Text>
                      <Text style={styles.replyDateSeparator}> • </Text>
                      <Text style={styles.replyDate}>{replyDate}</Text>
                      {isOwnComment && (
                        <TouchableOpacity
                          style={styles.deleteCommentButton}
                          onPress={() => {
                            setCommentToDelete(reply.id);
                            setShowDeleteCommentModal(true);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <IconSymbol
                            ios_icon_name="trash"
                            android_material_icon_name="delete"
                            size={14}
                            color="#FF3B30"
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.replyContentWrapper}>
                      <Text style={styles.replyContent}>{reply.content}</Text>
                      <TouchableOpacity 
                        style={styles.likeButtonInline}
                        onPress={() => toggleReplyLike(reply.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <View style={styles.likeCountContainer}>
                          {Platform.select({
                            ios: (
                              <IconSymbol
                                ios_icon_name={isLiked ? "hand.thumbsup.fill" : "hand.thumbsup"}
                                android_material_icon_name="thumb-up"
                                size={16}
                                color={isLiked ? '#3B82F6' : colors.textLight}
                              />
                            ),
                            android: (
                              <IconSymbol
                                ios_icon_name="hand.thumbsup"
                                android_material_icon_name={likeCount > 0 ? "thumb-up" : "thumb-up-off-alt"}
                                size={16}
                                color={isLiked ? '#3B82F6' : colors.textLight}
                              />
                            ),
                            default: (
                              <IconSymbol
                                ios_icon_name={isLiked ? "hand.thumbsup.fill" : "hand.thumbsup"}
                                android_material_icon_name={likeCount > 0 ? "thumb-up" : "thumb-up-off-alt"}
                                size={16}
                                color={isLiked ? '#3B82F6' : colors.textLight}
                              />
                            ),
                          })}
                          {likeCount > 0 && (
                            <Text style={styles.likeCountText}>{likeCount}</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.noRepliesContainer}>
                <Text style={styles.noRepliesText}>👋🏻 Be the first to share your comment!</Text>
              </View>
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

      <Modal
        visible={showDeleteCommentModal}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        onClose={() => {
          setShowDeleteCommentModal(false);
          setCommentToDelete(null);
        }}
        type="warning"
        actions={[
          {
            text: 'Cancel',
            onPress: () => {
              setShowDeleteCommentModal(false);
              setCommentToDelete(null);
            },
            style: 'cancel',
          },
          {
            text: deletingComment ? 'Deleting...' : 'Delete',
            onPress: handleDeleteComment,
            style: 'destructive',
            disabled: deletingComment,
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
    paddingHorizontal: spacing.md,
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
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
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
  iconButtonBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
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
    flex: 1,
    flexWrap: 'wrap',
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
  locationText: {
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
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  replyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  replyCardIndented: {
    marginLeft: spacing.md,
    marginRight: spacing.md,
  },
  replyCardUnread: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  replyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  deleteCommentButton: {
    marginLeft: 'auto',
    paddingLeft: spacing.sm,
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
  replyContentWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  replyContent: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
    fontSize: 13,
    flex: 1,
    marginRight: spacing.sm,
  },
  likeButtonInline: {
    alignSelf: 'flex-end',
    marginBottom: 2,
  },
  likeCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likeCountText: {
    ...typography.bodySmall,
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  noRepliesContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  noRepliesText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  commentInputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    maxHeight: 100,
    minHeight: 44,
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
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  closedNoticeText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
});
