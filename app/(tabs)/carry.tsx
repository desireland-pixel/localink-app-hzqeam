
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';

interface CarryPost {
  id: string;
  userId: string;
  title: string;
  description?: string;
  fromCity: string;
  toCity: string;
  travelDate?: string;
  type: 'request' | 'traveler';
  itemDescription?: string;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
}

export default function CarryScreen() {
  const router = useRouter();
  const [posts, setPosts] = useState<CarryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  console.log('CarryScreen: Rendering', { postsCount: posts.length, loading });

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    console.log('CarryScreen: Fetching carry posts');
    setLoading(true);
    try {
      const data = await authenticatedGet<CarryPost[]>('/api/carry-posts');
      console.log('CarryScreen: Fetched carry posts', data);
      setPosts(data);
    } catch (error) {
      console.error('CarryScreen: Error fetching carry posts', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    console.log('CarryScreen: Refreshing');
    setRefreshing(true);
    fetchPosts();
  };

  const travelDateDisplay = (dateString: string | undefined) => {
    if (!dateString) return '';
    return formatDateToDDMMYYYY(dateString);
  };

  const typeLabel = (type: string) => {
    if (type === 'request') return 'Request';
    if (type === 'traveler') return 'Traveler';
    return type;
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.fromCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.toCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.description && post.description.toLowerCase().includes(searchQuery.toLowerCase()))
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
            placeholder="Search carry posts..."
            placeholderTextColor={colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/carry-filters')}
        >
          <IconSymbol
            ios_icon_name="line.3.horizontal.decrease.circle"
            android_material_icon_name="filter-list"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => router.push('/post-carry')}
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
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No ally matches found</Text>
          <Text style={styles.emptySubtitle}>Post a request to find the right fit!</Text>
          <TouchableOpacity
            style={styles.requestButton}
            onPress={() => router.push('/post-carry')}
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
            const dateDisplay = travelDateDisplay(post.travelDate);
            const label = typeLabel(post.type);
            const authorName = post.user?.name || 'Unknown';
            
            return (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                onPress={() => router.push(`/carry/${post.id}`)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{post.title}</Text>
                  <TouchableOpacity style={styles.likeButton}>
                    <IconSymbol
                      ios_icon_name="heart"
                      android_material_icon_name="favorite-border"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.typeTag}>
                  <Text style={styles.typeTagText}>{label}</Text>
                </View>
                {post.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {post.description}
                  </Text>
                )}
                <View style={styles.cardInfo}>
                  <Text style={styles.cardInfoText}>{post.fromCity}</Text>
                  <Text style={styles.cardInfoText}>→</Text>
                  <Text style={styles.cardInfoText}>{post.toCity}</Text>
                  {dateDisplay && (
                    <>
                      <Text style={styles.cardInfoText}>•</Text>
                      <Text style={styles.cardInfoText}>{dateDisplay}</Text>
                    </>
                  )}
                </View>
                <Text style={styles.cardAuthor}>Posted by {authorName}</Text>
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
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
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
  cardAuthor: {
    ...typography.bodySmall,
    color: colors.textLight,
  },
});
