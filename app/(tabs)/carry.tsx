
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl, Modal as RNModal, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete, apiGet } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { useAuth } from '@/contexts/AuthContext';

interface CommunityTopic {
  id: string;
  userId: string;
  category: string;
  title: string;
  description?: string;
  status: 'open' | 'closed';
  location?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    username?: string;
  };
  replyCount?: number;
  repliesCount?: number | string;
  unreadRepliesCount?: number;
  lastReplyDate?: string;
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

type SortOption = 'Newest' | 'Trending' | 'Oldest';

export default function CommunityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, fetchCommunityUnreadCount } = useAuth();
  const [topics, setTopics] = useState<CommunityTopic[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    // Initialize city from params if available (preserved from filter page navigation)
    return typeof params.city === 'string' ? params.city : '';
  });
  const [cityInputValue, setCityInputValue] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const sortButtonRef = useRef<View>(null);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const scrollViewRef = useRef<ScrollView>(null);
  const [topicLayouts, setTopicLayouts] = useState<{ id: string; y: number; height: number }[]>([]);

  // Sync city from params when navigating back from filter page
  React.useEffect(() => {
    const cityParam = typeof params.city === 'string' ? params.city : '';
    if (cityParam !== selectedCity) {
      console.log('CommunityScreen: Restoring city from params:', cityParam);
      setSelectedCity(cityParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.city]);

  console.log('CommunityScreen: Rendering', { topicsCount: topics.length, loading, selectedCity, sortOption });

  const fetchTopics = React.useCallback(async () => {
    console.log('CommunityScreen: Fetching community topics', { selectedCity, sortOption, filters: params.filters });
    if (topics.length === 0) {
      setLoading(true);
    }
    try {
      // Use /api/community-posts which supports city and sort params
      const queryParams = new URLSearchParams();
      queryParams.append('limit', '100');
      if (selectedCity) {
        queryParams.append('city', selectedCity);
      }
      // Map frontend sort options to backend sort values
      if (sortOption === 'Newest') {
        queryParams.append('sort', 'newest');
      } else if (sortOption === 'Trending') {
        queryParams.append('sort', 'trending');
      } else if (sortOption === 'Oldest') {
        queryParams.append('sort', 'oldest');
      }
      const data = await authenticatedGet<CommunityTopic[]>(`/api/community-posts?${queryParams.toString()}`);
      console.log('CommunityScreen: Fetched community topics', data);
      const dataArray = Array.isArray(data) ? data : [];

      // Fetch unread reply counts for own topics
      const ownTopics = dataArray.filter(t => t.userId === user?.id);
      if (ownTopics.length > 0) {
        const unreadResults = await Promise.allSettled(
          ownTopics.map(t =>
            authenticatedGet<{ unreadCount: number }>(`/api/community/topics/${t.id}/unread-replies`)
          )
        );
        ownTopics.forEach((t, idx) => {
          const result = unreadResults[idx];
          if (result.status === 'fulfilled') {
            t.unreadRepliesCount = result.value.unreadCount;
          }
        });
      }

      setTopics(dataArray);
    } catch (error) {
      console.error('CommunityScreen: Error fetching community topics', error);
      if (topics.length === 0) {
        setTopics([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [topics.length, user?.id, selectedCity, sortOption]);

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

  // Compute filtered topics based on carry-filters params and search query
  const filteredTopics = useMemo(() => {
    let filtered = topics;

    // Apply carry-filters page filters (category, status) - independent from city
    if (params.filters) {
      const filterString = params.filters as string;
      const urlFilterParams = new URLSearchParams(filterString);
      const category = urlFilterParams.get('category');
      const status = urlFilterParams.get('status');
      if (category) {
        filtered = filtered.filter(t => t.category === category);
      }
      if (status) {
        filtered = filtered.filter(t => t.status === status);
      }
    }

    // Apply search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [topics, params.filters, searchQuery]);

  useEffect(() => {
    fetchTopics();
    fetchFavorites();
  }, [selectedCity, sortOption]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('CommunityScreen: Screen focused, refreshing topics');
      fetchTopics();
      fetchFavorites();
      fetchCommunityUnreadCount();
    }, [fetchTopics, fetchFavorites, fetchCommunityUnreadCount])
  );

  // Auto-scroll to user's post with new comments when topics are loaded
  useEffect(() => {
    if (topics.length > 0 && scrollViewRef.current && user?.id && topicLayouts.length > 0) {
      // Find the first post by the user that has unread replies
      const unreadPostIndex = topics.findIndex(t => t.userId === user.id && (t.unreadRepliesCount ?? 0) > 0);
      
      if (unreadPostIndex !== -1) {
        const unreadPost = topics[unreadPostIndex];
        console.log('CommunityScreen: Found unread post at index', unreadPostIndex, 'with ID', unreadPost.id);
        
        // Find the layout for this post
        const targetLayout = topicLayouts.find(layout => layout.id === unreadPost.id);
        
        if (targetLayout) {
          // Delay to ensure layout is complete
          setTimeout(() => {
            const scrollY = Math.max(0, targetLayout.y - 50); // 50px offset from top
            console.log('CommunityScreen: Auto-scrolling to position', scrollY);
            scrollViewRef.current?.scrollTo({ y: scrollY, animated: true });
          }, 300);
        }
      }
    }
  }, [topics, user?.id, topicLayouts]);

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

  const handleCityInputChange = async (text: string) => {
    setCityInputValue(text);
    if (text.trim().length > 0) {
      try {
        const response = await apiGet<{ cities: string[] }>(`/api/cities/search?q=${encodeURIComponent(text)}&limit=8`);
        
        // Pin Germany for first 3 characters typed
        let suggestions = response.cities;
        const textLength = text.trim().length;
        if (textLength >= 1 && textLength <= 3) {
          // Remove Germany from its current position if it exists
          suggestions = suggestions.filter(city => city.toLowerCase() !== 'germany');
          // Add Germany at the beginning
          suggestions = ['Germany', ...suggestions];
        }
        
        setCitySuggestions(suggestions);
        setShowCitySuggestions(suggestions.length > 0);
      } catch (error) {
        console.error('CommunityScreen: Error searching cities:', error);
        setCitySuggestions([]);
        setShowCitySuggestions(false);
      }
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  const handleCitySelect = (city: string) => {
    console.log('CommunityScreen: City selected:', city);
    setSelectedCity(city);
    setCityInputValue('');
    setShowCitySuggestions(false);
    Keyboard.dismiss();
  };

  const handleClearCity = () => {
    console.log('CommunityScreen: Clear city selection');
    setSelectedCity('');
    setCityInputValue('');
    setShowCitySuggestions(false);
  };

  const handleSortPress = () => {
    sortButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setSortButtonLayout({ x: pageX, y: pageY, width, height });
      setShowSortModal(true);
    });
  };

  const handleSortSelect = (option: SortOption) => {
    setSortOption(option);
    setShowSortModal(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Page Header: Community | City | Sort */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Community</Text>
        <View style={styles.pageHeaderCenter}>
          <View style={styles.cityButtonContainer}>
            {!selectedCity ? (
              <View style={styles.cityInputWrapper}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="location-on"
                  size={14}
                  color={colors.text}
                />
                <TextInput
                  style={styles.cityInput}
                  placeholder="Location"
                  placeholderTextColor={colors.textSecondary}
                  value={cityInputValue}
                  onChangeText={handleCityInputChange}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            ) : (
              <View style={styles.citySelectedContainer}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="location-on"
                  size={14}
                  color={colors.text}
                />
                <Text style={styles.citySelectedText} numberOfLines={1}>{selectedCity}</Text>
                <TouchableOpacity onPress={handleClearCity} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <IconSymbol
                    ios_icon_name="xmark"
                    android_material_icon_name="close"
                    size={14}
                    color={colors.text}
                  />
                </TouchableOpacity>
              </View>
            )}
            {showCitySuggestions && citySuggestions.length > 0 && (
              <View style={styles.citySuggestionsContainer}>
                <ScrollView
                  style={styles.citySuggestionsList}
                  keyboardShouldPersistTaps="always"
                  nestedScrollEnabled={true}
                >
                  {citySuggestions.map((city, index) => (
                    <TouchableOpacity
                      key={`${city}-${index}`}
                      style={styles.citySuggestionItem}
                      onPress={() => handleCitySelect(city)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.citySuggestionText} numberOfLines={1}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
          <View ref={sortButtonRef} collapsable={false}>
            <TouchableOpacity style={styles.sortButton} onPress={handleSortPress}>
              <IconSymbol
                ios_icon_name="arrow.up.arrow.down"
                android_material_icon_name="sort"
                size={12}
                color={colors.text}
              />
              <Text style={styles.sortButtonText}>{sortOption}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
            placeholder="Search community..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.iconButton, (params.filters && params.filters.toString().length > 0) && styles.iconButtonActive]}
          onPress={() => {
            console.log('CommunityScreen: Navigate to community filters');
            router.push({
              pathname: '/community-filters',
              params: { filters: params.filters || '', city: selectedCity }
            });
          }}
        >
          <IconSymbol
            ios_icon_name="line.3.horizontal.decrease.circle"
            android_material_icon_name="filter-list"
            size={24}
            color={(params.filters && params.filters.toString().length > 0) ? colors.primary : colors.text}
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

      <View style={styles.separator} />

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
          ref={scrollViewRef}
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
            const isOwnPost = topic.userId === user?.id;
            const locationDisplay = topic.location || 'Germany';
            const hasUnreadReplies = isOwnPost && (topic.unreadRepliesCount ?? 0) > 0;

            const categoryColor = CATEGORY_COLORS[topic.category] || CATEGORY_COLORS['General'];
            const categoryBackgroundColor = isOpen ? categoryColor.background : '#E5E7EB';
            const categoryTextColor = isOpen ? categoryColor.text : '#6B7280';

            // Use replyCount (from SQL query) if available, otherwise fall back to repliesCount
            const replyCountValue = topic.replyCount ?? (topic.repliesCount !== undefined ? parseInt(String(topic.repliesCount), 10) || 0 : 0);

            return (
              <TouchableOpacity
                key={topic.id}
                style={[styles.card, hasUnreadReplies && styles.cardUnread]}
                onPress={() => {
                  console.log('CommunityScreen: View topic', topic.id);
                  router.push(`/community/${topic.id}`);
                }}
                onLayout={(event) => {
                  const { y, height } = event.nativeEvent.layout;
                  setTopicLayouts(prev => {
                    const existing = prev.find(p => p.id === topic.id);
                    if (!existing || existing.y !== y || existing.height !== height) {
                      return [...prev.filter(p => p.id !== topic.id), { id: topic.id, y, height }];
                    }
                    return prev;
                  });
                }}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: categoryBackgroundColor }]}>
                    <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>{topic.category}</Text>
                  </View>
                  <View style={styles.rightHeaderSection}>
                    {!isOpen && (
                      <View style={styles.closedBadge}>
                        <Text style={styles.closedBadgeText}>Closed</Text>
                      </View>
                    )}
                    {!isOwnPost && (
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
                    )}
                  </View>
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
                    <Text style={styles.cardDate}> • {locationDisplay}</Text>
                  </View>
                  <View style={styles.replyCountContainer}>
                    {hasUnreadReplies && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadBadgeText}>{topic.unreadRepliesCount}</Text>
                      </View>
                    )}
                    {Platform.select({
                      ios: (
                        <IconSymbol
                          ios_icon_name="bubble.right"
                          android_material_icon_name="chat-bubble"
                          size={14}
                          color={colors.textLight}
                        />
                      ),
                      android: (
                        <View style={{ transform: [{ scaleX: -1 }] }}>
                          <IconSymbol
                            ios_icon_name="bubble.right"
                            android_material_icon_name="chat-bubble-outline"
                            size={14}
                            color={colors.textLight}
                          />
                        </View>
                      ),
                      default: (
                        <IconSymbol
                          ios_icon_name="bubble.right"
                          android_material_icon_name="chat-bubble"
                          size={14}
                          color={colors.textLight}
                        />
                      ),
                    })}
                    <Text style={styles.replyCountText}>{replyCountValue}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Sort Modal */}
      <RNModal
        visible={showSortModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowSortModal(false)}
      >
        <TouchableOpacity
          style={styles.sortModalOverlay}
          activeOpacity={1}
          onPress={() => setShowSortModal(false)}
        >
          <View
            style={[
              styles.sortModalContent,
              {
                position: 'absolute',
                top: sortButtonLayout.y + sortButtonLayout.height + 4,
                right: 16,
              }
            ]}
          >
            {(['Newest', 'Trending', 'Oldest'] as SortOption[]).map((option, index, array) => {
              const isSelected = sortOption === option;
              const isLast = index === array.length - 1;
              return (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.sortOption,
                    isSelected && styles.sortOptionSelected,
                    isLast && styles.sortOptionLast
                  ]}
                  onPress={() => handleSortSelect(option)}
                >
                  <Text style={[styles.sortOptionText, isSelected && styles.sortOptionTextSelected]}>
                    {option}
                  </Text>
                  {isSelected && (
                    <IconSymbol
                      ios_icon_name="checkmark"
                      android_material_icon_name="check"
                      size={18}
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
  },
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    minHeight: 24,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  pageHeaderCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    pointerEvents: 'box-none',
  },
  pageHeaderRight: {
    marginLeft: 'auto',
    zIndex: 2,
  },
  cityButtonContainer: {
    position: 'relative',
    minWidth: 120,
    maxWidth: 200,
  },
  cityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 28,
    borderWidth: 0,
  },
  cityInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
    paddingVertical: 0,
    minWidth: 72,
  },
  citySelectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 28,
    borderWidth: 0,
  },
  citySelectedText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
    flex: 1,
  },
  citySuggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1001,
  },
  citySuggestionsList: {
    maxHeight: 200,
  },
  citySuggestionItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  citySuggestionText: {
    ...typography.body,
    color: colors.text,
    fontSize: 12,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 28,
    justifyContent: 'center',
    borderWidth: 0,
  },
  sortButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    gap: spacing.sm,
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
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 0,
    marginTop: 2,
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
    marginHorizontal: 0,
  },
  cardUnread: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  rightHeaderSection: {
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
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 4,
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
  unreadBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sortModalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortOptionLast: {
    borderBottomWidth: 0,
  },
  sortOptionSelected: {
    backgroundColor: colors.highlight,
  },
  sortOptionText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  sortOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
});
