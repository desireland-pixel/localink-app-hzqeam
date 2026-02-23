
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedDelete } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';

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

interface FavoritePost {
  id: string;
  postId: string;
  postType: 'sublet' | 'travel' | 'community';
  createdAt: string;
  post: {
    id: string;
    title?: string;
    description?: string;
    city?: string;
    fromCity?: string;
    toCity?: string;
    availableFrom?: string;
    availableTo?: string;
    travelDate?: string;
    travelDateTo?: string;
    rent?: string;
    type?: string;
    imageUrls?: string[];
    category?: string;
    status?: string;
    canOfferCompanionship?: boolean;
    canCarryItems?: boolean;
    incentiveAmount?: number;
    item?: string;
    companionshipFor?: string;
    user?: {
      id: string;
      name: string;
      username?: string;
    };
  } | null;
}

export default function FavouritesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'sublet' | 'travel' | 'community'>('sublet');
  const [favorites, setFavorites] = useState<FavoritePost[]>([]);
  const [error, setError] = useState('');

  console.log('FavouritesScreen: Rendering', { selectedTab, favoritesCount: favorites.length });

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    console.log('FavouritesScreen: Fetching favorites');
    setLoading(true);
    try {
      const data = await authenticatedGet<FavoritePost[]>('/api/favorites');
      console.log('FavouritesScreen: Fetched favorites', data);
      // Filter out favorites with null posts
      const validFavorites = data.filter(f => f.post !== null && f.post !== undefined);
      setFavorites(validFavorites);
    } catch (error: any) {
      console.error('FavouritesScreen: Error fetching favorites', error);
      setError(error.message || 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('FavouritesScreen: Refreshing favorites');
    setRefreshing(true);
    await fetchFavorites();
    setRefreshing(false);
  };

  const handleRemoveFavorite = async (postId: string, postType: string) => {
    console.log('FavouritesScreen: Removing favorite', { postId, postType });
    
    // Optimistic update
    setFavorites(favorites.filter(f => f.postId !== postId));
    
    try {
      await authenticatedDelete(`/api/favorites/${postId}?postType=${postType}`, {});
    } catch (error: any) {
      console.error('FavouritesScreen: Error removing favorite', error);
      // Revert on error
      await fetchFavorites();
    }
  };

  const handleViewPost = (postId: string, postType: string) => {
    console.log('FavouritesScreen: View post', { postId, postType });
    if (postType === 'sublet') {
      router.push(`/sublet/${postId}`);
    } else if (postType === 'travel') {
      router.push(`/travel/${postId}`);
    } else if (postType === 'community') {
      router.push(`/carry/${postId}`);
    }
  };

  const filteredFavorites = favorites.filter(f => f.postType === selectedTab);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'sublet' && styles.tabActive]}
          onPress={() => setSelectedTab('sublet')}
        >
          <Text style={[styles.tabText, selectedTab === 'sublet' && styles.tabTextActive]}>
            Sublet
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'travel' && styles.tabActive]}
          onPress={() => setSelectedTab('travel')}
        >
          <Text style={[styles.tabText, selectedTab === 'travel' && styles.tabTextActive]}>
            Travel
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'community' && styles.tabActive]}
          onPress={() => setSelectedTab('community')}
        >
          <Text style={[styles.tabText, selectedTab === 'community' && styles.tabTextActive]}>
            Community
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {filteredFavorites.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>❤️</Text>
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyText}>Your favorite {selectedTab} posts will appear here</Text>
            </View>
          ) : (
            filteredFavorites.map((favorite) => {
              const post = favorite.post;
              
              // Safety check - skip if post is null
              if (!post) {
                console.warn('FavouritesScreen: Skipping favorite with null post', favorite.id);
                return null;
              }
              
              return (
                <TouchableOpacity
                  key={favorite.id}
                  style={styles.postCard}
                  onPress={() => handleViewPost(favorite.postId, favorite.postType)}
                >
                  {selectedTab === 'sublet' && (
                    <>
                      <View style={styles.cardHeader}>
                        <View style={[styles.typeTag, { backgroundColor: post.type === 'offering' ? '#D1FAE5' : '#DBEAFE' }]}>
                          <Text style={[styles.typeTagText, { color: post.type === 'offering' ? '#065F46' : '#1E40AF' }]}>
                            {post.type === 'offering' ? 'Offering' : 'Seeking'}
                          </Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.likeButton}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveFavorite(favorite.postId, favorite.postType);
                          }}
                        >
                          <IconSymbol
                            ios_icon_name="heart.fill"
                            android_material_icon_name="favorite"
                            size={20}
                            color={colors.primary}
                          />
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      <View style={styles.postInfo}>
                        <Text style={styles.postInfoText}>{post.city}</Text>
                        {post.rent && (
                          <>
                            <Text style={styles.postInfoText}>•</Text>
                            <Text style={styles.postInfoText}>€{post.rent}/month</Text>
                          </>
                        )}
                      </View>
                      {(post.availableFrom || post.availableTo) && (
                        <View style={styles.dateRow}>
                          {post.availableFrom && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.availableFrom)}</Text>}
                          {post.availableFrom && post.availableTo && <Text style={styles.dateSeparator}>-</Text>}
                          {post.availableTo && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.availableTo)}</Text>}
                        </View>
                      )}
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                    </>
                  )}
                  
                  {selectedTab === 'travel' && (
                    <>
                      <View style={styles.cardHeader}>
                        <View style={styles.tagRow}>
                          {post.type && (
                            <View style={[styles.typeTag, { backgroundColor: post.type === 'offering' ? '#D1FAE5' : '#DBEAFE' }]}>
                              <Text style={[styles.typeTagText, { color: post.type === 'offering' ? '#065F46' : '#1E40AF' }]}>
                                {post.type === 'offering' ? 'Offering' : 'Seeking'}
                              </Text>
                            </View>
                          )}
                          {post.type === 'offering' && (
                            <Text style={styles.iconText}>
                              {post.canOfferCompanionship && post.canCarryItems ? '👥, 📦' : 
                               post.canOfferCompanionship ? '👥' : 
                               post.canCarryItems ? '📦' : '👥, 📦'}
                            </Text>
                          )}
                          {post.type === 'seeking' && <Text style={styles.iconText}>👥</Text>}
                          {post.type === 'seeking-ally' && <Text style={styles.iconText}>📦</Text>}
                        </View>
                        <View style={styles.rightSection}>
                          {post.incentiveAmount && post.incentiveAmount > 0 && (
                            <View style={styles.incentiveTag}>
                              <Text style={styles.incentiveTagText}>Incentive</Text>
                            </View>
                          )}
                          <TouchableOpacity 
                            style={styles.likeButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleRemoveFavorite(favorite.postId, favorite.postType);
                            }}
                          >
                            <IconSymbol
                              ios_icon_name="heart.fill"
                              android_material_icon_name="favorite"
                              size={20}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.routeContainer}>
                        <Text style={styles.routeText}>{post.fromCity}</Text>
                        <Text style={styles.routeArrow}>→</Text>
                        <Text style={styles.routeText}>{post.toCity}</Text>
                      </View>
                      {(post.travelDate || post.travelDateTo) && (
                        <View style={styles.dateRow}>
                          {post.travelDate && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.travelDate)}</Text>}
                          {post.travelDate && post.travelDateTo && <Text style={styles.dateSeparator}>-</Text>}
                          {post.travelDateTo && <Text style={styles.dateText}>{formatDateToDDMMYYYY(post.travelDateTo)}</Text>}
                        </View>
                      )}
                      {post.type === 'seeking-ally' && post.item && (
                        <View style={styles.itemContainer}>
                          <Text style={styles.itemLabel}>Item: </Text>
                          <Text style={styles.itemText}>{post.item}</Text>
                        </View>
                      )}
                      {post.type === 'seeking' && post.companionshipFor && (
                        <View style={styles.itemContainer}>
                          <Text style={styles.itemLabel}>For: </Text>
                          <Text style={styles.itemText}>{post.companionshipFor}</Text>
                        </View>
                      )}
                      {post.user && (
                        <View style={styles.authorDateRow}>
                          <Text style={styles.authorText}>{post.user.username || post.user.name}</Text>
                          <Text style={styles.dateText}> • {post.createdAt ? formatDateToDDMMYYYY(post.createdAt) : formatDateToDDMMYYYY(favorite.createdAt)}</Text>
                        </View>
                      )}
                    </>
                  )}
                  
                  {selectedTab === 'community' && (
                    <>
                      <View style={styles.cardHeader}>
                        {post.category && (() => {
                          const categoryColor = CATEGORY_COLORS[post.category] || CATEGORY_COLORS['General'];
                          const categoryBackgroundColor = post.status === 'closed' ? '#E5E7EB' : categoryColor.background;
                          const categoryTextColor = post.status === 'closed' ? '#6B7280' : categoryColor.text;
                          
                          return (
                            <View style={[styles.categoryBadge, { backgroundColor: categoryBackgroundColor }]}>
                              <Text style={[styles.categoryBadgeText, { color: categoryTextColor }]}>
                                {post.category}
                              </Text>
                            </View>
                          );
                        })()}
                        <View style={styles.rightSection}>
                          {post.status === 'closed' && (
                            <View style={styles.closedBadge}>
                              <Text style={styles.closedBadgeText}>Closed</Text>
                            </View>
                          )}
                          <TouchableOpacity 
                            style={styles.likeButton}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleRemoveFavorite(favorite.postId, 'community');
                            }}
                          >
                            <IconSymbol
                              ios_icon_name="heart.fill"
                              android_material_icon_name="favorite"
                              size={20}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.postTitle}>{post.title}</Text>
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                      <View style={styles.cardFooter}>
                        <View style={styles.authorDateRow}>
                          {post.user && (
                            <>
                              <Text style={styles.authorText}>{post.user.username || post.user.name}</Text>
                              <Text style={styles.dateText}> • {formatDateToDDMMYYYY(favorite.createdAt)}</Text>
                            </>
                          )}
                        </View>
                      </View>
                    </>
                  )}
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
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
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
  postCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
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
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeTagText: {
    ...typography.bodySmall,
    fontSize: 12,
    fontWeight: '600',
  },
  iconText: {
    fontSize: 16,
  },
  incentiveTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: 12,
  },
  incentiveTagText: {
    ...typography.bodySmall,
    color: '#6B21A8',
    fontSize: 12,
    fontWeight: '600',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  itemLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  itemText: {
    ...typography.bodySmall,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
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
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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
  postTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    fontSize: 16,
    fontWeight: '600',
  },
  postDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
    fontSize: 12,
  },
  postInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  postInfoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
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
    fontSize: 16,
    fontWeight: '600',
  },
  routeArrow: {
    ...typography.h3,
    color: colors.textSecondary,
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  dateSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
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
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
