
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedDelete, BACKEND_URL, getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { IconSymbol } from '@/components/IconSymbol';
import { StatusBar } from 'expo-status-bar';

interface Conversation {
  id: string;
  postId: string;
  postType: string;
  participant1Id: string;
  participant2Id: string;
  createdAt: string;
  unreadCount: number;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
  otherParticipant?: {
    id: string;
    name: string;
    username?: string;
  };
  post?: {
    id: string;
    title: string;
    type: 'sublet' | 'travel';
  };
}

export default function InboxScreen() {
  const router = useRouter();
  const { user, fetchUnreadCount } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [deletingConversation, setDeletingConversation] = useState(false);

  const fetchConversations = React.useCallback(async () => {
    console.log('[InboxScreen] Fetching conversations');
    
    // Only show full loading spinner on initial load
    if (!initialLoadComplete) {
      setLoading(true);
    }
    
    setError(null);
    try {
      const data = await authenticatedGet<Conversation[]>('/api/conversations');
      
      if (!Array.isArray(data)) {
        console.error('[InboxScreen] Invalid conversations data format', data);
        setConversations([]);
        setError('Invalid data format received from server');
        return;
      }
      
      console.log('[InboxScreen] Fetched conversations', data.length);
      
      const sortedData = data.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      setConversations(sortedData);
      await fetchUnreadCount();
      
      if (!initialLoadComplete) {
        setInitialLoadComplete(true);
      }
    } catch (error: any) {
      console.error('[InboxScreen] Error fetching conversations', error);
      setConversations([]);
      setError(error.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchUnreadCount, initialLoadComplete]);

  const setupWebSocket = React.useCallback(async () => {
    try {
      const token = await getBearerToken();
      if (!token) {
        console.warn('[InboxScreen] No auth token, skipping WebSocket setup');
        return;
      }

      if (!BACKEND_URL) {
        console.warn('[InboxScreen] No backend URL, skipping WebSocket setup');
        return;
      }

      const wsUrl = BACKEND_URL.startsWith('https')
        ? BACKEND_URL.replace(/^https:/, 'wss:')
        : BACKEND_URL.replace(/^http:/, 'ws:');

      // Pass token as query param since WebSocket headers aren't supported in all environments
      const ws = new WebSocket(`${wsUrl}/ws/messages?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        console.log('[InboxScreen] WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'new_message') {
            fetchConversations();
          }
        } catch (error) {
          console.error('[InboxScreen] Error parsing WebSocket message', error);
        }
      };

      ws.onerror = (error) => {
        // Silently log - inbox will refresh on focus as fallback
        console.log('[InboxScreen] WebSocket unavailable, using focus-refresh fallback');
      };

      ws.onclose = () => {
        console.log('[InboxScreen] WebSocket disconnected');
      };

      wsRef.current = ws;
    } catch (error) {
      // Silently handle
      console.log('[InboxScreen] WebSocket setup skipped');
    }
  }, [fetchConversations]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('[InboxScreen] Screen focused, refreshing conversations');
      fetchConversations();
    }, [fetchConversations])
  );

  useEffect(() => {
    fetchConversations();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        console.log('[InboxScreen] Closing WebSocket connection');
        wsRef.current.close();
      }
    };
  }, [fetchConversations, setupWebSocket]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleLongPressConversation = (conversationId: string) => {
    console.log('[InboxScreen] Long-press on conversation, showing delete button', conversationId);
    setSelectedConversationId(prev => prev === conversationId ? null : conversationId);
  };

  const handleDeleteConversation = async () => {
    if (!conversationToDelete) return;
    console.log('[InboxScreen] Deleting conversation', conversationToDelete);
    setDeletingConversation(true);
    try {
      await authenticatedDelete(`/api/conversations/${conversationToDelete}`);
      console.log('[InboxScreen] Conversation deleted', conversationToDelete);
      setShowDeleteModal(false);
      setConversationToDelete(null);
      setSelectedConversationId(null);
      setConversations(prev => prev.filter(c => c.id !== conversationToDelete));
      await fetchUnreadCount();
    } catch (error: any) {
      console.error('[InboxScreen] Error deleting conversation', error);
      setShowDeleteModal(false);
      setConversationToDelete(null);
      setSelectedConversationId(null);
      setError(error.message || 'Failed to delete conversation');
    } finally {
      setDeletingConversation(false);
    }
  };

  const timeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) {
      const minsText = `${diffMins}m ago`;
      return minsText;
    }
    if (diffHours < 24) {
      const hoursText = `${diffHours}h ago`;
      return hoursText;
    }
    if (diffDays < 7) {
      const daysText = `${diffDays}d ago`;
      return daysText;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    const dateText = `${day}.${month}.${year}`;
    return dateText;
  };

  const postTypeEmoji = (type: string) => {
    if (type === 'sublet') return '🏠';
    if (type === 'travel') return '✈️';
    return '💬';
  };

  // Show loading spinner only on initial load
  if (loading && !initialLoadComplete) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Inbox</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {conversations.length === 0 ? (
        <ScrollView 
          style={styles.content} 
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Start a conversation by contacting someone from a post!
            </Text>
          </View>
        </ScrollView>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {conversations.map((conversation) => {
            const lastMessagePreview = conversation.lastMessage?.content || 'No messages yet';
            const isLastMessageFromMe = conversation.lastMessage?.senderId === user?.id;
            const lastMessageTime = conversation.lastMessage?.createdAt || conversation.createdAt;
            const hasUnread = conversation.unreadCount > 0;
            
            let participantName = 'Unknown User';
            if (conversation.otherParticipant) {
              participantName = conversation.otherParticipant.username || conversation.otherParticipant.name || 'Unknown User';
            }
            
            const timeText = timeDisplay(lastMessageTime);
            const isPostDeleted = !conversation.post;
            const postTitle = conversation.post?.title || 'Deleted post';
            const postType = conversation.post?.type || conversation.postType;
            const emoji = postTypeEmoji(postType);
            
            const isSelected = selectedConversationId === conversation.id;

            return (
              <View key={conversation.id} style={styles.conversationCardWrapper}>
                <TouchableOpacity
                  style={[
                    styles.conversationCard,
                    hasUnread && styles.conversationCardUnread,
                    isSelected && styles.conversationCardSelected,
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      setSelectedConversationId(null);
                      return;
                    }
                    console.log('[InboxScreen] Open conversation', conversation.id);
                    router.push(`/chat/${conversation.id}`);
                  }}
                  onLongPress={() => handleLongPressConversation(conversation.id)}
                  delayLongPress={400}
                >
                  <View style={styles.conversationHeader}>
                    <View style={styles.participantInfo}>
                      <Text style={[
                        styles.participantName,
                        hasUnread && styles.participantNameUnread
                      ]}>
                        {participantName}
                      </Text>
                      <View style={styles.postTag}>
                        <Text style={styles.postEmoji}>{emoji}</Text>
                        <Text style={[styles.postTitle, isPostDeleted && styles.postTitleDeleted]} numberOfLines={1}>
                          {postTitle}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.rightColumn}>
                      <Text style={styles.timestamp}>
                        {timeText}
                      </Text>
                      {hasUnread && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>
                            {conversation.unreadCount}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Text style={[
                    styles.lastMessage,
                    hasUnread && styles.lastMessageUnread
                  ]} numberOfLines={2}>
                    {isLastMessageFromMe ? 'You: ' : ''}{lastMessagePreview}
                  </Text>
                </TouchableOpacity>
                {isSelected && (
                  <TouchableOpacity
                    style={styles.deleteConversationButton}
                    onPress={() => {
                      console.log('[InboxScreen] Delete icon pressed for conversation', conversation.id);
                      setConversationToDelete(conversation.id);
                      setShowDeleteModal(true);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <IconSymbol
                      ios_icon_name="trash"
                      android_material_icon_name="delete"
                      size={18}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal
        visible={!!error}
        title="Error"
        message={error || ''}
        onClose={() => setError(null)}
        type="error"
      />

      <Modal
        visible={showDeleteModal}
        title="Delete Chat"
        message="Are you sure you want to delete this Chat? This action cannot be undone and will delete all messages."
        onClose={() => {
          setShowDeleteModal(false);
          setConversationToDelete(null);
        }}
        type="warning"
        actions={[
          {
            text: 'Cancel',
            onPress: () => {
              setShowDeleteModal(false);
              setConversationToDelete(null);
            },
            style: 'cancel',
          },
          {
            text: deletingConversation ? 'Deleting...' : 'Delete',
            onPress: handleDeleteConversation,
            style: 'destructive',
            disabled: deletingConversation,
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
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  contentContainer: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  conversationCardWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  conversationCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conversationCardUnread: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.card,
  },
  conversationCardSelected: {
    opacity: 0.85,
  },
  deleteConversationButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FEE2E2',
    marginLeft: spacing.sm,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  participantInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  participantName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 4,
  },
  participantNameUnread: {
    fontWeight: '700',
    color: colors.text,
  },
  postTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  postEmoji: {
    fontSize: 12,
    marginRight: 4,
  },
  postTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
    maxWidth: 180,
  },
  postTitleDeleted: {
    color: colors.textLight,
    fontStyle: 'italic',
  },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: spacing.xs,
    minWidth: 70,
  },
  timestamp: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 22,
  },
  lastMessage: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: colors.text,
  },
});
