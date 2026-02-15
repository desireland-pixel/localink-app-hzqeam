
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
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
  sender: {
    id: string;
    name: string;
    username?: string;
  };
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams();
  const { user, fetchUnreadCount } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  console.log('ChatScreen: Rendering', { conversationId: id, messagesCount: messages.length });

  useEffect(() => {
    if (id) {
      fetchMessages();
      setupWebSocket();
    }

    return () => {
      if (wsRef.current) {
        console.log('ChatScreen: Closing WebSocket connection');
        wsRef.current.close();
      }
    };
  }, [id]);

  const setupWebSocket = async () => {
    try {
      const token = await getBearerToken();
      if (!token) {
        console.warn('ChatScreen: No auth token, skipping WebSocket setup');
        return;
      }

      // Convert https:// to wss:// or http:// to ws://
      const wsUrl = BACKEND_URL.replace(/^https?:/, BACKEND_URL.startsWith('https') ? 'wss:' : 'ws:');
      
      // Note: WebSocket in React Native doesn't support custom headers in the constructor
      // The backend should validate the session from cookies or query params
      const ws = new WebSocket(`${wsUrl}/ws/messages`);

      ws.onopen = () => {
        console.log('ChatScreen: WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('ChatScreen: WebSocket message received', data);

          if (data.type === 'new_message' && data.conversationId === id) {
            // Add new message to the list if it's for this conversation
            setMessages(prev => {
              // Check if message already exists
              if (prev.some(m => m.id === data.message.id)) {
                return prev;
              }
              return [...prev, data.message];
            });
            setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
            
            // Refresh unread count
            fetchUnreadCount();
          }
        } catch (error) {
          console.error('ChatScreen: Error parsing WebSocket message', error);
        }
      };

      ws.onerror = (error) => {
        console.error('ChatScreen: WebSocket error', error);
      };

      ws.onclose = () => {
        console.log('ChatScreen: WebSocket disconnected');
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('ChatScreen: Error setting up WebSocket', error);
    }
  };

  const fetchMessages = async () => {
    console.log('ChatScreen: Fetching messages', id);
    setLoading(true);
    try {
      const data = await authenticatedGet<Message[]>(`/api/conversations/${id}/messages`);
      console.log('ChatScreen: Fetched messages', data);
      // Sort messages oldest to newest (ascending order by createdAt)
      const sortedMessages = [...data].sort((a, b) => {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      setMessages(sortedMessages);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
      
      // Mark all messages as read
      try {
        await authenticatedPost(`/api/conversations/${id}/mark-read`, {});
        console.log('ChatScreen: Messages marked as read');
      } catch (markReadError) {
        console.error('ChatScreen: Error marking messages as read', markReadError);
      }
      
      // Refresh unread count after marking messages as read
      await fetchUnreadCount();
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
      // Validate conversation ID is a valid UUID
      const conversationId = typeof id === 'string' ? id : String(id);
      if (!conversationId || conversationId === 'undefined') {
        throw new Error('Invalid conversation ID');
      }

      const response = await authenticatedPost<Message>(
        `/api/conversations/${conversationId}/messages`,
        { content: messageText }
      );
      console.log('ChatScreen: Message sent', response);
      
      // Ensure sender object exists with proper fallbacks
      const messageWithSender = {
        ...response,
        sender: response.sender || {
          id: user?.id || '',
          name: user?.name || 'You',
          username: user?.username || user?.name || 'You'
        }
      };
      
      // Only add message if it's not already in the list (WebSocket might have added it)
      setMessages(prev => {
        if (prev.some(m => m.id === messageWithSender.id)) {
          return prev;
        }
        return [...prev, messageWithSender];
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      console.error('ChatScreen: Error sending message', error);
      setError(error.message || 'Failed to send message');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const timeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const renderMessage = (msg: Message) => {
    const isOwnMessage = msg.senderId === user?.id;
    const time = timeDisplay(msg.createdAt);
    // Use username if available, fallback to name, with proper null checks
    const senderDisplayName = msg.sender?.username || msg.sender?.name || 'Unknown User';

    return (
      <View
        key={msg.id}
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        {!isOwnMessage && (
          <Text style={styles.senderName}>{senderDisplayName}</Text>
        )}
        <Text style={styles.messageText}>{msg.content}</Text>
        <Text style={styles.messageTime}>{time}</Text>
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(renderMessage)}
        </ScrollView>

        <View style={styles.inputContainer}>
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
    padding: spacing.md,
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
  senderName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  messageTime: {
    ...typography.bodySmall,
    color: colors.textLight,
    alignSelf: 'flex-end',
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
