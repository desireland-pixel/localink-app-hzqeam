
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet } from '@/utils/api';

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
  user: {
    id: string;
    name: string;
  };
}

export default function CarryScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<CarryPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<any>(null);

  console.log('[CarryScreen] Rendering', { searchQuery, postsCount: posts.length });

  useEffect(() => {
    fetchPosts();
  }, [filters]);

  const fetchPosts = async () => {
    console.log('[CarryScreen] Fetching posts with filters:', filters);
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters?.fromCity) params.append('fromCity', filters.fromCity);
      if (filters?.toCity) params.append('toCity', filters.toCity);
      
      const queryString = params.toString();
      const endpoint = `/api/carry-posts${queryString ? `?${queryString}` : ''}`;
      
      const data = await authenticatedGet<CarryPost[]>(endpoint);
      console.log('[CarryScreen] Fetched posts:', data);
      setPosts(data || []);
    } catch (error) {
      console.error('[CarryScreen] Error fetching posts:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      post.title.toLowerCase().includes(query) ||
      post.fromCity.toLowerCase().includes(query) ||
      post.toCity.toLowerCase().includes(query) ||
      post.description?.toLowerCase().includes(query) ||
      post.itemDescription?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Flexible';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getTypeLabel = (type: string) => {
    return type === 'request' ? 'Request' : 'Traveler';
  };

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
            placeholder="Search by city..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            onPress={() => router.push('/carry-filters')} 
            style={styles.iconButton}
          >
            <IconSymbol 
              ios_icon_name="line.3.horizontal.decrease.circle" 
              android_material_icon_name="filter-list" 
              size={22} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => router.push('/post-carry')} 
            style={styles.addButton}
          >
            <IconSymbol 
              ios_icon_name="plus" 
              android_material_icon_name="add" 
              size={22} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {filteredPosts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>📦</Text>
              <Text style={styles.emptyTitle}>No ally matches found</Text>
              <Text style={styles.emptyText}>
                Post a request to find the right fit!
              </Text>
              <TouchableOpacity 
                style={styles.emptyButton} 
                onPress={() => router.push('/post-carry')}
              >
                <Text style={styles.emptyButtonText}>Request</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredPosts.map((post) => {
              const typeLabel = getTypeLabel(post.type);
              const dateText = formatDate(post.travelDate);
              
              return (
                <TouchableOpacity
                  key={post.id}
                  style={styles.postCard}
                  onPress={() => router.push(`/carry/${post.id}`)}
                >
                  <View style={styles.postHeader}>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{typeLabel}</Text>
                    </View>
                  </View>
                  {post.description && (
                    <Text style={styles.postDescription} numberOfLines={2}>
                      {post.description}
                    </Text>
                  )}
                  {post.itemDescription && (
                    <View style={styles.itemContainer}>
                      <Text style={styles.itemLabel}>Item:</Text>
                      <Text style={styles.itemText}>{post.itemDescription}</Text>
                    </View>
                  )}
                  <View style={styles.postRoute}>
                    <Text style={styles.postCity}>{post.fromCity}</Text>
                    <IconSymbol 
                      ios_icon_name="arrow.right" 
                      android_material_icon_name="arrow-forward" 
                      size={16} 
                      color={colors.textSecondary} 
                    />
                    <Text style={styles.postCity}>{post.toCity}</Text>
                  </View>
                  <View style={styles.postFooter}>
                    <View style={styles.postDate}>
                      <IconSymbol 
                        ios_icon_name="calendar" 
                        android_material_icon_name="calendar-today" 
                        size={14} 
                        color={colors.textSecondary} 
                      />
                      <Text style={styles.postDateText}>{dateText}</Text>
                    </View>
                    <View style={styles.postAuthor}>
                      <IconSymbol 
                        ios_icon_name="person.fill" 
                        android_material_icon_name="person" 
                        size={14} 
                        color={colors.textSecondary} 
                      />
                      <Text style={styles.postAuthorName}>{post.user.name}</Text>
                    </View>
                  </View>
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
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  postCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  postTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.sm,
  },
  typeBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  postDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  itemContainer: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.xs,
  },
  itemText: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
  },
  postRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  postCity: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  postDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postDateText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  postAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  postAuthorName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
