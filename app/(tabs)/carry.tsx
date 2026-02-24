
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';

interface CommunityTopic {
  id: string;
  userId: string;
  category: string;
  title: string;
  description?: string;
  status: 'open' | 'closed';
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    username?: string;
  };
  replyCount?: number;
  repliesCount?: number | string;
}

const CATEGORIES = [
  'All',
  'Visa',
  'Insurance',
  'Housing',
  'Jobs',
  'Healthcare',
  'Banking',
  'Education',
  'General',
];

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

export default function CommunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  console.log('CommunityScreen: Rendering', { topicsCount: topics.length, loading });

  const fetchTopics = React.useCallback(async () => {
    console.log('CommunityScreen: Fetching community topics');
    if (topics.length === 0) {
      setLoading(true);
    }
    try {
      const filterParams = params.filters ? `?${params.filters}` : '';
      const data = await authenticatedGet<CommunityTopic[]>(`/api/community/topics${filterParams}`);
      console.log('CommunityScreen: Fetched community topics', data);
      const dataArray = Array.isArray(data) ? data : [];
      const sortedData = dataArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTopics(sortedData);
    } catch (error) {
      console.error('CommunityScreen: Error fetching community topics', error);
      if (topics.length === 0) {
        setTopics([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.filters, topics.length]);

  const fetchFavorites = React.useCallback(async () => {
    try {
      console.log('CommunityScreen: Fetching favorites');
      const data = await authenticatedGet<{ postId: string; postType: string }[]>('/api/favorites');
      const communityFavorites = data.filter(f => f.postType === 'community').map(f => f.postId);
      setFavorites(new Set(communityFavorites));
    } catch (error) {
      console.error('CommunityScreen: Error fetching favorites', error);
    }
  }, []);

  useEffect(() => {
    fetchTopics();
    fetchFavorites();
  }, [fetchTopics, fetchFavorites]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('CommunityScreen: Screen focused, refreshing topics');
      fetchTopics();
      fetchFavorites();
    }, [fetchTopics, fetchFavorites])
  );

  const toggleFavorite = async (postId: string) => {
    console.log('CommunityScreen: Toggle favorite', postId);
    const isFavorited = favorites.has(postId);
    
    const newFavorites = new Set(favorites);
    if (isFavorited) {
      newFavorites.delete(postId);
    } else {
      newFavorites.add(postId);
    }
    setFavorites(newFavorites);

    try {
      if (isFavorited) {
        await authenticatedDelete(`/api/favorites/${postId}?postType=community`, {});
      } else {
        await authenticatedPost('/api/favorites', { postId, postType: 'community' });
      }
    } catch (error) {
      console.error('CommunityScreen: Error toggling favorite', error);
      setFavorites(favorites);
    }
  };

  const onRefresh = () => {
    console.log('CommunityScreen: Refreshing');
    setRefreshing(true);
    fetchTopics();
    fetchFavorites();
  };

  const filteredTopics = topics.filter(topic =>
    topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (topic.description && topic.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    topic.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search discussions..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.iconButton, params.filters && styles.iconButtonActive]}
          onPress={() => router.push({
            pathname: '/carry-filters',
            params: { filters: params.filters || '' }
          })}
        >
          <IconSymbol
            ios_icon_name="line.3.horizontal.decrease.circle"
            android_material_icon_name="filter-list"
            size={24}
            color={params.filters ? colors.primary : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            console.log('CommunityScreen: Navigate to post community topic');
            router.push('/post-community-topic');
          }}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loading && topics.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredTopics.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>💬</Text>
          <Text style={styles.emptyTitle}>No discussions yet</Text>
          <Text style={styles.emptySubtitle}>Start a conversation about Visa, Travel Insurance, or other topics!</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => {
              console.log('CommunityScreen: Navigate to post community topic');
              router.push('/post-community-topic');
            }}
          >
            <Text style={styles.requestButtonText}>Start Discussion</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {filteredTopics.map((topic) => {
            const authorName = topic.user?.username || topic.user?.name || 'Unknown';
            const createdDate = formatDateToDDMMYYYY(topic.createdAt);
            const isFavorited = favorites.has(topic.id);
            const isOpen = topic.status === 'open';
            
            const categoryColor = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS['General'];
            const categoryBackgroundColor = isOpen ? categoryColor.background : '#E5E7EB';
            const categoryTextColor = isOpen ? categoryColor.text : '#6B7280';
            
            const replyCountValue = topic.replyCount ?? (topic.repliesCount !== undefined ? parseInt(String(topic.repliesCount), 10) || 0 : 0);
            
            return (
              <TouchableOpacity
                key={topic.id}
                style={styles.card}
                onPress={() => {
                  console.log('CommunityScreen: View topic', topic.id);
                  router.push(`/carry/${topic.id}`);
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.tagRow}>
                    <View style={[styles.categoryBadge, { backgroundColor: categoryBackgroundColor }]}>
                      <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>{topic.category}</Text>
                    </View>
                    {!isOpen && (
                      <View style={styles.closedBadge}>
                        <Text style={styles.closedBadgeText}>Closed</Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity 
                    onPress={(e) => {
                      e.stopPropagation();
                      console.log('CommunityScreen: Heart button pressed for', topic.id);
                      toggleFavorite(topic.id);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol
                      ios_icon_name={isFavorited ? "heart.fill" : "heart"}
                      android_material_icon_name={isFavorited ? "favorite" : "favorite-border"}
                      size={20}
                      color={isFavorited ? colors.primary : colors.textLight}
                    />
                  </TouchableOpacity>
                </View>
                <Text style={styles.cardTitle}>{topic.title}</Text>
                {topic.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {topic.description}
                  </Text>
                )}
                <View style={styles.cardFooter}>
                  <View style={styles.authorDateContainer}>
                    <Text style={styles.cardAuthor}>{authorName}</Text>
                    <Text style={styles.cardDate}> • {createdDate}</Text>
                  </View>
                  <View style={styles.replyCountContainer}>
                    <IconSymbol
                      ios_icon_name="bubble.left.fill"
                      android_material_icon_name="chat-bubble"
                      size={14}
                      color={colors.textLight}
                    />
                    <Text style={styles.replyCountText}>{replyCountValue}</Text>
                  </View>
                </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'android' ? spacing.xs : spacing.sm,
    gap: spacing.sm,
    height: Platform.OS === 'android' ? 40 : undefined,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: 0,
  },
  iconButton: {
    padding: spacing.xs,
  },
  iconButtonActive: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  requestButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  requestButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
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
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
    fontSize: 16,
    fontWeight: '600',
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 16,
    fontSize: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardAuthor: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  cardDate: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
  replyCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  replyCountText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
  },
});
