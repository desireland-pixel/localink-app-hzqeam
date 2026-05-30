
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Platform, TextInput, KeyboardAvoidingView, Keyboard, Pressable, Linking, NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedPut, authenticatedDelete } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { capture, SCREEN_NAMES } from '@/utils/analytics';
import { useScreenTracking } from '@/utils/useScreenTracking';
import Modal from '@/components/ui/Modal';
import PostOutcomeModal from '@/components/PostOutcomeModal';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderTextWithLinks } from '@/utils/linkText';

// --- Mention rendering helper ---
const MENTION_URL_REGEX = /(https?:\/\/[^\s]+)/g;
const MENTION_REGEX = /(@[a-zA-Z0-9_]+)/g;

function renderTextWithLinksAndMentions(
  text: string,
  baseStyle: any,
  linkStyle: any,
  mentionStyle: any
): React.ReactNode {
  if (!text) return null;
  const urlParts = text.split(MENTION_URL_REGEX);
  const result: React.ReactNode[] = [];
  urlParts.forEach((segment, urlIdx) => {
    if (!segment) return;
    MENTION_URL_REGEX.lastIndex = 0;
    if (MENTION_URL_REGEX.test(segment)) {
      MENTION_URL_REGEX.lastIndex = 0;
      result.push(
        <Text
          key={`url-${urlIdx}`}
          style={linkStyle}
          onPress={() => Linking.openURL(segment).catch(err => console.error('Failed to open URL:', err))}
        >
          {segment}
        </Text>
      );
    } else {
      MENTION_URL_REGEX.lastIndex = 0;
      const mentionParts = segment.split(MENTION_REGEX);
      mentionParts.forEach((part, mIdx) => {
        if (!part) return;
        MENTION_REGEX.lastIndex = 0;
        if (MENTION_REGEX.test(part)) {
          MENTION_REGEX.lastIndex = 0;
          result.push(
            <Text key={`mention-${urlIdx}-${mIdx}`} style={mentionStyle}>
              {part}
            </Text>
          );
        } else {
          MENTION_REGEX.lastIndex = 0;
          result.push(
            <Text key={`plain-${urlIdx}-${mIdx}`} style={baseStyle}>
              {part}
            </Text>
          );
        }
      });
    }
  });
  return result;
}

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

// --- Mention suggestion types ---
interface MentionSuggestion {
  id: string;
  username: string;
  name: string;
}

