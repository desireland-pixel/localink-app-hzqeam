
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedDelete } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { IconSymbol } from '@/components/IconSymbol';

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
    user?: {
      id: string;
      name: string;
      username?: string;
    };
  };
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
      setFavorites(data);
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
              
              return (
                <TouchableOpacity
                  key={favorite.id}
                  style={styles.postCard}
                  onPress={() => handleViewPost(favorite.postId, favorite.postType)}
                >
                  {selectedTab === 'sublet' && (
                    <>
                      <View style={styles.cardHeader}>
                        <View style={styles.typeTag}>
                          <Text style={styles.typeTagText}>{post.type === 'offering' ? 'Offering' : 'Seeking'}</Text>
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
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
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
                    </>
                  )}
                  
                  {selectedTab === 'travel' && (
                    <>
                      <View style={styles.cardHeader}>
                        <View style={styles.tagRow}>
                          {post.type && (
                            <View style={styles.typeTag}>
                              <Text style={styles.typeTagText}>
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
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                      {post.user && (
                        <View style={styles.authorDateRow}>
                          <Text style={styles.authorText}>{post.user.username || post.user.name}</Text>
                          <Text style={styles.dateText}> • {formatDateToDDMMYYYY(favorite.createdAt)}</Text>
                        </View>
                      )}
                    </>
                  )}
                  
                  {selectedTab === 'community' && (
                    <>
                      <View style={styles.cardHeader}>
                        {post.category && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{post.category}</Text>
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
                        {post.status && (
                          <View style={[styles.statusBadge, { backgroundColor: post.status === 'open' ? colors.primary : '#9E9E9E' }]}>
                            <Text style={styles.statusBadgeText}>{post.status === 'open' ? 'Open' : 'Closed'}</Text>
                          </View>
                        )}
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
    fontSize: 14,
  },
  categoryBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  categoryBadgeText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  likeButton: {
    padding: spacing.xs,
  },
  postTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  postDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    lineHeight: 20,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  dateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
  },
  dateSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  statusBadgeText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
});
