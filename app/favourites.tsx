
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
  postType: 'sublet' | 'travel' | 'carry';
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
    rent?: string;
    type?: string;
    imageUrls?: string[];
  };
}

export default function FavouritesScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'sublet' | 'travel' | 'carry'>('sublet');
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
      // TODO: Backend Integration - GET /api/favorites → [{ id, postId, postType, createdAt, post: {...} }]
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
      // TODO: Backend Integration - DELETE /api/favorites/:postId?postType=... → { success: true }
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
    } else if (postType === 'carry') {
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
          style={[styles.tab, selectedTab === 'carry' && styles.tabActive]}
          onPress={() => setSelectedTab('carry')}
        >
          <Text style={[styles.tabText, selectedTab === 'carry' && styles.tabTextActive]}>
            Carry
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
                    <View style={styles.cardContent}>
                      {post.imageUrls && post.imageUrls.length > 0 ? (
                        <Image source={{ uri: post.imageUrls[0] }} style={styles.cardImage} />
                      ) : (
                        <View style={styles.imagePlaceholder}>
                          <IconSymbol
                            ios_icon_name="photo"
                            android_material_icon_name="image"
                            size={32}
                            color={colors.textLight}
                          />
                        </View>
                      )}
                      <View style={styles.cardTextContent}>
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
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
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
                  )}
                  
                  {selectedTab === 'travel' && (
                    <>
                      <View style={styles.cardHeader}>
                        <Text style={styles.postTitle} numberOfLines={1}>
                          {post.fromCity} → {post.toCity}
                        </Text>
                        <TouchableOpacity 
                          style={styles.removeButton}
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
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                      <View style={styles.postInfo}>
                        {post.travelDate && (
                          <Text style={styles.postInfoText}>
                            {formatDateToDDMMYYYY(post.travelDate)}
                          </Text>
                        )}
                      </View>
                    </>
                  )}
                  
                  {selectedTab === 'carry' && (
                    <>
                      <View style={styles.cardHeader}>
                        <Text style={styles.postTitle} numberOfLines={1}>{post.title}</Text>
                        <TouchableOpacity 
                          style={styles.removeButton}
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
                      {post.description && (
                        <Text style={styles.postDescription} numberOfLines={2}>
                          {post.description}
                        </Text>
                      )}
                      <View style={styles.postInfo}>
                        <Text style={styles.postInfoText}>{post.fromCity}</Text>
                        <Text style={styles.postInfoText}>→</Text>
                        <Text style={styles.postInfoText}>{post.toCity}</Text>
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
  postCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  imagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTextContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  postTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    flex: 1,
  },
  postDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  postInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  postInfoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  removeButton: {
    padding: spacing.xs,
  },
});
