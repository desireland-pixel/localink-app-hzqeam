
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Conversation {
  id: string;
  postId: string;
  postType: string;
  participant1Id: string;
  participant2Id: string;
  createdAt: string;
  lastMessage?: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  };
  otherParticipant: {
    id: string;
    name: string;
  };
}

export default function InboxScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  console.log('[InboxScreen] Rendering', { conversationsCount: conversations.length });

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    console.log('[InboxScreen] Fetching conversations');
    setLoading(true);
    try {
      const data = await authenticatedGet<Conversation[]>('/api/conversations');
      console.log('[InboxScreen] Fetched conversations', data);
      setConversations(data);
    } catch (error) {
      console.error('[InboxScreen] Error fetching conversations', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('[InboxScreen] Refreshing conversations');
    setRefreshing(true);
    fetchConversations();
  };

  const timeDisplay = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : conversations.length === 0 ? (
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
            
            return (
              <TouchableOpacity
                key={conversation.id}
                style={styles.conversationCard}
                onPress={() => router.push(`/chat/${conversation.id}`)}
              >
                <View style={styles.conversationHeader}>
                  <Text style={styles.participantName}>
                    {conversation.otherParticipant.name}
                  </Text>
                  <Text style={styles.timestamp}>
                    {timeDisplay(lastMessageTime)}
                  </Text>
                </View>
                <Text style={styles.lastMessage} numberOfLines={2}>
                  {isLastMessageFromMe ? 'You: ' : ''}{lastMessagePreview}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
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
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
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
  conversationCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  participantName: {
    ...typography.h3,
    color: colors.text,
  },
  timestamp: {
    ...typography.bodySmall,
    color: colors.textLight,
  },
  lastMessage: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
