
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl, Modal as RNModal } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete } from '@/utils/api';
import { formatDateToDDMMYYYY } from '@/utils/cities';
import { useAuth } from '@/contexts/AuthContext';
import { CitySearchInput } from '@/components/CitySearchInput';

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
  incentiveAmount?: number;
  status: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username?: string;
  };
}

type SortOption = 'Newest' | 'Earliest departure' | 'Latest departure';

export default function TravelScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [posts, setPosts] = useState<TravelPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [selectedFrom, setSelectedFrom] = useState<string>('');
  const [selectedTo, setSelectedTo] = useState<string>('');
  const [fromSearchQuery, setFromSearchQuery] = useState('');
  const [toSearchQuery, setToSearchQuery] = useState('');
  const sortButtonRef = useRef<View>(null);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  console.log('TravelScreen: Rendering', { postsCount: posts.length, loading });

  const fetchPosts = React.useCallback(async () => {
    console.log('TravelScreen: Fetching travel posts', 'selectedFrom:', selectedFrom, 'selectedTo:', selectedTo);
    if (posts.length === 0) {
      setLoading(true);
    }
    try {
      let filterParams = params.filters ? `?${params.filters}` : '';
      
      // Add from/to city filters if selected
      if (selectedFrom) {
        const fromParam = `fromCity=${encodeURIComponent(selectedFrom)}`;
        filterParams = filterParams ? `${filterParams}&${fromParam}` : `?${fromParam}`;
      }
      if (selectedTo) {
        const toParam = `toCity=${encodeURIComponent(selectedTo)}`;
        filterParams = filterParams ? `${filterParams}&${toParam}` : `?${toParam}`;
      }
      
      const data = await authenticatedGet<TravelPost[]>(`/api/travel-posts${filterParams}`);
      console.log('TravelScreen: Fetched travel posts', data);
      const dataArray = Array.isArray(data) ? data : [];
      
      let sortedData = [...dataArray];
      
      // Apply sorting
      if (sortOption === 'Newest') {
        sortedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (sortOption === 'Earliest departure') {
        // Primary: travelDate (Ascending) | Secondary: travelDateTo (Ascending)
        sortedData.sort((a, b) => {
          const startDateComparison = new Date(a.travelDate).getTime() - new Date(b.travelDate).getTime();
          if (startDateComparison !== 0) return startDateComparison;
          
          const endDateA = a.travelDateTo || a.travelDate;
          const endDateB = b.travelDateTo || b.travelDate;
          return new Date(endDateA).getTime() - new Date(endDateB).getTime();
        });
      } else if (sortOption === 'Latest departure') {
        // Primary: travelDateTo (Descending) | Secondary: travelDate (Descending)
        sortedData.sort((a, b) => {
          const endDateA = a.travelDateTo || a.travelDate;
          const endDateB = b.travelDateTo || b.travelDate;
          const endDateComparison = new Date(endDateB).getTime() - new Date(endDateA).getTime();
          if (endDateComparison !== 0) return endDateComparison;
          
          return new Date(b.travelDate).getTime() - new Date(a.travelDate).getTime();
        });
      }
      
      setPosts(sortedData);
    } catch (error) {
      console.error('TravelScreen: Error fetching travel posts', error);
      if (posts.length === 0) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.filters, posts.length, sortOption, selectedFrom, selectedTo]);

  const fetchFavorites = React.useCallback(async () => {
    try {
      console.log('TravelScreen: Fetching favorites');
      const data = await authenticatedGet<{ postId: string; postType: string }[]>('/api/favorites');
      const travelFavorites = data.filter(f => f.postType === 'travel').map(f => f.postId);
      setFavorites(new Set(travelFavorites));
    } catch (error) {
      console.error('TravelScreen: Error fetching favorites', error);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchFavorites();
  }, [params.filters, sortOption, selectedFrom, selectedTo]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('TravelScreen: Screen focused, refreshing posts');
      fetchPosts();
      fetchFavorites();
    }, [fetchPosts, fetchFavorites])
  );

  const toggleFavorite = async (postId: string) => {
    console.log('TravelScreen: Toggle favorite', postId);
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
        await authenticatedDelete(`/api/favorites/${postId}?postType=travel`, {});
      } else {
        await authenticatedPost('/api/favorites', { postId, postType: 'travel' });
      }
    } catch (error) {
      console.error('TravelScreen: Error toggling favorite', error);
      setFavorites(favorites);
    }
  };

  const onRefresh = () => {
    console.log('TravelScreen: Refreshing');
    setRefreshing(true);
    fetchPosts();
    fetchFavorites();
  };

  const handleFromPress = () => {
    console.log('TravelScreen: Open from city selection modal');
    setShowFromModal(true);
  };

  const handleToPress = () => {
    console.log('TravelScreen: Open to city selection modal');
    setShowToModal(true);
  };

  const handleFromSelect = (city: string) => {
    console.log('TravelScreen: From city selected:', city);
    setSelectedFrom(city);
    setShowFromModal(false);
    setFromSearchQuery('');
  };

  const handleToSelect = (city: string) => {
    console.log('TravelScreen: To city selected:', city);
    setSelectedTo(city);
    setShowToModal(false);
    setToSearchQuery('');
  };

  const handleSortPress = (event: any) => {
    sortButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setSortButtonLayout({ x: pageX, y: pageY, width, height });
      setShowSortModal(true);
    });
  };

  const handleSortSelect = (option: SortOption) => {
    setSortOption(option);
    setShowSortModal(false);
  };

  const filteredPosts = posts.filter(post =>
    post.fromCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.toCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (post.description && post.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const hasActiveFilters = params.filters && params.filters.toString().length > 0;

  const fromDisplayText = selectedFrom || 'From';
  const toDisplayText = selectedTo || 'To';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Travel</Text>
        <View style={styles.pageHeaderRight}>
          <View style={styles.routeContainer}>
            <TouchableOpacity style={styles.routeButton} onPress={handleFromPress}>
              <Text style={styles.routeButtonText} numberOfLines={1}>{fromDisplayText}</Text>
            </TouchableOpacity>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow-forward"
              size={10}
              color={colors.text}
            />
            <TouchableOpacity style={styles.routeButton} onPress={handleToPress}>
              <Text style={styles.routeButtonText} numberOfLines={1}>{toDisplayText}</Text>
            </TouchableOpacity>
          </View>
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

      {loading && posts.length === 0 ? (
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
            
            // Show date range for seeking-ally posts when travelDateTo exists
            // Show date range for seeking companion posts (type === 'seeking') when travelDateTo exists
            const showDateRange = (post.type === 'seeking-ally' || post.type === 'seeking') && dateToDisplay;
            
            let label = '';
            let iconCompanionship = false;
            let iconAlly = false;
            let tagBackgroundColor = '';
            let tagTextColor = '';
            
            if (post.type === 'offering') {
              label = 'Offering';
              tagBackgroundColor = '#D1FAE5';
              tagTextColor = '#065F46';
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
                iconCompanionship = true;
                iconAlly = true;
              }
            } else if (post.type === 'seeking') {
              label = 'Seeking';
              tagBackgroundColor = '#DBEAFE';
              tagTextColor = '#1E40AF';
              iconCompanionship = true;
            } else if (post.type === 'seeking-ally') {
              label = 'Seeking';
              tagBackgroundColor = '#DBEAFE';
              tagTextColor = '#1E40AF';
              iconAlly = true;
            }
            
            const isFavorited = favorites.has(post.id);
            const hasIncentive = post.incentiveAmount && post.incentiveAmount > 0;
            const isOwnPost = post.userId === user?.id;
            
            return (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                onPress={() => router.push(`/travel/${post.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.tagRow}>
                    {label && (
                      <View style={[styles.typeTag, { backgroundColor: tagBackgroundColor }]}>
                        <Text style={[styles.typeTagText, { color: tagTextColor }]}>{label}</Text>
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
                  <View style={styles.rightSection}>
                    {hasIncentive && (
                      <View style={styles.incentiveTag}>
                        <Text style={styles.incentiveTagText}>Incentive</Text>
                      </View>
                    )}
                    {!isOwnPost && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavorite(post.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <IconSymbol
                          ios_icon_name={isFavorited ? "heart.fill" : "heart"}
                          android_material_icon_name={isFavorited ? "favorite" : "favorite-border"}
                          size={20}
                          color={isFavorited ? colors.primary : colors.border}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={styles.routeTextContainer}>
                  <Text style={styles.routeText}>{post.fromCity}</Text>
                  <Text style={styles.routeArrow}>→</Text>
                  <Text style={styles.routeText}>{post.toCity}</Text>
                </View>
                {(dateDisplay || dateToDisplay) && (
                  <View style={styles.dateContainer}>
                    <IconSymbol
                      ios_icon_name="calendar"
                      android_material_icon_name="calendar-today"
                      size={14}
                      color={colors.textSecondary}
                    />
                    {showDateRange ? (
                      <>
                        <Text style={styles.dateText}>{dateDisplay}</Text>
                        <Text style={styles.dateSeparator}>-</Text>
                        <Text style={styles.dateText}>{dateToDisplay}</Text>
                      </>
                    ) : (
                      <Text style={styles.dateText}>{dateDisplay}</Text>
                    )}
                  </View>
                )}
                {post.type === 'seeking' && post.companionshipFor && (
                  <View style={styles.companionshipForContainer}>
                    <Text style={styles.companionshipForLabel}>for: </Text>
                    <Text style={styles.companionshipForValue}>{post.companionshipFor}</Text>
                  </View>
                )}
                {post.type === 'seeking-ally' && post.item && (
                  <View style={styles.itemContainer}>
                    <Text style={styles.itemLabel}>Item: </Text>
                    <Text style={styles.itemName}>{post.item}</Text>
                  </View>
                )}
                {post.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {post.description}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* From City Selection Modal */}
      <RNModal
        visible={showFromModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFromModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowFromModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.cityModalContent}>
              <Text style={styles.cityModalTitle}>Select From City</Text>
              <CitySearchInput
                value={fromSearchQuery}
                onChangeText={(city) => {
                  setFromSearchQuery(city);
                  handleFromSelect(city);
                }}
                placeholder="Search city..."
                style={styles.citySearchInput}
                cityType="travel"
              />
              <TouchableOpacity
                style={styles.clearCityButton}
                onPress={() => {
                  setSelectedFrom('');
                  setShowFromModal(false);
                  setFromSearchQuery('');
                }}
              >
                <Text style={styles.clearCityButtonText}>Clear Selection</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

      {/* To City Selection Modal */}
      <RNModal
        visible={showToModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowToModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowToModal(false)}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.cityModalContent}>
              <Text style={styles.cityModalTitle}>Select To City</Text>
              <CitySearchInput
                value={toSearchQuery}
                onChangeText={(city) => {
                  setToSearchQuery(city);
                  handleToSelect(city);
                }}
                placeholder="Search city..."
                style={styles.citySearchInput}
                cityType="travel"
              />
              <TouchableOpacity
                style={styles.clearCityButton}
                onPress={() => {
                  setSelectedTo('');
                  setShowToModal(false);
                  setToSearchQuery('');
                }}
              >
                <Text style={styles.clearCityButtonText}>Clear Selection</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </RNModal>

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
            {(['Newest', 'Earliest departure', 'Latest departure'] as SortOption[]).map((option, index, array) => {
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
    paddingHorizontal: spacing.md + 7.56, // 16 + 2mm indent
    paddingVertical: 2,
    minHeight: 24,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 18,
  },
  pageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'center',
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999, // Completely round
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 50,
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  routeButtonText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999, // Completely round
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 28,
    justifyContent: 'center',
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
    paddingHorizontal: spacing.md + 7.56, // 16 + 2mm indent
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 4,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  rightSection: {
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
    lineHeight: 20,
  },
  iconSeparator: {
    fontSize: 14,
    color: colors.textSecondary,
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
  routeTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 3,
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
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginVertical: 3,
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
  companionshipForContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  companionshipForLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  companionshipForValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  itemLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  itemName: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  cardDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    lineHeight: 20,
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityModalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xl,
    width: 300,
  },
  cityModalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  citySearchInput: {
    marginBottom: spacing.md,
  },
  clearCityButton: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  clearCityButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  sortModalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sortModalContent: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    minWidth: 200,
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
