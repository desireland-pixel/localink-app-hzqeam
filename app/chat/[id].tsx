
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, BACKEND_URL, getBearerToken } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
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
  post: {
    id: string;
    title: string;
    type: 'sublet' | 'travel';
  };
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user, fetchUnreadCount } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  console.log('ChatScreen: Rendering', { conversationId: id, messagesCount: messages.length, currentUserId: user?.id });

  useFocusEffect(
    React.useCallback(() => {
      console.log('ChatScreen: Screen focused, marking messages as read');
      markMessagesAsRead();
    }, [id])
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
  }, [id]);

  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  const markMessagesAsRead = async () => {
    if (!id) return;
    
    try {
      await authenticatedPost(`/api/conversations/${id}/mark-read`, {});
      console.log('ChatScreen: Messages marked as read');
      await fetchUnreadCount();
    } catch (error) {
      console.error('ChatScreen: Error marking messages as read', error);
    }
  };

  const startPolling = () => {
    // Poll for new messages every 3 seconds as a fallback
    pollingIntervalRef.current = setInterval(async () => {
      try {
        console.log('[ChatScreen] Polling for new messages');
        const data = await authenticatedGet<{ messages: Message[]; conversation: Conversation }>(`/api/conversations/${id}/messages`);
        
        if (data && data.messages && Array.isArray(data.messages)) {
          const sortedMessages = [...data.messages].sort((a, b) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          
          // Only update if there are new messages
          setMessages(prev => {
            if (prev.length !== sortedMessages.length) {
              console.log('[ChatScreen] New messages detected via polling');
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
  };

  const setupWebSocket = async () => {
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

      // Pass token as query param since WebSocket headers aren't supported in all environments
      const ws = new WebSocket(`${wsUrl}/ws/messages?token=${encodeURIComponent(token)}`);

      ws.onopen = () => {
        console.log('ChatScreen: WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('ChatScreen: WebSocket message received', data);

          if (data.type === 'new_message' && data.conversationId === id) {
            setMessages(prev => {
              if (prev.some(m => m.id === data.message.id)) {
                return prev;
              }
              return [...prev, data.message];
            });
            
            markMessagesAsRead();
          } else if (data.type === 'message_status_update' && data.conversationId === id) {
            console.log('ChatScreen: Updating message status', data);
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
        // Silently log - polling handles message sync as fallback
        console.log('ChatScreen: WebSocket unavailable, using polling fallback');
      };

      ws.onclose = () => {
        console.log('ChatScreen: WebSocket disconnected');
      };

      wsRef.current = ws;
    } catch (error) {
      // Silently handle - polling will handle message sync
      console.log('ChatScreen: WebSocket setup skipped, using polling fallback');
    }
  };

  const fetchConversation = async () => {
    // Conversation details are fetched via the messages endpoint which works
    // regardless of hasSentMessages status (so new/empty chats still load correctly)
    console.log('ChatScreen: Conversation details will be loaded via fetchMessages', id);
  };

  const fetchMessages = async () => {
    console.log('ChatScreen: Fetching messages', id);
    setLoading(true);
    try {
      const data = await authenticatedGet<{ messages: Message[]; conversation: Conversation }>(`/api/conversations/${id}/messages`);
      console.log('ChatScreen: Fetched messages response', data);
      
      if (!data || !data.messages || !Array.isArray(data.messages)) {
        console.error('ChatScreen: Invalid messages data format', data);
        setError('Invalid messages data format');
        return;
      }
      
      const messagesArray = data.messages;
      
      if (data.conversation) {
        setConversation(data.conversation);
      }
      
      const sortedMessages = [...messagesArray].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      
      console.log('ChatScreen: Sorted messages', { 
        count: sortedMessages.length, 
        currentUserId: user?.id,
        sampleMessages: sortedMessages.slice(0, 3).map(m => ({
          id: m.id,
          senderId: m.senderId,
          isOwnMessage: m.senderId === user?.id,
          content: m.content.substring(0, 20)
        }))
      });
      
      setMessages(sortedMessages);
      
      await markMessagesAsRead();
    } catch (error: any) {
      console.error('ChatScreen: Error fetching messages', error);
      setError(error.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    console.log('ChatScreen: Sending message', newMessage);
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
      console.log('ChatScreen: Message sent', response);
      
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
        return [...prev, messageWithSender];
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
    console.log('ChatScreen: handleViewPost called', { 
      postId: conversation?.postId, 
      postType: conversation?.postType,
      post: conversation?.post 
    });
    
    if (!conversation?.post?.id || !conversation?.post?.type) {
      console.warn('ChatScreen: Cannot navigate to post - missing post.id or post.type', conversation);
      return;
    }
    
    const postId = conversation.post.id;
    const postType = conversation.post.type;
    
    console.log('ChatScreen: Navigating to post', postId, postType);
    
    if (postType === 'sublet') {
      router.push(`/sublet/${postId}`);
    } else if (postType === 'travel') {
      router.push(`/travel/${postId}`);
    }
  };

  const timeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const timeText = `${hours}:${minutes}`;
    return timeText;
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const currentUserId = user?.id;
    const messageSenderId = item.senderId;
    const isOwnMessage = currentUserId === messageSenderId;
    const time = timeDisplay(item.createdAt);

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
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
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
      </View>
    );
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
  const postTitle = conversation?.post?.title || '';
  const postEmoji = conversation?.post?.type === 'sublet' ? '🏠' : conversation?.post?.type === 'travel' ? '✈️' : '';

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen 
        options={{
          headerShown: true,
          title: participantName,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        {conversation?.post && (
          <TouchableOpacity 
            style={styles.postReferenceCard}
            onPress={handleViewPost}
            activeOpacity={0.7}
          >
            <Text style={styles.postReferenceEmoji}>{postEmoji}</Text>
            <Text style={styles.postReferenceTitle} numberOfLines={1} ellipsizeMode="tail">
              {postTitle}
            </Text>
          </TouchableOpacity>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        <View style={[
          styles.inputContainer,
          Platform.OS === 'android' && styles.inputContainerAndroid,
          Platform.OS === 'ios' && styles.inputContainerIOS
        ]}>
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
            <IconSymbol
              ios_icon_name="arrow.up.circle.fill"
              android_material_icon_name="send"
              size={32}
              color={!newMessage.trim() || sending ? colors.textLight : colors.primary}
            />
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
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
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
  messageContent: {
    flexDirection: 'column',
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
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
    fontSize: 10,
  },
  ownMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusIcon: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  inputContainerAndroid: {
    // Android: Move up 2-3mm (approximately 8-12 pixels)
    paddingBottom: spacing.xl,
    marginBottom: 32,
  },
  inputContainerIOS: {
    // iOS: Move up 4-5mm (approximately 16-20 pixels)
    marginBottom: 18,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    maxHeight: 100,
    ...typography.body,
    color: colors.text,
  },
  sendButton: {
    padding: spacing.xs,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
