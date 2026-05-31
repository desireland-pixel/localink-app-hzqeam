
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl, Modal as RNModal, Keyboard } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete, apiGet } from '@/utils/api';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY } from '@/utils/cities';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { StatusBar } from 'expo-status-bar';
import { useScreenTracking } from '@/utils/useScreenTracking';
import { SCREEN_NAMES } from '@/utils/analytics';

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

const PAGE_SIZE = 20;

const SUBLET_DISCLAIMER = `LokaLinc operates solely as a communication platform connecting users and is not a party to any rental agreement.

Users are exclusively responsible for ensuring compliance with applicable rental laws, including obtaining any required landlord consent under §§ 540, 553 BGB.

No verification of listings is performed, and no responsibility is assumed for the legality, accuracy, or execution of subletting arrangements.`;

function parseListResponse<T>(data: unknown): { items: T[]; hasMore: boolean } {
  if (data && typeof data === 'object' && !Array.isArray(data) && 'data' in data && Array.isArray((data as any).data)) {
    return {
      items: (data as any).data as T[],
      hasMore: Boolean((data as any).hasMore),
    };
  }
  if (Array.isArray(data)) {
    return { items: data as T[], hasMore: false };
  }
  return { items: [], hasMore: false };
}

export default function SubletScreen() {
  useScreenTracking(SCREEN_NAMES.SUBLET);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    return typeof params.city === 'string' ? params.city : '';
  });
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  const [showSortModal, setShowSortModal] = useState(false);
  const [cityInputValue, setCityInputValue] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const sortButtonRef = useRef<View>(null);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Disclaimer state
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerCheckLoading, setDisclaimerCheckLoading] = useState(true);

  // New posts banner state
  const flatListRef = useRef<FlatList>(null);
  const [newPostsAvailable, setNewPostsAvailable] = useState(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFetchingPage1 = useRef(false);

  // Cleanup banner timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = null;
      }
    };
  }, []);

  // Sync city from params when navigating back from filter page
  React.useEffect(() => {
    const cityParam = typeof params.city === 'string' ? params.city : '';
    if (cityParam !== selectedCity) {
      console.log('SubletScreen: Restoring city from params:', cityParam);
      setSelectedCity(cityParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.city]);

  // Check if user has accepted disclaimer
  useEffect(() => {
    const checkDisclaimer = async () => {
      if (!user) {
        setDisclaimerCheckLoading(false);
        return;
      }
      
      try {
        console.log('SubletScreen: Checking disclaimer acceptance');
        const response = await authenticatedGet<{ subletDisclaimerAccepted: boolean; travelDisclaimerAccepted: boolean }>('/api/profile/disclaimers');
        console.log('SubletScreen: Disclaimer status:', response);
        
        if (!response.subletDisclaimerAccepted) {
          console.log('SubletScreen: Showing disclaimer modal');
          setShowDisclaimerModal(true);
        }
        setDisclaimerAccepted(response.subletDisclaimerAccepted);
      } catch (error) {
        console.error('SubletScreen: Error checking disclaimer:', error);
        setShowDisclaimerModal(true);
      } finally {
        setDisclaimerCheckLoading(false);
      }
    };

    checkDisclaimer();
  }, [user]);

  const handleAcceptDisclaimer = async () => {
    try {
      console.log('SubletScreen: Accepting disclaimer');
      await authenticatedPost('/api/profile/disclaimers', { type: 'sublet' });
      console.log('SubletScreen: Disclaimer accepted');
      setDisclaimerAccepted(true);
      setShowDisclaimerModal(false);
    } catch (error) {
      console.error('SubletScreen: Error accepting disclaimer:', error);
    }
  };

  const clearDismissTimer = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
  }, []);

  const dismissBanner = useCallback(() => {
    clearDismissTimer();
    setNewPostsAvailable(false);
  }, [clearDismissTimer]);

  const showBannerWithTimer = useCallback(() => {
    clearDismissTimer();
    setNewPostsAvailable(true);
    dismissTimerRef.current = setTimeout(() => {
      setNewPostsAvailable(false);
      dismissTimerRef.current = null;
    }, 5000);
  }, [clearDismissTimer]);

  const buildQueryString = useCallback((pageNum: number) => {
    const qp = new URLSearchParams();
    qp.append('page', String(pageNum));
    qp.append('limit', String(PAGE_SIZE));

    // Map sort option to backend value
    if (sortOption === 'Newest') {
      qp.append('sort', 'newest');
    } else if (sortOption === 'Earliest') {
      qp.append('sort', 'earliest');
    } else if (sortOption === 'Cheapest') {
      qp.append('sort', 'cheapest');
    }

    if (selectedCity) {
      qp.append('city', selectedCity);
    }

    // Merge any extra filter params from the filter page
    if (params.filters) {
      const extra = new URLSearchParams(params.filters as string);
      extra.forEach((value, key) => {
        if (!qp.has(key)) {
          qp.append(key, value);
        }
      });
    }

    return qp.toString();
  }, [sortOption, selectedCity, params.filters]);

  // Initial / refresh fetch (page 1)
  const fetchPage1 = useCallback(async (isRefresh = false) => {
    isFetchingPage1.current = true;
    console.log('SubletScreen: Fetching sublets page 1, sort:', sortOption, 'city:', selectedCity);
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const qs = buildQueryString(1);
      console.log('SubletScreen: GET /api/sublets?' + qs);
      const raw = await authenticatedGet<unknown>(`/api/sublets?${qs}`);
      const { items, hasMore: more } = parseListResponse<Sublet>(raw);
      console.log('SubletScreen: Fetched sublets page 1, count:', items.length, 'hasMore:', more);
      setSublets(items);
      setPage(1);
      setHasMore(more);
    } catch (error) {
      console.error('SubletScreen: Error fetching sublets', error);
      setSublets([]);
    } finally {
      isFetchingPage1.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQueryString, sortOption, selectedCity]);

  const fetchFavorites = useCallback(async () => {
    try {
      console.log('SubletScreen: Fetching favorites');
      const data = await authenticatedGet<{ postId: string; postType: string }[]>('/api/favorites');
      const subletFavorites = data.filter(f => f.postType === 'sublet').map(f => f.postId);
      setFavorites(new Set(subletFavorites));
    } catch (error) {
      console.error('SubletScreen: Error fetching favorites', error);
    }
  }, []);

  const checkForNewPosts = useCallback(async () => {
    if (sublets.length === 0) return;
    if (isFetchingPage1.current) return;
    try {
      const qp = new URLSearchParams();
      qp.append('page', '1');
      qp.append('limit', '1');
      if (sortOption === 'Newest') qp.append('sort', 'newest');
      else if (sortOption === 'Earliest') qp.append('sort', 'earliest');
      else if (sortOption === 'Cheapest') qp.append('sort', 'cheapest');
      if (selectedCity) qp.append('city', selectedCity);
      if (params.filters) {
        const extra = new URLSearchParams(params.filters as string);
        extra.forEach((value, key) => { if (!qp.has(key)) qp.append(key, value); });
      }
      console.log('SubletScreen: checkForNewPosts GET /api/sublets?' + qp.toString());
      const raw = await authenticatedGet<unknown>(`/api/sublets?${qp.toString()}`);
      const { items } = parseListResponse<Sublet>(raw);
      if (items.length > 0 && items[0].id !== sublets[0].id) {
        console.log('SubletScreen: New posts detected, showing banner');
        showBannerWithTimer();
      }
    } catch (err) {
      console.log('SubletScreen: checkForNewPosts failed silently', err);
    }
  }, [sublets, sortOption, selectedCity, params.filters, showBannerWithTimer]);

  // Load more (next pages)
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    console.log('SubletScreen: Loading more sublets, page:', nextPage);
    setLoadingMore(true);
    try {
      const qs = buildQueryString(nextPage);
      console.log('SubletScreen: GET /api/sublets?' + qs);
      const raw = await authenticatedGet<unknown>(`/api/sublets?${qs}`);
      const { items, hasMore: more } = parseListResponse<Sublet>(raw);
      console.log('SubletScreen: Fetched sublets page', nextPage, 'count:', items.length, 'hasMore:', more);
      setSublets(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newItems = items.filter(s => !existingIds.has(s.id));
        return [...prev, ...newItems];
      });
      setPage(nextPage);
      setHasMore(more);
    } catch (error) {
      console.error('SubletScreen: Error loading more sublets', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, page, buildQueryString]);

  // Trigger fresh page-1 load when sort or city changes
  useEffect(() => {
    fetchPage1();
    fetchFavorites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption, selectedCity, params.filters]);

  useFocusEffect(
    useCallback(() => {
      console.log('SubletScreen: Screen focused');
      if (sublets.length === 0) {
        fetchPage1();
      } else {
        checkForNewPosts();
      }
      fetchFavorites();
    }, [sublets.length, fetchPage1, fetchFavorites, checkForNewPosts])
  );

  // Client-side search filter only (sort/city handled by backend)
  const visibleItems = useMemo(() => {
    if (!searchQuery.trim()) return sublets;
    const q = searchQuery.toLowerCase();
    return sublets.filter(sublet =>
      sublet.title.toLowerCase().includes(q) ||
      sublet.city.toLowerCase().includes(q) ||
      (sublet.description && sublet.description.toLowerCase().includes(q))
    );
  }, [sublets, searchQuery]);

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
    dismissBanner();
    console.log('SubletScreen: Pull-to-refresh');
    setRefreshing(true);
    fetchPage1(true);
    fetchFavorites();
  };

  const handlePostSublet = () => {
    console.log('SubletScreen: Navigate to post sublet');
    router.push('/post-sublet');
  };

  const handleFilters = () => {
    console.log('SubletScreen: Navigate to filters');
    router.push({
      pathname: '/sublet-filters',
      params: { filters: params.filters || '', city: selectedCity }
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
    console.log('SubletScreen: City filter cleared');
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
    console.log('SubletScreen: Sort selected:', option);
    setSortOption(option);
    setShowSortModal(false);
  };

  const renderFooter = () => {
    if (loadingMore) {
      return <ActivityIndicator style={{ paddingVertical: 24 }} color={colors.primary} />;
    }
    if (!hasMore && sublets.length > 0) {
      return <Text style={styles.endOfListText}>You've seen all posts</Text>;
    }
    return null;
  };

  const renderItem = ({ item: sublet }: { item: Sublet }) => {
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
        style={styles.card}
        onPress={() => {
          console.log('SubletScreen: Navigate to sublet detail', sublet.id);
          router.push(`/sublet/${sublet.id}`);
        }}
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
                cachePolicy="memory-disk"
                contentFit="cover"
                transition={200}
                placeholder={require('@/assets/images/Logo_LokaLinc.png')}
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
  };

  const hasActiveFilters = params.filters && params.filters.toString().length > 0;

  const renderHeader = () => {
    if (!newPostsAvailable) return null;
    return (
      <View style={styles.newPostsBannerOverlay}>
        <TouchableOpacity
          style={styles.newPostsBanner}
          activeOpacity={0.8}
          onPress={() => {
            console.log('SubletScreen: New posts banner tapped — loading fresh posts');
            dismissBanner();
            fetchPage1();
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
          }}
        >
          <View style={styles.newPostsBannerLeft}>
            <IconSymbol
              ios_icon_name="arrow.up"
              android_material_icon_name="arrow-upward"
              size={13}
              color={colors.primary}
            />
            <Text style={styles.newPostsBannerText}>New posts available</Text>
          </View>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              console.log('SubletScreen: New posts banner dismissed');
              dismissBanner();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={12}
              color={colors.primary}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  // Show loading while checking disclaimer
  if (disclaimerCheckLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="dark" />
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Sublet</Text>
        <View style={styles.pageHeaderCenter}>
          <View style={styles.cityButtonContainer}>
            {!selectedCity ? (
              <View style={styles.cityInputWrapper}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="location-on"
                  size={14}
                  color={colors.text}
                />
                <TextInput
                  style={styles.cityInput}
                  placeholder="City"
                  placeholderTextColor={colors.textSecondary}
                  value={cityInputValue}
                  onChangeText={handleCityInputChange}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            ) : (
              <View style={styles.citySelectedContainer}>
                <IconSymbol
                  ios_icon_name="location.fill"
                  android_material_icon_name="location-on"
                  size={14}
                  color={colors.text}
                />
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
                      <Text style={styles.citySuggestionText} numberOfLines={1}>{city}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>
        <View style={styles.pageHeaderRight}>
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
      ) : (
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={visibleItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyEmoji}>🏠</Text>
                <Text style={styles.emptyTitle}>No sublet matches found</Text>
                <Text style={styles.emptySubtitle}>Post a request to reach hosts directly!</Text>
                <TouchableOpacity style={styles.requestButton} onPress={handlePostSublet}>
                  <Text style={styles.requestButtonText}>Request</Text>
                </TouchableOpacity>
              </View>
            }
            contentContainerStyle={visibleItems.length === 0 ? styles.flatListEmpty : styles.flatListContent}
          />
          {newPostsAvailable && renderHeader()}
        </View>
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

      {/* Disclaimer Modal */}
      <Modal
        visible={showDisclaimerModal}
        onClose={() => {}}
        title="Sublet Disclaimer"
        message={SUBLET_DISCLAIMER}
        confirmText="I understand and agree"
        onConfirm={handleAcceptDisclaimer}
        type="info"
      />
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
  pageHeaderCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    pointerEvents: 'box-none',
  },
  pageHeaderRight: {
    marginLeft: 'auto',
    zIndex: 2,
  },
  cityButtonContainer: {
    position: 'relative',
    minWidth: 120,
    maxWidth: 200,
  },
  cityInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 28,
    borderWidth: 0,
  },
  cityInput: {
    flex: 1,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
    paddingVertical: 0,
    minWidth: 72,
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
    borderWidth: 0,
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
    borderWidth: 0,
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
    marginHorizontal: 0,
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
    paddingTop: spacing.xl * 3,
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
  flatListContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  flatListEmpty: {
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
  endOfListText: {
    textAlign: 'center',
    paddingVertical: 24,
    color: colors.textSecondary,
    fontSize: 13,
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
  newPostsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'center',
    width: '65%',
    minWidth: 220,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    marginBottom: spacing.sm,
    backgroundColor: colors.highlight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  newPostsBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  newPostsBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  newPostsBannerOverlay: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
    pointerEvents: 'box-none',
  },
});
