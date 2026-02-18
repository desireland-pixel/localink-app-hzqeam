
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
    username?: string;
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

  console.log('SubletScreen: Rendering', { subletsCount: sublets.length, loading, filters: params.filters });

  useEffect(() => {
    fetchPosts();
    fetchFavorites();
  }, [params.filters]);

  // Auto-refresh when screen gains focus (after creating a post)
  useFocusEffect(
    React.useCallback(() => {
      console.log('SubletScreen: Screen focused, refreshing posts');
      fetchPosts();
      fetchFavorites();
    }, [params.filters])
  );

  const fetchPosts = async () => {
    console.log('SubletScreen: Fetching sublets with filters:', params.filters);
    setLoading(true);
    try {
      const filterParams = params.filters ? `?${params.filters}` : '';
      console.log('SubletScreen: API call with params:', filterParams);
      const data = await authenticatedGet<Sublet[]>(`/api/sublets${filterParams}`);
      console.log('SubletScreen: Fetched sublets', data);
      const dataArray = Array.isArray(data) ? data : [];
      const sortedData = dataArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSublets(sortedData);
    } catch (error) {
      console.error('SubletScreen: Error fetching sublets', error);
      setSublets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFavorites = async () => {
    try {
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
    
    const newFavorites = new Set(favorites);
    if (isFavorited) {
      newFavorites.delete(postId);
    } else {
      newFavorites.add(postId);
    }
    setFavorites(newFavorites);

    try {
      if (isFavorited) {
        await authenticatedDelete(`/api/favorites/${postId}?postType=sublet`, {});
      } else {
        await authenticatedPost('/api/favorites', { postId, postType: 'sublet' });
      }
    } catch (error) {
      console.error('SubletScreen: Error toggling favorite', error);
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
    console.log('SubletScreen: Navigate to filters with current filters:', params.filters);
    router.push({
      pathname: '/sublet-filters',
      params: { filters: params.filters || '' }
    });
  };
  
  const hasActiveFilters = params.filters && params.filters.toString().length > 0;

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
        <TouchableOpacity style={[styles.iconButton, hasActiveFilters && styles.iconButtonActive]} onPress={handleFilters}>
          <IconSymbol
            ios_icon_name="line.3.horizontal.decrease.circle"
            android_material_icon_name="filter-list"
            size={24}
            color={hasActiveFilters ? colors.primary : colors.text}
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
            const imageUrl = sublet.imageUrls?.[0];
            const isFavorited = favorites.has(sublet.id);
            
            return (
              <TouchableOpacity
                key={sublet.id}
                style={styles.card}
                onPress={() => router.push(`/sublet/${sublet.id}`)}
              >
                <View style={styles.cardContent}>
                  <View style={styles.leftColumn}>
                    <View style={styles.imageContainer}>
                      {imageUrl ? (
                        <Image 
                          source={{ uri: imageUrl }} 
                          style={styles.cardImage}
                          cachePolicy="disk"
                          contentFit="cover"
                        />
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
                    <View style={styles.typeTagContainer}>
                      <View style={styles.typeTag}>
                        <Text style={styles.typeTagText}>{label}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardTextContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{sublet.title}</Text>
                    <Text style={styles.cardCity}>{sublet.city}</Text>
                    {fromDisplay && toDisplay && (
                      <View style={styles.cardDateRow}>
                        <Text style={styles.cardDateText}>{fromDisplay}</Text>
                        <Text style={styles.cardDateSeparator}>-</Text>
                        <Text style={styles.cardDateText}>{toDisplay}</Text>
                      </View>
                    )}
                    {sublet.rent && (
                      <Text style={styles.cardRent}>€{sublet.rent}/month</Text>
                    )}
                  </View>
                  <TouchableOpacity 
                    style={styles.likeButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleFavorite(sublet.id);
                    }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <IconSymbol
                      ios_icon_name={isFavorited ? "heart.fill" : "heart"}
                      android_material_icon_name={isFavorited ? "favorite" : "favorite-border"}
                      size={20}
                      color={isFavorited ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
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
  cardContent: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  leftColumn: {
    alignItems: 'center',
  },
  imageContainer: {
    width: 80,
    height: 80,
    marginBottom: spacing.xs,
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
  typeTagContainer: {
    alignItems: 'center',
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
    fontSize: 10,
    fontWeight: '600',
  },
  cardTextContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardCity: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  cardDateText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cardDateSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  cardRent: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  likeButton: {
    padding: spacing.xs,
  },
});
