
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { formatDateToDDMMYYYY } from '@/utils/cities';

const CATEGORY_COLORS: { [key: string]: { background: string; text: string } } = {
  'Visa': { background: '#DBEAFE', text: '#1E40AF' },
  'Insurance': { background: '#FEF3C7', text: '#92400E' },
  'Housing': { background: '#D1FAE5', text: '#065F46' },
  'Jobs': { background: '#FCE7F3', text: '#9F1239' },
  'Healthcare': { background: '#E0E7FF', text: '#3730A3' },
  'Banking': { background: '#FED7AA', text: '#9A3412' },
  'Education': { background: '#E9D5FF', text: '#6B21A8' },
  'General': { background: '#FDE68A', text: '#78350F' },
};

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
  replyCount?: number;
  unreadRepliesCount?: number;
  user: {
    id: string;
    name: string;
    username?: string;
  };
}

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'open' | 'closed'>('all');

  console.log('CommunityScreen: Rendering', { topicsCount: topics.length, selectedCategory, selectedStatus });

  const fetchTopics = React.useCallback(async () => {
    console.log('CommunityScreen: Fetching topics');
    try {
      let endpoint = '/api/community/topics?limit=100';
      if (selectedCategory) {
        endpoint += `&category=${encodeURIComponent(selectedCategory)}`;
      }
      if (selectedStatus !== 'all') {
        endpoint += `&status=${selectedStatus}`;
      }
      
      const data = await authenticatedGet<CommunityTopic[]>(endpoint);
      console.log('CommunityScreen: Fetched topics', data);
      
      const sortedTopics = data.sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      setTopics(sortedTopics);
    } catch (error: any) {
      console.error('CommunityScreen: Error fetching topics', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedStatus]);

  const scrollViewRef = React.useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      console.log('CommunityScreen: Screen focused, refreshing topics');
      fetchTopics();
    }, [fetchTopics])
  );

  // Auto-scroll to unread post when topics are loaded
  useEffect(() => {
    if (topics.length > 0 && scrollViewRef.current) {
      const unreadPostIndex = topics.findIndex(t => t.userId === user?.id && (t.unreadRepliesCount || 0) > 0);
      if (unreadPostIndex !== -1 && unreadPostIndex > 2) {
        // Scroll to unread post after a short delay to ensure layout is complete
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: unreadPostIndex * 150, animated: true });
        }, 300);
      }
    }
  }, [topics, user?.id]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const onRefresh = () => {
    console.log('CommunityScreen: Refreshing topics');
    setRefreshing(true);
    fetchTopics();
  };

  const handleViewTopic = (topicId: string) => {
    console.log('CommunityScreen: View topic', topicId);
    router.push(`/carry/${topicId}`);
  };

  const toggleFavorite = async (topicId: string, event: any) => {
    event.stopPropagation();
    console.log('CommunityScreen: Toggle favorite', topicId);
    
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;
    
    try {
      await authenticatedPost('/api/favorites', { postId: topicId, postType: 'community' });
      console.log('CommunityScreen: Favorited topic', topicId);
    } catch (error: any) {
      console.error('CommunityScreen: Error favoriting topic', error);
    }
  };

  const categories = ['Visa', 'Insurance', 'Housing', 'Jobs', 'Healthcare', 'Banking', 'Education', 'General'];

  const filteredTopics = topics;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Community</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/post-community-topic')}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={24}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryChipText, selectedCategory === null && styles.categoryChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => {
          const isSelected = selectedCategory === category;
          const categoryColor = CATEGORY_COLORS[category] || CATEGORY_COLORS['General'];
          
          return (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                isSelected && { backgroundColor: categoryColor.background }
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryChipText,
                isSelected && { color: categoryColor.text, fontWeight: '600' }
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.statusFilterContainer}>
        <TouchableOpacity
          style={[styles.statusFilterButton, selectedStatus === 'all' && styles.statusFilterButtonActive]}
          onPress={() => setSelectedStatus('all')}
        >
          <Text style={[styles.statusFilterText, selectedStatus === 'all' && styles.statusFilterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusFilterButton, selectedStatus === 'open' && styles.statusFilterButtonActive]}
          onPress={() => setSelectedStatus('open')}
        >
          <Text style={[styles.statusFilterText, selectedStatus === 'open' && styles.statusFilterTextActive]}>
            Open
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.statusFilterButton, selectedStatus === 'closed' && styles.statusFilterButtonActive]}
          onPress={() => setSelectedStatus('closed')}
        >
          <Text style={[styles.statusFilterText, selectedStatus === 'closed' && styles.statusFilterTextActive]}>
            Closed
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView 
          ref={scrollViewRef}
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {filteredTopics.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No discussions yet</Text>
              <Text style={styles.emptyText}>
                Be the first to start a discussion in this category!
              </Text>
            </View>
          ) : (
            filteredTopics.map((topic) => {
              const categoryColor = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS['General'];
              const isClosed = topic.status === 'closed';
              const categoryBackgroundColor = isClosed ? '#E5E7EB' : categoryColor.background;
              const categoryTextColor = isClosed ? '#6B7280' : categoryColor.text;
              const replyCount = topic.replyCount || 0;
              const createdDate = formatDateToDDMMYYYY(topic.createdAt);
              const authorName = topic.user.username || topic.user.name;
              const isOwnTopic = topic.userId === user?.id;
              const hasUnreadReplies = isOwnTopic && (topic.unreadRepliesCount || 0) > 0;
              
              return (
                <TouchableOpacity
                  key={topic.id}
                  style={[
                    styles.topicCard,
                    hasUnreadReplies && styles.topicCardUnread
                  ]}
                  onPress={() => handleViewTopic(topic.id)}
                >
                  <View style={styles.topicHeader}>
                    <View style={[styles.categoryBadge, { backgroundColor: categoryBackgroundColor }]}>
                      <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>
                        {topic.category}
                      </Text>
                    </View>
                    <View style={styles.topicHeaderRight}>
                      {isClosed && (
                        <View style={styles.closedBadge}>
                          <Text style={styles.closedBadgeText}>Closed</Text>
                        </View>
                      )}
                      {!isOwnTopic && (
                        <TouchableOpacity 
                          style={styles.likeButton}
                          onPress={(e) => toggleFavorite(topic.id, e)}
                        >
                          <IconSymbol
                            ios_icon_name="heart"
                            android_material_icon_name="favorite-border"
                            size={20}
                            color={colors.textLight}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  
                  <Text style={styles.topicTitle}>{topic.title}</Text>
                  
                  {topic.description && (
                    <Text style={styles.topicDescription} numberOfLines={2}>
                      {topic.description}
                    </Text>
                  )}
                  
                  <View style={styles.topicFooter}>
                    <View style={styles.authorDateRow}>
                      <Text style={styles.authorText}>{authorName}</Text>
                      <Text style={styles.dateSeparator}> • </Text>
                      <Text style={styles.dateText}>{createdDate}</Text>
                    </View>
                    <View style={styles.replyCountContainer}>
                      <IconSymbol
                        ios_icon_name="bubble.left"
                        android_material_icon_name="chat-bubble-outline"
                        size={16}
                        color={colors.textLight}
                      />
                      <Text style={styles.replyCountText}>{replyCount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
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
    justifyContent: 'space-between',
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
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryScrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 13,
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusFilterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusFilterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusFilterText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
  },
  statusFilterTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  topicCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topicCardUnread: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  closedBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedBadgeText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  likeButton: {
    padding: spacing.xs,
  },
  topicTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    fontSize: 16,
    fontWeight: '600',
  },
  topicDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
    fontSize: 13,
  },
  topicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  authorDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  dateSeparator: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  replyCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyCountText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
});
