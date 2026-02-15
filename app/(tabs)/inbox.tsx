
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
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
  unreadCount?: number;
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
}

export default function InboxScreen() {
  const router = useRouter();
  const { user, fetchUnreadCount } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  console.log('[InboxScreen] Rendering', { conversationsCount: conversations.length });

  useEffect(() => {
    fetchConversations();
  }, []);

  // Refresh unread count when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      console.log('[InboxScreen] Screen focused, refreshing unread count');
      fetchUnreadCount();
    }, [])
  );

  const fetchConversations = async () => {
    console.log('[InboxScreen] Fetching conversations');
    setLoading(true);
    try {
      const data = await authenticatedGet<Conversation[]>('/api/conversations');
      console.log('[InboxScreen] Fetched conversations', data);
      // Sort by last message time descending (newest first)
      const sortedData = data.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt || a.createdAt;
        const bTime = b.lastMessage?.createdAt || b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      setConversations(sortedData);
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

    if (diffMins < 1) {
      const justNowText = 'Just now';
      return justNowText;
    }
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
    
    const dateText = date.toLocaleDateString();
    return dateText;
  };

  // Calculate total unread count for badge
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Inbox</Text>
        {totalUnreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </Text>
          </View>
        )}
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
            const hasUnread = (conversation.unreadCount || 0) > 0;
            
            // Safely extract participant name with multiple fallbacks
            let participantName = 'Unknown User';
            if (conversation.otherParticipant) {
              participantName = conversation.otherParticipant.username || conversation.otherParticipant.name || 'Unknown User';
            }
            
            const timeText = timeDisplay(lastMessageTime);
            
            return (
              <TouchableOpacity
                key={conversation.id}
                style={[
                  styles.conversationCard,
                  hasUnread && styles.conversationCardUnread
                ]}
                onPress={() => router.push(`/chat/${conversation.id}`)}
              >
                <View style={styles.conversationHeader}>
                  <Text style={[
                    styles.participantName,
                    hasUnread && styles.participantNameUnread
                  ]}>
                    {participantName}
                  </Text>
                  <View style={styles.timestampContainer}>
                    <Text style={styles.timestamp}>
                      {timeText}
                    </Text>
                    {hasUnread && (
                      <View style={styles.unreadDot} />
                    )}
                  </View>
                </View>
                <Text 
                  style={[
                    styles.lastMessage,
                    hasUnread && styles.lastMessageUnread
                  ]} 
                  numberOfLines={2}
                >
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
    flexDirection: 'row',
    alignItems: 'center',
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
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
  conversationCardUnread: {
    backgroundColor: colors.card,
    borderColor: colors.primary,
    borderWidth: 2,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  participantName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  participantNameUnread: {
    fontWeight: '700',
    color: colors.text,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timestamp: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
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
