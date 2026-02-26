
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, RefreshControl, ActivityIndicator, Modal as RNModal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { CitySearchInput } from '@/components/CitySearchInput';

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
  location?: string;
  user: {
    id: string;
    name: string;
    username?: string;
  };
}

type SortOption = 'Default' | 'Newest' | 'Trending' | 'Oldest';

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [selectedCity, setSelectedCity] = useState<string>('Germany');
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('Default');
  const [showSortModal, setShowSortModal] = useState(false);

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
      
      let sortedTopics = [...data];
      
      // Apply sorting
      if (sortOption === 'Newest' || sortOption === 'Default') {
        sortedTopics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (sortOption === 'Trending') {
        sortedTopics.sort((a, b) => (b.replyCount || 0) - (a.replyCount || 0));
      } else if (sortOption === 'Oldest') {
        sortedTopics.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
      
      // Filter by city
      if (selectedCity !== 'Germany') {
        sortedTopics = sortedTopics.filter(t => t.location === selectedCity);
      }
      
      setTopics(sortedTopics);
    } catch (error: any) {
      console.error('CommunityScreen: Error fetching topics', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedStatus, sortOption, selectedCity]);

  const scrollViewRef = React.useRef<ScrollView>(null);

  useFocusEffect(
    React.useCallback(() => {
      console.log('CommunityScreen: Screen focused, refreshing topics');
      fetchTopics();
    }, [fetchTopics])
  );

  // Auto-scroll to unread post when topics are loaded
  useEffect(() => {
    if (topics.length > 0 && scrollViewRef.current && user?.id) {
      const unreadPostIndex = topics.findIndex(t => t.userId === user.id && (t.unreadRepliesCount || 0) > 0);
      if (unreadPostIndex !== -1) {
        // Scroll to unread post after a short delay to ensure layout is complete
        setTimeout(() => {
          const scrollY = Math.max(0, unreadPostIndex * 180 - 100);
          scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
        }, 500);
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

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
    setShowCityPicker(false);
  };

  const handleSortSelect = (option: SortOption) => {
    setSortOption(option);
    setShowSortModal(false);
  };

  const categories = ['Visa', 'Insurance', 'Housing', 'Jobs', 'Healthcare', 'Banking', 'Education', 'General'];

  const filteredTopics = topics;

  const sortDisplayText = sortOption === 'Default' ? 'Newest' : sortOption;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Community</Text>
        <View style={styles.pageHeaderRight}>
          <TouchableOpacity style={styles.locationButton} onPress={() => setShowCityPicker(true)}>
            <IconSymbol
              ios_icon_name="location.fill"
              android_material_icon_name="location-on"
              size={16}
              color={colors.text}
            />
            <Text style={styles.locationButtonText}>{selectedCity}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sortButton} onPress={() => setShowSortModal(true)}>
            <IconSymbol
              ios_icon_name="arrow.up.arrow.down"
              android_material_icon_name="sort"
              size={16}
              color={colors.text}
            />
            <Text style={styles.sortButtonText}>{sortDisplayText}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.header}>
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
              const locationDisplay = topic.location || 'Germany';
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
                      <Text style={styles.dateSeparator}> • </Text>
                      <Text style={styles.locationText}>{locationDisplay}</Text>
                    </View>
                    <View style={styles.replyCountContainer}>
                      <IconSymbol
                        ios_icon_name="bubble.left"
                        android_material_icon_name="chat-bubble-outline"
                        size={16}
                        color={colors.textLight}
                      />
                      <Text style={styles.replyCountText}>{replyCount}</Text>
                      {hasUnreadReplies && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{topic.unreadRepliesCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* City Picker Modal */}
      <RNModal
        visible={showCityPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <IconSymbol
                  ios_icon_name="xmark"
                  android_material_icon_name="close"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
            <CitySearchInput
              value={selectedCity}
              onChangeText={handleCitySelect}
              placeholder="Search city..."
            />
          </View>
        </View>
      </RNModal>

      {/* Sort Modal */}
      <RNModal
        visible={showSortModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowSortModal(false)}
        >
          <View style={styles.sortModalContent}>
            <Text style={styles.sortModalTitle}>Sort by</Text>
            {(['Default', 'Newest', 'Trending', 'Oldest'] as SortOption[]).map((option) => {
              const isSelected = sortOption === option;
              const displayText = option === 'Default' ? 'Default (Newest)' : option;
              return (
                <TouchableOpacity
                  key={option}
                  style={[styles.sortOption, isSelected && styles.sortOptionSelected]}
                  onPress={() => handleSortSelect(option)}
                >
                  <Text style={[styles.sortOptionText, isSelected && styles.sortOptionTextSelected]}>
                    {displayText}
                  </Text>
                  {isSelected && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </RNModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 26,
    marginLeft: 20,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  pageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationButtonText: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortButtonText: {
    ...typography.bodySmall,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: 2,
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
    flex: 1,
    flexWrap: 'wrap',
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
  locationText: {
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
  unreadBadge: {
    backgroundColor: colors.success,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  unreadBadgeText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    ...typography.h3,
    color: colors.text,
  },
  sortModalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  sortModalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortOptionSelected: {
    backgroundColor: colors.highlight,
  },
  sortOptionText: {
    ...typography.body,
    color: colors.text,
  },
  sortOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
