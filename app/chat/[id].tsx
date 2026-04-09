
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable, Keyboard } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedDelete, BACKEND_URL, getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { capture, SCREEN_NAMES } from '@/utils/analytics';
import { useScreenTracking } from '@/utils/useScreenTracking';
import Modal from '@/components/ui/Modal';
import { IconSymbol } from '@/components/IconSymbol';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deliveredAt?: string;
  readAt?: string;
  sender?: {
    id: string;
    name: string;
    username?: string;
  };
}

type DateSeparator = { type: 'date_separator'; label: string; id: string };
type ChatListItem = Message | DateSeparator;

interface Conversation {
  id: string;
  postId: string;
  postType: string;
  createdAt: string;
  otherParticipant: {
    id: string;
    name: string;
    username?: string;
  };
  post?: { id: string; title: string; type: 'sublet' | 'travel' | 'community' } | null;
}

export default function ChatScreen() {
  useScreenTracking(SCREEN_NAMES.CHAT);
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, fetchUnreadCount } = useAuth();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showDeletedPostModal, setShowDeletedPostModal] = useState(false);
  const [showDeleteMessageModal, setShowDeleteMessageModal] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [deletingMessage, setDeletingMessage] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const markMessagesAsRead = React.useCallback(async () => {
    if (!id) return;
    
    try {
      await authenticatedPost(`/api/conversations/${id}/mark-read`, {});
      console.log('ChatScreen: Messages marked as read');
      await fetchUnreadCount();
    } catch (error) {
      console.error('ChatScreen: Error marking messages as read', error);
    }
  }, [id, fetchUnreadCount]);

  const startPolling = React.useCallback(() => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const data = await authenticatedGet<{ messages: Message[]; conversation: Conversation }>(`/api/conversations/${id}/messages`);
        
        if (data && data.messages && Array.isArray(data.messages)) {
          const sortedMessages = [...data.messages].sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          });
          
          setMessages(prev => {
            if (prev.length !== sortedMessages.length) {
              markMessagesAsRead();
              return sortedMessages;
            }
            return prev;
          });
        }
      } catch (error) {
        console.error('[ChatScreen] Error polling for messages:', error);
      }
    }, 3000);
  }, [id, markMessagesAsRead]);

  const setupWebSocket = React.useCallback(async () => {
    try {
      const token = await getBearerToken();
      if (!token) {
        console.warn('ChatScreen: No auth token, skipping WebSocket setup');
        return;
      }

      if (!BACKEND_URL) {
        console.warn('ChatScreen: No backend URL, skipping WebSocket setup');
        return;
      }

      const wsUrl = BACKEND_URL.startsWith('https')
        ? BACKEND_URL.replace(/^https:/, 'wss:')
        : BACKEND_URL.replace(/^http:/, 'ws:');

      const ws = new WebSocket(`${wsUrl}/ws/messages?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        console.log('ChatScreen: WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'new_message' && data.conversationId === id) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) {
                return prev;
              }
              return [...prev, data.message];
            });
            
            markMessagesAsRead();
          } else if (data.type === 'message_status_update' && data.conversationId === id) {
            setMessages(prev => prev.map(msg => {
              if (msg.id === data.messageId) {
                return {
                  ...msg,
                  deliveredAt: data.deliveredAt || msg.deliveredAt,
                  readAt: data.readAt || msg.readAt,
                };
              }
              return msg;
            }));
          }
        } catch (error) {
          console.error('ChatScreen: Error parsing WebSocket message', error);
        }
      };

      ws.onerror = (error) => {
        console.log('ChatScreen: WebSocket unavailable, using polling fallback');
      };

      ws.onclose = () => {
        console.log('ChatScreen: WebSocket disconnected');
      };

      wsRef.current = ws;
    } catch (error) {
      console.log('ChatScreen: WebSocket setup skipped, using polling fallback');
    }
  }, [id, markMessagesAsRead]);

  const fetchConversation = React.useCallback(async () => {
    try {
      console.log('ChatScreen: Fetching conversation details for id:', id);
      // The endpoint may return the conversation directly or wrapped — handle both
      const data = await authenticatedGet<Conversation | { conversation: Conversation }>(`/api/conversations/${id}`);
      if (!data) return;
      const conv = (data as any).conversation ?? (data as Conversation);
      if (conv?.id) {
        console.log('ChatScreen: Conversation fetched, post:', conv.post);
        setConversation(conv);
      }
    } catch (error) {
      console.error('ChatScreen: Error fetching conversation details', error);
    }
  }, [id]);

  const fetchMessages = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await authenticatedGet<{ messages: Message[]; conversation: Conversation }>(`/api/conversations/${id}/messages`);
      
      if (!data || !data.messages || !Array.isArray(data.messages)) {
        console.error('ChatScreen: Invalid messages data format', data);
        setError('Invalid messages data format');
        return;
      }
      
      const messagesArray = data.messages;
      console.log('ChatScreen: Fetched messages', messagesArray.length)
      
      if (data.conversation) {
        setConversation(data.conversation);
      }
      
      const sortedMessages = [...messagesArray].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setMessages(sortedMessages);
      
      await markMessagesAsRead();
    } catch (error: any) {
      console.error('ChatScreen: Error fetching messages', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [id, markMessagesAsRead]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('ChatScreen: Screen focused, marking messages as read');
      markMessagesAsRead();
    }, [markMessagesAsRead])
  );

  useEffect(() => {
    if (id) {
      fetchConversation();
      fetchMessages();
      setupWebSocket();
      startPolling();
    }

    return () => {
      if (wsRef.current) {
        console.log('ChatScreen: Closing WebSocket connection');
        wsRef.current.close();
      }
      if (pollingIntervalRef.current) {
        console.log('ChatScreen: Stopping polling');
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [id, fetchConversation, fetchMessages, setupWebSocket, startPolling]);

  const handleDeleteMessage = async () => {
    if (!messageToDelete || !id) return;
    console.log('[ChatScreen] Deleting message:', messageToDelete);
    setDeletingMessage(true);
    try {
      const conversationId = typeof id === 'string' ? id : String(id);
      await authenticatedDelete(`/api/conversations/${conversationId}/messages/${messageToDelete}`, {});
      console.log('[ChatScreen] Message deleted successfully');
      setShowDeleteMessageModal(false);
      setMessageToDelete(null);
      setSelectedMessageId(null);
      setMessages(prev => prev.filter(m => m.id !== messageToDelete));
    } catch (err: any) {
      console.error('[ChatScreen] Error deleting message:', err);
      setError(err.message || 'Failed to delete message');
      setShowDeleteMessageModal(false);
      setMessageToDelete(null);
      setSelectedMessageId(null);
    } finally {
      setDeletingMessage(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    console.log('ChatScreen: Sending message in conversation', id);
    capture('send_message', { conversation_id: id });
    setSending(true);
    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      const conversationId = typeof id === 'string' ? id : String(id);
      if (!conversationId || conversationId === 'undefined') {
        throw new Error('Invalid conversation ID');
      }

      const response = await authenticatedPost<Message>(
        `/api/conversations/${conversationId}/messages`,
        { content: messageText }
      );
      
      const messageWithSender = {
        ...response,
        sender: response.sender || {
          id: user?.id || '',
          name: user?.name || 'You',
          username: user?.name || 'You'
        }
      };
      
      setMessages(prev => {
        if (prev.some(m => m.id === messageWithSender.id)) {
          return prev;
        }
        return [messageWithSender, ...prev];
      });
      
    } catch (error: any) {
      console.error('ChatScreen: Error sending message', error);
      setError(error.message || 'Failed to send message');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleViewPost = () => {
    
    if (!conversation?.post) {
      console.log('ChatScreen: Post has been deleted, showing notification');
      setShowDeletedPostModal(true);
      return;
    }
    
    if (!conversation?.post?.id || !conversation?.post?.type) {
      console.warn('ChatScreen: Cannot navigate to post - missing post.id or post.type', conversation);
      return;
    }
    
    const postId = conversation.post.id;
    const postType = conversation.post.type;
    
    if (postType === 'sublet') {
      router.push(`/sublet/${postId}`);
    } else if (postType === 'travel') {
      router.push(`/travel/${postId}`);
    } else if (postType === 'community') {
      router.push(`/community/${postId}`);
    }
  };

  const formatDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    const sameYear = date.getFullYear() === today.getFullYear();
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: sameYear ? undefined : 'numeric',
    });
  };

  const chatItems = useMemo((): ChatListItem[] => {
    const result: ChatListItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      result.push(messages[i]);
      const currentDate = new Date(messages[i].createdAt).toDateString();
      const nextDate = messages[i + 1] ? new Date(messages[i + 1].createdAt).toDateString() : null;
      if (currentDate !== nextDate) {
        result.push({
          type: 'date_separator',
          label: formatDateLabel(messages[i].createdAt),
          id: `sep-${currentDate}`,
        });
      }
    }
    return result;
  }, [messages]);

  const timeDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeText = `${hours}:${minutes}`;
    return timeText;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    if (!item.content) return null;
    const currentUserId = user?.id;
    const messageSenderId = item.senderId;
    const isOwnMessage = currentUserId === messageSenderId;
    const senderName = item.sender?.name || '';
    const time = timeDisplay(item.createdAt);
    const isSelected = selectedMessageId === item.id;

    let statusIcon = null;
    let statusColor = 'rgba(255, 255, 255, 0.7)';
    
    if (isOwnMessage) {
      if (item.readAt) {
        statusIcon = '✓✓';
        statusColor = '#3B82F6';
      } else if (item.deliveredAt) {
        statusIcon = '✓✓';
        statusColor = 'rgba(255, 255, 255, 0.7)';
      } else {
        statusIcon = '✓';
        statusColor = 'rgba(255, 255, 255, 0.7)';
      }
    }

    return (
      <View style={[styles.messageRow, isOwnMessage ? styles.messageRowOwn : styles.messageRowOther]}>
        <Pressable
          onLongPress={() => {
            setSelectedMessageId(isSelected ? null : item.id);
          }}
          onPress={() => {
            if (isSelected) {
              setSelectedMessageId(null);
            }
          }}
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
            isSelected && styles.messageBubbleSelected,
          ]}
        >
          <View style={styles.messageContent}>
            <Text style={[
              styles.messageText,
              isOwnMessage && styles.ownMessageText
            ]}>
              {item.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text style={[
                styles.messageTime,
                isOwnMessage && styles.ownMessageTime
              ]}>
                {time}
              </Text>
              {isOwnMessage && statusIcon && (
                <Text style={[styles.statusIcon, { color: statusColor }]}>
                  {statusIcon}
                </Text>
              )}
            </View>
          </View>
        </Pressable>
        {isSelected && (
          <TouchableOpacity
            style={[styles.deleteMessageButton, isOwnMessage ? styles.deleteMessageButtonOwn : styles.deleteMessageButtonOther]}
            onPress={() => {
              setMessageToDelete(item.id);
              setShowDeleteMessageModal(true);
              setSelectedMessageId(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol
              ios_icon_name="trash"
              android_material_icon_name="delete"
              size={16}
              color="#FF3B30"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderItem = ({ item }: { item: ChatListItem }) => {
    if ('type' in item && item.type === 'date_separator') {
      return (
        <View style={styles.dateSeparatorContainer}>
          <Text style={styles.dateSeparatorText}>{item.label}</Text>
        </View>
      );
    }
    return renderMessage({ item: item as Message });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const participantName = conversation?.otherParticipant?.username || conversation?.otherParticipant?.name || 'Chat';
  const isPostDeleted = conversation !== null && !conversation?.post;
  const postTitle = conversation?.post?.title || (isPostDeleted ? 'Deleted post' : '');
  const postEmoji = conversation?.post?.type === 'sublet' ? '🏠' 
    : conversation?.post?.type === 'travel' ? '✈️' 
    : conversation?.post?.type === 'community' ? '💬' 
    : (isPostDeleted ? '🗑️' : '');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: participantName,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 110 : 110}
      >
        {(conversation?.post || isPostDeleted) && (
          <TouchableOpacity 
            style={[styles.postReferenceCard, isPostDeleted && styles.postReferenceCardDeleted]}
            onPress={handleViewPost}
            activeOpacity={0.7}
          >
            <Text style={styles.postReferenceEmoji}>{postEmoji}</Text>
            <Text style={[styles.postReferenceTitle, isPostDeleted && styles.postReferenceTitleDeleted]} numberOfLines={1} ellipsizeMode="tail">
              {postTitle}
            </Text>
          </TouchableOpacity>
        )}

        <FlatList
          inverted
          ref={flatListRef}
          data={chatItems}
          renderItem={renderItem}
          keyExtractor={(item) => ('type' in item && item.type === 'date_separator' ? item.id : (item as Message).id)}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'android' ? 0 : 0 }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor={colors.textLight}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
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
      </KeyboardAvoidingView>

      <Modal
        visible={!!error}
        title="Error"
        message={error}
        onClose={() => setError('')}
        type="error"
      />

      <Modal
        visible={showDeletedPostModal}
        title="Post Deleted"
        message="This post has been deleted by its owner."
        onClose={() => setShowDeletedPostModal(false)}
        type="info"
      />

      <Modal
        visible={showDeleteMessageModal}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        onClose={() => {
          setShowDeleteMessageModal(false);
          setMessageToDelete(null);
        }}
        type="warning"
        actions={[
          {
            text: 'Cancel',
            onPress: () => {
              setShowDeleteMessageModal(false);
              setMessageToDelete(null);
            },
            style: 'cancel',
          },
          {
            text: deletingMessage ? 'Deleting...' : 'Delete',
            onPress: handleDeleteMessage,
            style: 'destructive',
            disabled: deletingMessage,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postReferenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postReferenceCardDeleted: {
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  postReferenceEmoji: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  postReferenceTitle: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    flex: 1,
  },
  postReferenceTitleDeleted: {
    color: colors.textLight,
    fontStyle: 'italic',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  messageRowOwn: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageBubbleSelected: {
    opacity: 0.8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteMessageButton: {
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
    backgroundColor: '#FEE2E2',
    marginHorizontal: spacing.xs,
  },
  deleteMessageButtonOwn: {
    marginRight: 0,
    marginLeft: spacing.xs,
  },
  deleteMessageButtonOther: {
    marginLeft: 0,
    marginRight: spacing.xs,
  },
  messageContent: {
    flexDirection: 'column',
  },
  senderName: {
    ...typography.bodySmall,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 18,
    fontSize: 13,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 2,
  },
  messageTime: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 9,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusIcon: {
    ...typography.bodySmall,
    fontSize: 10,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    minHeight: 44,
    ...typography.body,
    color: colors.text,
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
  dateSeparatorContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  dateSeparatorText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
