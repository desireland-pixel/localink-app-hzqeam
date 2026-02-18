
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';

interface TravelPost {
  id: string;
  userId: string;
  title?: string;
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate: string;
  type: 'seeking' | 'offering' | 'seeking-ally';
  companionshipFor?: string;
  travelDateTo?: string;
  canOfferCompanionship?: boolean;
  canCarryItems?: boolean;
  item?: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username?: string;
  };
}

export default function TravelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [posts, setPosts] = useState<TravelPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  console.log('TravelScreen: Rendering', { postsCount: posts.length, loading });

  useEffect(() => {
    fetchPosts();
    fetchFavorites();
  }, [params.filters]);

  const fetchPosts = async () => {
    console.log('TravelScreen: Fetching travel posts');
    setLoading(true);
    try {
      const filterParams = params.filters ? `?${params.filters}` : '';
      const data = await authenticatedGet<TravelPost[]>(`/api/travel-posts${filterParams}`);
      console.log('TravelScreen: Fetched travel posts', data);
      // Ensure data is an array before sorting
      const dataArray = Array.isArray(data) ? data : [];
      // Sort by createdAt descending (newest first)
      const sortedData = dataArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPosts(sortedData);
    } catch (error) {
      console.error('TravelScreen: Error fetching travel posts', error);
      setPosts([]); // Set empty array on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      console.log('TravelScreen: Fetching favorites');
      const data = await authenticatedGet<Array<{ postId: string; postType: string }>>('/api/favorites');
      const travelFavorites = data.filter(f => f.postType === 'travel').map(f => f.postId);
      setFavorites(new Set(travelFavorites));
    } catch (error) {
      console.error('TravelScreen: Error fetching favorites', error);
    }
  };

  const toggleFavorite = async (postId: string) => {
    console.log('TravelScreen: Toggle favorite', postId);
    const isFavorited = favorites.has(postId);
    
    // Optimistic update
    const newFavorites = new Set(favorites);
    if (isFavorited) {
      newFavorites.delete(postId);
    } else {
      newFavorites.add(postId);
    }
    setFavorites(newFavorites);

    try {
      if (isFavorited) {
        await authenticatedDelete(`/api/favorites/${postId}?postType=travel`, {});
      } else {
        await authenticatedPost('/api/favorites', { postId, postType: 'travel' });
      }
    } catch (error) {
      console.error('TravelScreen: Error toggling favorite', error);
      // Revert on error
      setFavorites(favorites);
    }
  };

  const onRefresh = () => {
    console.log('TravelScreen: Refreshing');
    setRefreshing(true);
    fetchPosts();
    fetchFavorites();
  };

  const filteredPosts = posts.filter(post =>
    post.fromCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.toCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.description && post.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  // Check if filters are active
  const hasActiveFilters = params.filters && params.filters.toString().length > 0;

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
            placeholder="Search travel posts..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.iconButton, hasActiveFilters && styles.iconButtonActive]}
          onPress={() => router.push({
            pathname: '/travel-filters',
            params: { filters: params.filters || '' }
          })}
        >
          <IconSymbol
            ios_icon_name="line.3.horizontal.decrease.circle"
            android_material_icon_name="filter-list"
            size={24}
            color={hasActiveFilters ? colors.primary : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/post-travel')}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>✈️</Text>
          <Text style={styles.emptyTitle}>No travel buddy matches found</Text>
          <Text style={styles.emptySubtitle}>Post a request to connect with others!</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => router.push('/post-travel')}
          >
            <Text style={styles.requestButtonText}>Request</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {filteredPosts.map((post) => {
            const dateDisplay = formatDateToDDMMYYYY(post.travelDate);
            const dateToDisplay = post.travelDateTo ? formatDateToDDMMYYYY(post.travelDateTo) : null;
            
            // Determine label and icons
            let label = '';
            let iconCompanionship = false;
            let iconAlly = false;
            
            if (post.type === 'offering') {
              label = 'Offering';
              const hasCompanionship = post.canOfferCompanionship;
              const hasCarry = post.canCarryItems;
              
              if (hasCompanionship && hasCarry) {
                iconCompanionship = true;
                iconAlly = true;
              } else if (hasCompanionship) {
                iconCompanionship = true;
              } else if (hasCarry) {
                iconAlly = true;
              } else {
                // If neither flag is set, show both as default
                iconCompanionship = true;
                iconAlly = true;
              }
            } else if (post.type === 'seeking') {
              label = 'Seeking';
              iconCompanionship = true;
            } else if (post.type === 'seeking-ally') {
              label = 'Seeking';
              iconAlly = true;
            }
            
            const authorName = post.user?.username || post.user?.name || 'Unknown';
            const createdDate = formatDateToDDMMYYYY(post.createdAt);
            const isFavorited = favorites.has(post.id);
            
            return (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                onPress={() => router.push(`/travel/${post.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.tagRow}>
                    {label && (
                      <View style={styles.typeTag}>
                        <Text style={styles.typeTagText}>{label}</Text>
                      </View>
                    )}
                    {iconCompanionship && (
                      <Text style={styles.iconText}>👥</Text>
                    )}
                    {iconCompanionship && iconAlly && (
                      <Text style={styles.iconSeparator}>, </Text>
                    )}
                    {iconAlly && (
                      <Text style={styles.iconText}>📦</Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.likeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(post.id);
                    }}
                  >
                    <IconSymbol
                      ios_icon_name={isFavorited ? "heart.fill" : "heart"}
                      android_material_icon_name={isFavorited ? "favorite" : "favorite-border"}
                      size={20}
                      color={isFavorited ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.routeContainer}>
                  <Text style={styles.routeText}>{post.fromCity}</Text>
                  <Text style={styles.routeArrow}>→</Text>
                  <Text style={styles.routeText}>{post.toCity}</Text>
                </View>
                {(dateDisplay || dateToDisplay) && (
                  <View style={styles.dateContainer}>
                    {dateDisplay && <Text style={styles.dateText}>{dateDisplay}</Text>}
                    {dateDisplay && dateToDisplay && <Text style={styles.dateSeparator}>-</Text>}
                    {dateToDisplay && <Text style={styles.dateText}>{dateToDisplay}</Text>}
                  </View>
                )}
                {post.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {post.description}
                  </Text>
                )}
                <View style={styles.authorDateRow}>
                  <Text style={styles.cardAuthor}>{authorName}</Text>
                  <Text style={styles.cardDate}> • {createdDate}</Text>
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
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    color: colors.text,
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
    borderRadius: borderRadius.md,
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
  },
  typeTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  typeTagText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  iconText: {
    fontSize: 16,
    lineHeight: 20,
  },
  iconSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  likeButton: {
    padding: spacing.xs,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  routeText: {
    ...typography.h3,
    color: colors.text,
  },
  routeArrow: {
    ...typography.h3,
    color: colors.textSecondary,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  dateSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  authorDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
