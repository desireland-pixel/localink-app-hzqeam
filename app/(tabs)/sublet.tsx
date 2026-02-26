
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl, Modal as RNModal, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete, apiGet } from '@/utils/api';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from '@/utils/cities';
import { useAuth } from '@/contexts/AuthContext';

interface Sublet {
  id: string;
  userId: string;
  title: string;
  description?: string;
  city: string;
  availableFrom: string;
  availableTo: string;
  moveInDate?: string;
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

type SortOption = 'Newest' | 'Earliest' | 'Cheapest';

export default function SubletScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [cityInputValue, setCityInputValue] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const sortButtonRef = useRef<View>(null);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  console.log('SubletScreen: Rendering', { subletsCount: sublets.length, loading, filters: params.filters });

  const fetchPosts = React.useCallback(async () => {
    console.log('SubletScreen: Fetching sublets with filters:', params.filters, 'selectedCity:', selectedCity);
    if (sublets.length === 0) {
      setLoading(true);
    }
    try {
      let filterParams = params.filters ? `?${params.filters}` : '';
      
      // Add city filter if selected
      if (selectedCity) {
        const cityParam = `city=${encodeURIComponent(selectedCity)}`;
        filterParams = filterParams ? `${filterParams}&${cityParam}` : `?${cityParam}`;
      }
      
      console.log('SubletScreen: API call with params:', filterParams);
      const data = await authenticatedGet<Sublet[]>(`/api/sublets${filterParams}`);
      console.log('SubletScreen: Fetched sublets', data);
      const dataArray = Array.isArray(data) ? data : [];
      
      let sortedData = [...dataArray];
      
      // Helper to parse dd.mm.yyyy or YYYY-MM-DD date strings to timestamp
      const parseDateStr = (dateStr: string | null | undefined): number => {
        if (!dateStr) return 0;
        const isoStr = parseDateFromDDMMYYYY(dateStr);
        if (!isoStr) return 0;
        return new Date(isoStr).getTime();
      };

      // Apply sorting
      if (sortOption === 'Newest') {
        sortedData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else if (sortOption === 'Earliest') {
        // Sort by availableFrom ascending (earliest available date first)
        sortedData.sort((a, b) => {
          const dateA = parseDateStr(a.availableFrom);
          const dateB = parseDateStr(b.availableFrom);
          return dateA - dateB;
        });
      } else if (sortOption === 'Cheapest') {
        sortedData.sort((a, b) => {
          const rentA = a.rent ? parseFloat(a.rent) : Infinity;
          const rentB = b.rent ? parseFloat(b.rent) : Infinity;
          return rentA - rentB;
        });
      }
      
      setSublets(sortedData);
    } catch (error) {
      console.error('SubletScreen: Error fetching sublets', error);
      if (sublets.length === 0) {
        setSublets([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.filters, sublets.length, sortOption, selectedCity]);

  const fetchFavorites = React.useCallback(async () => {
    try {
      console.log('SubletScreen: Fetching favorites');
      const data = await authenticatedGet<{ postId: string; postType: string }[]>('/api/favorites');
      const subletFavorites = data.filter(f => f.postType === 'sublet').map(f => f.postId);
      setFavorites(new Set(subletFavorites));
    } catch (error) {
      console.error('SubletScreen: Error fetching favorites', error);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
    fetchFavorites();
  }, [fetchPosts, fetchFavorites]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('SubletScreen: Screen focused, refreshing posts');
      fetchPosts();
      fetchFavorites();
    }, [fetchPosts, fetchFavorites])
  );

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

  const handleCityInputChange = async (text: string) => {
    setCityInputValue(text);
    
    if (text.trim().length > 0) {
      try {
        const response = await apiGet<{ cities: string[] }>(`/api/cities/search?q=${encodeURIComponent(text)}&limit=8`);
        setCitySuggestions(response.cities);
        setShowCitySuggestions(response.cities.length > 0);
      } catch (error) {
        console.error('SubletScreen: Error searching cities:', error);
        setCitySuggestions([]);
        setShowCitySuggestions(false);
      }
    } else {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
    }
  };

  const handleCitySelect = (city: string) => {
    console.log('SubletScreen: City selected:', city);
    setSelectedCity(city);
    setCityInputValue('');
    setShowCitySuggestions(false);
    Keyboard.dismiss();
  };

  const handleClearCity = () => {
    console.log('SubletScreen: Clear city selection');
    setSelectedCity('');
    setCityInputValue('');
    setShowCitySuggestions(false);
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
  
  const hasActiveFilters = params.filters && params.filters.toString().length > 0;

  const filteredSublets = sublets.filter(sublet =>
    sublet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sublet.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sublet.description && sublet.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const cityDisplayText = selectedCity || 'City';
  const showClearIcon = selectedCity.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Sublet</Text>
        <View style={styles.pageHeaderRight}>
          <View style={styles.cityButtonContainer}>
            {!selectedCity ? (
              <TextInput
                style={styles.cityInput}
                placeholder="City"
                placeholderTextColor={colors.textSecondary}
                value={cityInputValue}
                onChangeText={handleCityInputChange}
                autoCapitalize="words"
                autoCorrect={false}
              />
            ) : (
              <View style={styles.citySelectedContainer}>
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
                      <Text style={styles.citySuggestionText}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
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

      <View style={styles.separator} />

      {loading && sublets.length === 0 ? (
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
            const hasNoPhoto = !imageUrl || imageUrl.length === 0;
            const tagBackgroundColor = sublet.type === 'offering' ? '#D1FAE5' : '#DBEAFE';
            const tagTextColor = sublet.type === 'offering' ? '#065F46' : '#1E40AF';
            const isOwnPost = sublet.userId === user?.id;
            
            return (
              <TouchableOpacity
                key={sublet.id}
                style={styles.card}
                onPress={() => router.push(`/sublet/${sublet.id}`)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.leftSection}>
                    <View style={[styles.typeTag, { backgroundColor: tagBackgroundColor }]}>
                      <Text style={[styles.typeTagText, { color: tagTextColor }]}>{label}</Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="location.fill"
                      android_material_icon_name="location-on"
                      size={14}
                      color={colors.textSecondary}
                    />
                    <Text style={styles.cityText}>{sublet.city}</Text>
                    {!isOwnPost && (
                      <TouchableOpacity 
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavorite(sublet.id);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        style={styles.heartButton}
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
                <View style={styles.cardContent}>
                  <View style={styles.imageContainer}>
                    {hasNoPhoto ? (
                      <View style={styles.noPhotoContainer}>
                        <Text style={styles.noPhotoText}>No Photo</Text>
                      </View>
                    ) : (
                      <Image 
                        source={{ uri: imageUrl }} 
                        style={styles.cardImage}
                        cachePolicy="none"
                        contentFit="cover"
                        transition={200}
                        placeholder={require('@/assets/images/e0ef75c7-f2f2-4978-a582-c04be452d5cf.png')}
                        placeholderContentFit="contain"
                        onError={(error) => {
                          console.error('[SubletScreen] Image load error:', imageUrl, error);
                        }}
                      />
                    )}
                  </View>
                  <View style={styles.cardTextContent}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{sublet.title}</Text>
                    {fromDisplay && toDisplay && (
                      <View style={styles.cardDateRow}>
                        <IconSymbol
                          ios_icon_name="calendar"
                          android_material_icon_name="calendar-today"
                          size={14}
                          color={colors.textSecondary}
                        />
                        <Text style={styles.cardDateText}>{fromDisplay}</Text>
                        <Text style={styles.cardDateSeparator}>-</Text>
                        <Text style={styles.cardDateText}>{toDisplay}</Text>
                      </View>
                    )}
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
            {(['Newest', 'Earliest', 'Cheapest'] as SortOption[]).map((option, index, array) => {
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
  pageHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    justifyContent: 'flex-end',
  },
  cityButtonContainer: {
    position: 'relative',
    minWidth: 80,
    maxWidth: 120,
  },
  cityInput: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 28,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
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
  iconButton: {
    padding: spacing.xs,
  },
  iconButtonActive: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginTop: 2,
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
    flexDirection: 'column',
    marginBottom: 0,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
    marginBottom: spacing.md,
  },
  heartButton: {
    marginLeft: 'auto',
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
  cityText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  cardContent: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
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
  noPhotoContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noPhotoText: {
    ...typography.bodySmall,
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  cardTextContent: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  cardTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 0,
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
    fontSize: 12,
  },
  cardDateSeparator: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 12,
  },
  cardRent: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 14,
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