export default function CommunityDetailsScreen() {
  useScreenTracking(SCREEN_NAMES.COMMUNITY_DETAIL);
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
  const [showOutcomeModal, setShowOutcomeModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deletingComment, setDeletingComment] = useState(false);
  const [unreadReplyIds, setUnreadReplyIds] = useState<Set<string>>(new Set());
  const [selectedReplyId, setSelectedReplyId] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  // --- Mention state ---
  const [cursorSelection, setCursorSelection] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');

  console.log('CommunityDetailsScreen: Viewing topic', { id, insets });

  // --- Build unique mention candidates from topic author + all reply authors ---
  const allMentionCandidates = useCallback((): MentionSuggestion[] => {
    if (!topic) return [];
    const seen = new Set<string>();
    const candidates: MentionSuggestion[] = [];
    const addUser = (u: { id: string; name: string; username?: string }) => {
      if (seen.has(u.id)) return;
      if (u.id === user?.id) return; // exclude self
      seen.add(u.id);
      candidates.push({ id: u.id, username: u.username || '', name: u.name });
    };
    addUser(topic.user);
    (topic.replies || []).forEach(r => addUser(r.user));
    return candidates;
  }, [topic, user?.id]);

  // --- Handle text change with mention detection ---
  const handleReplyTextChange = useCallback((text: string) => {
    setReplyText(text);
    const cursorPos = cursorSelection.start;
    const textUpToCursor = text.slice(0, cursorPos);
    const atIndex = textUpToCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const between = textUpToCursor.slice(atIndex + 1);
      if (!/\s/.test(between)) {
        const query = between.toLowerCase();
        const candidates = allMentionCandidates();
        const filtered = candidates
          .filter(c => {
            const uname = c.username.toLowerCase();
            const name = c.name.toLowerCase();
            return uname.includes(query) || name.includes(query);
          })
          .slice(0, 8);
        setMentionQuery(between);
        if (filtered.length > 0) {
          setMentionSuggestions(filtered);
          setShowMentionDropdown(true);
        } else {
          setMentionSuggestions([]);
          setShowMentionDropdown(false);
        }
        return;
      }
    }
    setMentionSuggestions([]);
    setShowMentionDropdown(false);
    setMentionQuery('');
  }, [cursorSelection.start, allMentionCandidates]);

  // --- Handle mention suggestion tap ---
  const handleMentionSelect = useCallback((suggestion: MentionSuggestion) => {
    const label = suggestion.username || suggestion.name;
    console.log('CommunityDetailsScreen: Mention selected', label);
    const cursorPos = cursorSelection.start;
    const textUpToCursor = replyText.slice(0, cursorPos);
    const atIndex = textUpToCursor.lastIndexOf('@');
    if (atIndex === -1) return;
    const before = replyText.slice(0, atIndex);
    const after = replyText.slice(cursorPos);
    const insertion = `@${label} `;
    const newText = before + insertion + after;
    const newCursor = atIndex + insertion.length;
    setReplyText(newText);
    setCursorSelection({ start: newCursor, end: newCursor });
    setShowMentionDropdown(false);
    setMentionSuggestions([]);
    setMentionQuery('');
  }, [cursorSelection.start, replyText]);

  const LIKED_KEY = `liked_topic_${id}`;

  useEffect(() => {
    AsyncStorage.getItem(LIKED_KEY).then(val => {
      if (val !== null) {
        setIsLiked(val === 'true');
      }
    });
  }, [LIKED_KEY]);

  const fetchTopic = React.useCallback(async () => {
    try {
      console.log('CommunityDetailsScreen: Fetching topic', id);
      const data = await authenticatedGet<CommunityTopic>(`/api/community/topics/${id}`);
      
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
          console.log('CommunityDetailsScreen: Unread replies', unreadIds.size);
          setUnreadReplyIds(unreadIds);
          
          if (unreadIds.size > 0) {
            setTimeout(() => {
              setUnreadReplyIds(new Set());
            }, 2000);
          }
        }
      }
      
      setTopic(data);
      console.log('CommunityDetailsScreen: Fetched topic', data?.id);
      capture('view_post', { post_type: 'community', post_id: id, category: data.category });

      // Restore liked state: prefer API field, fall back to AsyncStorage
      const apiLiked = (data as any).liked ?? (data as any).is_liked;
      if (typeof apiLiked === 'boolean') {
        setIsLiked(apiLiked);
        await AsyncStorage.setItem(LIKED_KEY, String(apiLiked));
      } else {
        const stored = await AsyncStorage.getItem(LIKED_KEY);
        if (stored !== null) {
          setIsLiked(stored === 'true');
        }
      }
      
      const favoriteCheck = await authenticatedGet<{ isFavorited: boolean }>(`/api/favorites/check/${id}?postType=community`);
      setIsFavorited(favoriteCheck.isFavorited);
      
      if (isOwner) {
        try {
          await authenticatedPost(`/api/community/topics/${id}/mark-replies-read`, {});
          console.log('CommunityDetailsScreen: Replies marked as read');
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
  }, [id, user?.id, LIKED_KEY, fetchCommunityUnreadCount]);

  useEffect(() => {
    fetchTopic();
  }, [fetchTopic]);

  const handleSubmitReply = async () => {
    if (!topic || !replyText.trim() || submitting) return;
    
    const trimmedContent = replyText.trim();
    const mentionMatches = trimmedContent.matchAll(/@([a-zA-Z0-9_]+)/g);
    const mentionUsernames = [...new Set([...mentionMatches].map(m => m[1]))];
    
    console.log('CommunityDetailsScreen: Submitting reply', { mentionCount: mentionUsernames.length });
    setSubmitting(true);

    try {
      await authenticatedPost(`/api/community/topics/${id}/replies`, {
        content: trimmedContent,
        mentions: mentionUsernames,
      });
      
      setReplyText('');
      console.log('CommunityDetailsScreen: Reply posted');
      
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
    capture('share_post', { post_type: 'community', post_id: id });
  
    try {
      const shareData = await authenticatedGet<{
        shareUrl: string;
        title: string;
        description: string;
      }>(`/api/posts/community/${id}/share`);
  
      await Share.share({
        message: `Check out this discussion 💬: ${shareData.title}
        
Shared via Lokalinc - a community platform
${shareData.shareUrl}`,
title: shareData.title,
      });
    } 
    //catch (error) {
    //console.error('CommunityDetailsScreen: Error sharing', error);
      catch (error: any) {
      console.log('SHARE ERROR:', error?.response?.data || error);
  
      const fallbackMessage = `Check out this discussion: ${topic.title}`;
  
      await Share.share({
        message: fallbackMessage,
        title: topic.title,
      });
    }
  };

  const handleDelete = async () => {
    if (!topic) return;
    
    const wasOpen = topic.status === 'open';
    const actionText = wasOpen ? 'close' : 'delete';
    
    console.log(`CommunityDetailsScreen: ${actionText} topic`, id);
    setDeleting(true);
    
    try {
      const response =
        topic.status === 'closed'
          ? await authenticatedDelete<{ success: boolean; action: string; message: string }>(
              `/api/community/topics/${id}`,
              {}
            )
          : await authenticatedPut<{ success: boolean; action: string; message: string }>(
              `/api/community/topics/${id}`,
              { status: 'closed' }
            );
      console.log('CommunityDetailsScreen: Topic action completed', response);
      
      setShowDeleteModal(false);
      
      if (wasOpen) {
        // Closing an open topic — show outcome modal before navigating
        setShowOutcomeModal(true);
      } else {
        // Permanent delete of a closed topic — navigate immediately
        router.replace('/carry');
      }
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
    if (!wasFavorited) {
      capture('favorite_post', { post_type: 'community', post_id: id });
    }
    
    try {
      if (wasFavorited) {
        await authenticatedDelete(`/api/favorites/${id}?postType=community`, {});
        console.log('CommunityDetailsScreen: Comment deleted');
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
      console.log('CommunityDetailsScreen: Reply like toggled');
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

  const handleStartChat = async (targetUserId: string) => {
    console.log('CommunityDetailsScreen: Starting chat with user', targetUserId);
    capture('start_chat', { post_type: 'community', post_id: id, target_user_id: targetUserId });
    try {
      const response = await authenticatedPost<{ id: string; conversationId?: string }>(
        '/api/conversations',
        {
          recipientId: targetUserId,
          postId: id,
          postType: 'community',
        }
      );
      
      console.log('handleStartChat response:', response);
      const conversationId = response.conversationId || response.id;
      console.log('CommunityDetailsScreen: Chat started, conversationId', conversationId);
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      console.error('CommunityDetailsScreen: Error starting chat', err);
      setError('Could not start chat. Please try again.');
    }
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;
    setDeletingComment(true);
    try {
      await authenticatedDelete(`/api/community/replies/${commentToDelete}`, {});
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 75}
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
              <Text style={styles.description} selectable={true}>
                {renderTextWithLinks(topic.description, styles.description, styles.linkText)}
              </Text>
            )}

            <View style={styles.metaRow}>
              <View style={styles.authorDateContainer}>
                {isOwnPost ? (
                  <Text style={styles.authorText}>{authorName}</Text>
                ) : (
                  <TouchableOpacity onPress={() => handleStartChat(topic.user.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={[styles.authorText, styles.authorTextClickable]}>{authorName}</Text>
                  </TouchableOpacity>
                )}
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
                  <Pressable
                    key={reply.id}
                    onLongPress={() => {
                      console.log('[CommunityScreen] Long-press on reply, replyId:', reply.id);
                      setSelectedReplyId(reply.id);
                    }}
                    onPress={() => {
                      if (selectedReplyId === reply.id) setSelectedReplyId(null);
                    }}
                    style={[
                      styles.replyCard,
                      styles.replyCardIndented,
                      isUnread && styles.replyCardUnread,
                      selectedReplyId === reply.id && styles.replyCardSelected,
                    ]}
                  >
                    <View style={styles.replyTopRow}>
                      {isOwnComment ? (
                        <Text style={styles.replyAuthor}>{replyAuthor}</Text>
                      ) : (
                        <TouchableOpacity onPress={() => handleStartChat(reply.user.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <Text style={[styles.replyAuthor, styles.replyAuthorClickable]}>{replyAuthor}</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.replyDateSeparator}> • </Text>
                      <Text style={styles.replyDate}>{replyDate}</Text>
                      {selectedReplyId === reply.id && (
                        <TouchableOpacity
                          onPress={async () => {
                            console.log('[CommunityScreen] Copy reply button pressed, replyId:', reply.id);
                            try {
                              await Clipboard.setStringAsync(reply.content);
                            } catch (err) {
                              console.error('[CommunityScreen] Error copying reply:', err);
                            }
                            setSelectedReplyId(null);
                          }}
                          style={styles.replyTopAction}
                          accessibilityLabel="Copy comment"
                        >
                          <IconSymbol
                            ios_icon_name="doc.on.doc"
                            android_material_icon_name="content-copy"
                            size={14}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      )}
                      {isOwnComment && (
                        <TouchableOpacity
                          style={styles.replyTopAction}
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
                      <Text style={styles.replyContent}>
                        {renderTextWithLinksAndMentions(reply.content, styles.replyContent, styles.linkText, styles.mentionText)}
                      </Text>
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

                  </Pressable>
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
          <>
            {showMentionDropdown && mentionSuggestions.length > 0 && (
              <View style={styles.mentionDropdown}>
                <ScrollView
                  keyboardShouldPersistTaps="always"
                  style={{ maxHeight: 180 }}
                  nestedScrollEnabled
                >
                  {mentionSuggestions.map((suggestion) => {
                    const displayLabel = suggestion.username || suggestion.name;
                    return (
                      <TouchableOpacity
                        key={suggestion.id}
                        style={styles.mentionRow}
                        onPress={() => handleMentionSelect(suggestion)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.mentionRowUsername}>
                          {'@'}
                          {displayLabel}
                        </Text>
                        <Text style={styles.mentionRowName}>{suggestion.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}
            <View style={styles.commentInputBar}>
              <TextInput
                style={styles.commentInput}
                placeholder="Write your comment"
                placeholderTextColor={colors.textLight}
                value={replyText}
                onChangeText={handleReplyTextChange}
                onSelectionChange={(e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
                  setCursorSelection(e.nativeEvent.selection);
                }}
                selection={cursorSelection.start === cursorSelection.end ? cursorSelection : undefined}
                editable={!submitting}
                multiline
                onBlur={() => {
                  setTimeout(() => {
                    setShowMentionDropdown(false);
                  }, 150);
                }}
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
          </>
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

      <PostOutcomeModal
        visible={showOutcomeModal}
        postId={typeof id === 'string' ? id : String(id)}
        postType="community"
        onClose={() => {
          setShowOutcomeModal(false);
          router.replace('/carry');
        }}
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
  authorTextClickable: {
    color: colors.primary,
    textDecorationLine: 'underline',
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
  replyCardSelected: {
    backgroundColor: '#EFF6FF',
  },
  replyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  replyTopAction: {
    padding: 6,
    marginLeft: 4,
  },
  replyAuthor: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  replyAuthorClickable: {
    color: colors.primary,
    textDecorationLine: 'underline',
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
  linkText: {
    ...typography.body,
    color: colors.primary,
    textDecorationLine: 'underline',
    fontSize: 13,
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
  mentionText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  mentionDropdown: {
    marginHorizontal: spacing.md,
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    overflow: 'hidden',
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  mentionRowUsername: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  mentionRowName: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 12,
  },
});
