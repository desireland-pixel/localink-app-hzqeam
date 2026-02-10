
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';

interface Sublet {
  id: string;
  userId: string;
  title: string;
  description?: string;
  city: string;
  availableFrom: string;
  availableTo: string;
  rent?: string;
  type: 'offering' | 'seeking';
  imageUrls?: string[];
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export default function SubletScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  console.log('SubletScreen: Rendering', { subletsCount: sublets.length, loading });

  useEffect(() => {
    fetchPosts();
    fetchFavorites();
  }, [params.filters]);

  const fetchPosts = async () => {
    console.log('SubletScreen: Fetching sublets');
    setLoading(true);
    try {
      const filterParams = params.filters ? `?${params.filters}` : '';
      const data = await authenticatedGet<Sublet[]>(`/api/sublets${filterParams}`);
      console.log('SubletScreen: Fetched sublets', data);
      setSublets(data);
    } catch (error) {
      console.error('SubletScreen: Error fetching sublets', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      // TODO: Backend Integration - GET /api/favorites → [{ id, postId, postType, createdAt }]
      console.log('SubletScreen: Fetching favorites');
      const data = await authenticatedGet<Array<{ postId: string; postType: string }>>('/api/favorites');
      const subletFavorites = data.filter(f => f.postType === 'sublet').map(f => f.postId);
      setFavorites(new Set(subletFavorites));
    } catch (error) {
      console.error('SubletScreen: Error fetching favorites', error);
    }
  };

  const toggleFavorite = async (postId: string) => {
    console.log('SubletScreen: Toggle favorite', postId);
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
        // TODO: Backend Integration - DELETE /api/favorites/:postId?postType=sublet → { success: true }
        await authenticatedDelete(`/api/favorites/${postId}?postType=sublet`, {});
      } else {
        // TODO: Backend Integration - POST /api/favorites with { postId, postType: 'sublet' } → { success: true, favorite }
        await authenticatedPost('/api/favorites', { postId, postType: 'sublet' });
      }
    } catch (error) {
      console.error('SubletScreen: Error toggling favorite', error);
      // Revert on error
      setFavorites(favorites);
    }
  };

  const onRefresh = () => {
    console.log('SubletScreen: Refreshing');
    setRefreshing(true);
    fetchPosts();
    fetchFavorites();
  };

  const handlePostSublet = () => {
    console.log('SubletScreen: Navigate to post sublet');
    router.push('/post-sublet');
  };

  const handleFilters = () => {
    console.log('SubletScreen: Navigate to filters');
    router.push('/sublet-filters');
  };

  const filteredSublets = sublets.filter(sublet =>
    sublet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sublet.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sublet.description && sublet.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
            placeholder="Search sublets..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleFilters}>
          <IconSymbol
            ios_icon_name="line.3.horizontal.decrease.circle"
            android_material_icon_name="filter-list"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={handlePostSublet}>
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
      ) : filteredSublets.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>No sublet matches found</Text>
          <Text style={styles.emptySubtitle}>Post a request to reach hosts directly!</Text>
          <TouchableOpacity style={styles.requestButton} onPress={handlePostSublet}>
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
          {filteredSublets.map((sublet) => {
            const fromDisplay = formatDateToDDMMYYYY(sublet.availableFrom);
            const toDisplay = formatDateToDDMMYYYY(sublet.availableTo);
            const label = sublet.type === 'offering' ? 'Offering' : 'Seeking';
            const hasImage = sublet.imageUrls && sublet.imageUrls.length > 0;
            const isFavorited = favorites.has(sublet.id);
            
            return (
              <TouchableOpacity
                key={sublet.id}
                style={styles.card}
                onPress={() => router.push(`/sublet/${sublet.id}`)}
              >
                <View style={styles.cardContent}>
                  <View style={styles.imageContainer}>
                    {hasImage ? (
                      <Image source={{ uri: sublet.imageUrls![0] }} style={styles.cardImage} />
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
                  </View>
                  <View style={styles.cardTextContent}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{sublet.title}</Text>
                      <TouchableOpacity 
                        style={styles.likeButton}
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavorite(sublet.id);
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
                    <View style={styles.typeTag}>
                      <Text style={styles.typeTagText}>{label}</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <Text style={styles.cardInfoText}>{sublet.city}</Text>
                      <Text style={styles.cardInfoText}>•</Text>
                      <Text style={styles.cardInfoText}>{fromDisplay}</Text>
                      <Text style={styles.cardInfoText}>-</Text>
                      <Text style={styles.cardInfoText}>{toDisplay}</Text>
                    </View>
                    {sublet.rent && (
                      <Text style={styles.cardRent}>€{sublet.rent}/month</Text>
                    )}
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
  cardContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  imageContainer: {
    width: 80,
    height: 80,
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
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  likeButton: {
    padding: spacing.xs,
  },
  typeTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  typeTagText: {
    ...typography.bodySmall,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  cardInfoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cardRent: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});
