
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl, Modal as RNModal, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete, apiGet } from '@/utils/api';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY, getCityCode } from '@/utils/cities';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';
import { StatusBar } from 'expo-status-bar';
import { useScreenTracking } from '@/utils/useScreenTracking';
import { SCREEN_NAMES } from '@/utils/analytics';
import { getIsOnline } from '@/utils/networkState';

// Country-to-cities mapping for expanded country filtering (static, defined outside component)
const COUNTRY_CITIES: { [country: string]: string[] } = {
  'India': ['Ahmedabad', 'Bengaluru', 'Chennai', 'Delhi', 'Goa', 'Hyderabad', 'Kochi', 'Kolkata', 'Mumbai', 'Thiruvananthapuram'],
  'Germany': ['Berlin', 'Cologne', 'Düsseldorf', 'Frankfurt', 'Hamburg', 'Hannover', 'Munich', 'Stuttgart'],
};

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

const PAGE_SIZE = 20;

const TRAVEL_DISCLAIMER = `LokaLinc provides a digital platform enabling users to connect and coordinate independently.

Users are solely responsible for compliance with all applicable laws, airline policies, and customs regulations. The transport of illegal, restricted, hazardous, or commercially regulated goods is strictly prohibited. Offered/Received incentives do not constitute employment, commercial transport fees, or service engagement by the platform.

No responsibility or liability is assumed for loss, damage, delay, disputes, or legal consequences arising from arrangements made between users.`;

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

export default function TravelScreen() {
  useScreenTracking(SCREEN_NAMES.TRAVEL);
  const router = useRouter();
  const isNavigatingRef = useRef(false);
  const safePush = React.useCallback((path: any) => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    router.push(path);
    setTimeout(() => { isNavigatingRef.current = false; }, 500);
  }, [router]);
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [posts, setPosts] = useState<TravelPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortOption, setSortOption] = useState<SortOption>('Newest');
  const [showSortModal, setShowSortModal] = useState(false);

  // Disclaimer state
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerCheckLoading, setDisclaimerCheckLoading] = useState(true);

  const [selectedFrom, setSelectedFrom] = useState<string>(() => {
    return typeof params.fromCity === 'string' ? params.fromCity : '';
  });
  const [selectedTo, setSelectedTo] = useState<string>(() => {
    return typeof params.toCity === 'string' ? params.toCity : '';
  });
  const [fromInputValue, setFromInputValue] = useState('');
  const [toInputValue, setToInputValue] = useState('');
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  const [showFromSuggestions, setShowFromSuggestions] = useState(false);
  const [showToSuggestions, setShowToSuggestions] = useState(false);
  const sortButtonRef = useRef<View>(null);
  const [sortButtonLayout, setSortButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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

  // Sync from/to cities from params when navigating back from filter page
  React.useEffect(() => {
    const fromCityParam = typeof params.fromCity === 'string' ? params.fromCity : '';
    if (fromCityParam !== selectedFrom) {
      console.log('TravelScreen: Restoring fromCity from params:', fromCityParam);
      setSelectedFrom(fromCityParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.fromCity]);

  React.useEffect(() => {
    const toCityParam = typeof params.toCity === 'string' ? params.toCity : '';
    if (toCityParam !== selectedTo) {
      console.log('TravelScreen: Restoring toCity from params:', toCityParam);
      setSelectedTo(toCityParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toCity]);

  // Check if user has accepted travel disclaimer
  useEffect(() => {
    const checkDisclaimer = async () => {
      if (!user) {
        setDisclaimerCheckLoading(false);
        return;
      }

      try {
        console.log('TravelScreen: Checking disclaimer acceptance');
        const response = await authenticatedGet<{ subletDisclaimerAccepted: boolean; travelDisclaimerAccepted: boolean }>('/api/profile/disclaimers');
        console.log('TravelScreen: Disclaimer status:', response);

        if (!response.travelDisclaimerAccepted) {
          console.log('TravelScreen: Showing travel disclaimer modal');
          setShowDisclaimerModal(true);
        }
        setDisclaimerAccepted(response.travelDisclaimerAccepted);
      } catch (error: any) {
        const isNetworkError =
          error?.code === 'network' ||
          error?.message?.includes('Network request failed') ||
          error?.message?.includes('Failed to fetch');
        if (!isNetworkError) {
          console.error('TravelScreen: Error checking disclaimer:', error);
        }
        setShowDisclaimerModal(true);
      } finally {
        setDisclaimerCheckLoading(false);
      }
    };

    checkDisclaimer();
  }, [user]);

  const handleAcceptTravelDisclaimer = async () => {
    try {
      console.log('TravelScreen: Accepting travel disclaimer');
      await authenticatedPost('/api/profile/disclaimers', { type: 'travel' });
      console.log('TravelScreen: Travel disclaimer accepted');
      setDisclaimerAccepted(true);
      setShowDisclaimerModal(false);
    } catch (error: any) {
      const isNetworkError =
        error?.code === 'network' ||
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch');
      if (!isNetworkError) {
        console.error('TravelScreen: Error accepting travel disclaimer:', error);
      }
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
    } else if (sortOption === 'Earliest departure') {
      qp.append('sort', 'earliest-departure');
    } else if (sortOption === 'Latest departure') {
      qp.append('sort', 'latest-departure');
    }

    if (selectedFrom) {
      qp.append('fromCity', selectedFrom);
    }
    if (selectedTo) {
      qp.append('toCity', selectedTo);
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
  }, [sortOption, selectedFrom, selectedTo, params.filters]);

  // Initial / refresh fetch (page 1)
  const fetchPage1 = useCallback(async (isRefresh = false) => {
    if (!getIsOnline()) return;
    isFetchingPage1.current = true;
    console.log('TravelScreen: Fetching travel posts page 1, sort:', sortOption, 'from:', selectedFrom, 'to:', selectedTo);
    if (!isRefresh) {
      setLoading(true);
    }
    try {
      const qs = buildQueryString(1);
      console.log('TravelScreen: GET /api/travel-posts?' + qs);
      const raw = await authenticatedGet<unknown>(`/api/travel-posts?${qs}`);
      const { items, hasMore: more } = parseListResponse<TravelPost>(raw);
      console.log('TravelScreen: Fetched travel posts page 1, count:', items.length, 'hasMore:', more);
      setPosts(items);
      setPage(1);
      setHasMore(more);
    } catch (error: any) {
      const isNetworkError =
        error?.code === 'network' ||
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch');
      if (!isNetworkError) {
        console.error('TravelScreen: Error fetching travel posts', error);
      }
      setPosts([]);
    } finally {
      isFetchingPage1.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQueryString, sortOption, selectedFrom, selectedTo]);

  const fetchFavorites = useCallback(async () => {
    if (!getIsOnline()) return;
    try {
      console.log('TravelScreen: Fetching favorites');
      const data = await authenticatedGet<{ postId: string; postType: string }[]>('/api/favorites');
      const travelFavorites = data.filter(f => f.postType === 'travel').map(f => f.postId);
      setFavorites(new Set(travelFavorites));
    } catch (error: any) {
      const isNetworkError =
        error?.code === 'network' ||
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch');
      if (!isNetworkError) {
        console.error('TravelScreen: Error fetching favorites', error);
      }
    }
  }, []);

  const checkForNewPosts = useCallback(async () => {
    if (sortOption !== 'Newest') return;
    if (posts.length === 0) return;
    if (isFetchingPage1.current) return;
    try {
      const qp = new URLSearchParams();
      qp.append('page', '1');
      qp.append('limit', '1');
      if (sortOption === 'Newest') qp.append('sort', 'newest');
      else if (sortOption === 'Earliest departure') qp.append('sort', 'earliest-departure');
      else if (sortOption === 'Latest departure') qp.append('sort', 'latest-departure');
      if (selectedFrom) qp.append('fromCity', selectedFrom);
      if (selectedTo) qp.append('toCity', selectedTo);
      if (params.filters) {
        const extra = new URLSearchParams(params.filters as string);
        extra.forEach((value, key) => { if (!qp.has(key)) qp.append(key, value); });
      }
      console.log('TravelScreen: checkForNewPosts GET /api/travel-posts?' + qp.toString());
      const raw = await authenticatedGet<unknown>(`/api/travel-posts?${qp.toString()}`);
      const { items } = parseListResponse<TravelPost>(raw);
      if (items.length > 0 && items[0].id !== posts[0].id) {
        console.log('TravelScreen: New posts detected, showing banner');
        showBannerWithTimer();
      }
    } catch (err) {
      console.log('TravelScreen: checkForNewPosts failed silently', err);
    }
  }, [posts, sortOption, selectedFrom, selectedTo, params.filters, showBannerWithTimer]);

  // Load more (next pages)
  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    console.log('TravelScreen: Loading more travel posts, page:', nextPage);
    setLoadingMore(true);
    try {
      const qs = buildQueryString(nextPage);
      console.log('TravelScreen: GET /api/travel-posts?' + qs);
      const raw = await authenticatedGet<unknown>(`/api/travel-posts?${qs}`);
      const { items, hasMore: more } = parseListResponse<TravelPost>(raw);
      console.log('TravelScreen: Fetched travel posts page', nextPage, 'count:', items.length, 'hasMore:', more);
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newItems = items.filter(p => !existingIds.has(p.id));
        return [...prev, ...newItems];
      });
      setPage(nextPage);
      setHasMore(more);
    } catch (error: any) {
      const isNetworkError =
        error?.code === 'network' ||
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch');
      if (!isNetworkError) {
        console.error('TravelScreen: Error loading more travel posts', error);
      }
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, page, buildQueryString]);

  // Trigger fresh page-1 load when sort or city filters change
  useEffect(() => {
    fetchPage1();
    fetchFavorites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortOption, selectedFrom, selectedTo, params.filters]);

  useFocusEffect(
    useCallback(() => {
      console.log('TravelScreen: Screen focused');
      if (posts.length === 0) {
        fetchPage1();
      } else {
        checkForNewPosts();
      }
      fetchFavorites();
    }, [posts.length, fetchPage1, fetchFavorites, checkForNewPosts])
  );

  // Client-side search filter only (sort/from/to handled by backend)
  const visibleItems = useMemo(() => {
    if (!searchQuery.trim()) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(post =>
      post.fromCity.toLowerCase().includes(q) ||
      post.toCity.toLowerCase().includes(q) ||
      (post.description && post.description.toLowerCase().includes(q))
    );
  }, [posts, searchQuery]);

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
    } catch (error: any) {
      const isNetworkError =
        error?.code === 'network' ||
        error?.message?.includes('Network request failed') ||
        error?.message?.includes('Failed to fetch');
      if (!isNetworkError) {
        console.error('TravelScreen: Error toggling favorite', error);
      }
      setFavorites(favorites);
    }
  };

  const onRefresh = () => {
    if (!getIsOnline()) return;
    dismissBanner();
    console.log('TravelScreen: Pull-to-refresh');
    setRefreshing(true);
    fetchPage1(true);
    fetchFavorites();
  };

  const handleFromInputChange = async (text: string) => {
    setFromInputValue(text);
    
    if (text.trim().length > 0) {
      try {
        const response = await apiGet<{ cities: string[] }>(`/api/cities/search?q=${encodeURIComponent(text)}&limit=8&type=travel`);
        setFromSuggestions(response.cities);
        setShowFromSuggestions(response.cities.length > 0);
      } catch (error: any) {
        const isNetworkError =
          error?.code === 'network' ||
          error?.message?.includes('Network request failed') ||
          error?.message?.includes('Failed to fetch');
        if (!isNetworkError) {
          console.error('TravelScreen: Error searching from cities:', error);
        }
        setFromSuggestions([]);
        setShowFromSuggestions(false);
      }
    } else {
      setFromSuggestions([]);
      setShowFromSuggestions(false);
    }
  };

  const handleToInputChange = async (text: string) => {
    setToInputValue(text);
    
    if (text.trim().length > 0) {
      try {
        const response = await apiGet<{ cities: string[] }>(`/api/cities/search?q=${encodeURIComponent(text)}&limit=8&type=travel`);
        setToSuggestions(response.cities);
        setShowToSuggestions(response.cities.length > 0);
      } catch (error: any) {
        const isNetworkError =
          error?.code === 'network' ||
          error?.message?.includes('Network request failed') ||
          error?.message?.includes('Failed to fetch');
        if (!isNetworkError) {
          console.error('TravelScreen: Error searching to cities:', error);
        }
        setToSuggestions([]);
        setShowToSuggestions(false);
      }
    } else {
      setToSuggestions([]);
      setShowToSuggestions(false);
    }
  };

  const handleFromSelect = (city: string) => {
    console.log('TravelScreen: From city selected:', city);
    setSelectedFrom(city);
    setFromInputValue('');
    setShowFromSuggestions(false);
    Keyboard.dismiss();
  };

  const handleToSelect = (city: string) => {
    console.log('TravelScreen: To city selected:', city);
    setSelectedTo(city);
    setToInputValue('');
    setShowToSuggestions(false);
    Keyboard.dismiss();
  };

  const handleClearFrom = () => {
    console.log('TravelScreen: From city filter cleared');
    setSelectedFrom('');
    setFromInputValue('');
    setShowFromSuggestions(false);
  };

  const handleClearTo = () => {
    console.log('TravelScreen: To city filter cleared');
    setSelectedTo('');
    setToInputValue('');
    setShowToSuggestions(false);
  };

  const handleSortPress = (event: any) => {
    sortButtonRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setSortButtonLayout({ x: pageX, y: pageY, width, height });
      setShowSortModal(true);
    });
  };

  const handleSortSelect = (option: SortOption) => {
    console.log('TravelScreen: Sort selected:', option);
    setSortOption(option);
    setShowSortModal(false);
  };

  const renderFooter = () => {
    if (loadingMore) {
      return <ActivityIndicator style={{ paddingVertical: 24 }} color={colors.primary} />;
    }
    if (!hasMore && posts.length > 0) {
      return <Text style={styles.endOfListText}>You've seen all posts</Text>;
    }
    return null;
  };

  const renderItem = ({ item: post }: { item: TravelPost }) => {
    const dateDisplay = formatDateToDDMMYYYY(post.travelDate);
    const dateToDisplay = post.travelDateTo ? formatDateToDDMMYYYY(post.travelDateTo) : null;
    
    const showDateRange = (post.type === 'seeking-ally' || post.type === 'seeking') && dateToDisplay;
    
    let label = '';
    let iconCompanionship = false;
    let iconAlly = false;
    let tagBackgroundColor = '';
    let tagTextColor = '';
  
    // Check if post should be disabled based on date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let isExpired = false;

    const rawExpiryDateStr =
      post.type === 'offering'
        ? post.travelDate
        : post.travelDateTo || post.travelDate;

    const expiryDateStr = rawExpiryDateStr?.split('T')[0];
    
    if (expiryDateStr) {
      let expiryDate;
      if (expiryDateStr.includes('-')) {
        const [year, month, day] = expiryDateStr.split('-');
        expiryDate = new Date(Number(year), Number(month) - 1, Number(day));
      } else {
        const [day, month, year] = expiryDateStr.split('.');
        expiryDate = new Date(Number(year), Number(month) - 1, Number(day));
      }
      expiryDate.setHours(0,0,0,0);
      isExpired = expiryDate < today;
    }
  
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

    } else if (post.type === 'seeking' || post.type === 'seeking-ally') {
      label = 'Seeking';
      tagBackgroundColor = '#DBEAFE';
      tagTextColor = '#1E40AF';
    
      if (post.type === 'seeking') {
        iconCompanionship = true;
      } else {
        iconAlly = true;
      }
    }
    
    const isFavorited = favorites.has(post.id);
    const hasIncentive = post.incentiveAmount && post.incentiveAmount > 0;
    const isOwnPost = post.userId === user?.id;
    
    return (
      <TouchableOpacity
        style={[styles.card, isExpired && styles.cardDisabled]}
        onPress={() => {
          if (!isExpired) {
            console.log('TravelScreen: Navigate to travel detail', post.id);
            safePush(`/travel/${post.id}`);
          }
        }}
        disabled={isExpired}
      >
        <View style={styles.cardHeader}>
          <View style={styles.tagRow}>
            {label ? (
              <View style={[styles.typeTag, { backgroundColor: tagBackgroundColor }]}>
                <Text style={[styles.typeTagText, { color: tagTextColor }]}>{label}</Text>
              </View>
            ) : null}
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
  };

  const hasActiveFilters = params.filters && params.filters.toString().length > 0;
  
  const sortDisplayText = sortOption === 'Earliest departure' ? 'Earliest' : sortOption === 'Latest departure' ? 'Latest' : sortOption;

  const renderHeader = () => {
    if (!newPostsAvailable) return null;
    return (
      <View style={styles.newPostsBannerOverlay}>
        <TouchableOpacity
          style={styles.newPostsBanner}
          activeOpacity={0.8}
          onPress={() => {
            console.log('TravelScreen: New posts banner tapped — loading fresh posts');
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
              console.log('TravelScreen: New posts banner dismissed');
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

  // Get display codes for selected cities
  const fromDisplayCode = selectedFrom ? getCityCode(selectedFrom) : '';
  const toDisplayCode = selectedTo ? getCityCode(selectedTo) : '';

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
        <Text style={styles.pageTitle}>Travel</Text>
        <View style={styles.pageHeaderCenter}>
          <View style={styles.routeContainer}>
            <View style={styles.routeButtonContainer}>
              {!selectedFrom ? (
                <TextInput
                  style={styles.routeInput}
                  placeholder="From"
                  placeholderTextColor={colors.textSecondary}
                  value={fromInputValue}
                  onChangeText={handleFromInputChange}
                  onBlur={() => {
                    setFromInputValue('');
                    setShowFromSuggestions(false);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              ) : (
                <View style={styles.routeSelectedContainer}>
                  <Text style={styles.routeSelectedText} numberOfLines={1}>{fromDisplayCode}</Text>
                  <TouchableOpacity onPress={handleClearFrom} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <IconSymbol
                      ios_icon_name="xmark"
                      android_material_icon_name="close"
                      size={12}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {showFromSuggestions && fromSuggestions.length > 0 && (
                <View style={styles.routeSuggestionsContainer}>
                  <ScrollView 
                    style={styles.routeSuggestionsList}
                    keyboardShouldPersistTaps="always"
                    nestedScrollEnabled={true}
                  >
                    {fromSuggestions.map((city, index) => (
                      <TouchableOpacity
                        key={`${city}-${index}`}
                        style={styles.routeSuggestionItem}
                        onPress={() => handleFromSelect(city)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.routeSuggestionText} numberOfLines={1}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
            <IconSymbol
              ios_icon_name="arrow.right"
              android_material_icon_name="arrow-forward"
              size={10}
              color={colors.text}
            />
            <View style={styles.routeButtonContainer}>
              {!selectedTo ? (
                <TextInput
                  style={styles.routeInput}
                  placeholder="To"
                  placeholderTextColor={colors.textSecondary}
                  value={toInputValue}
                  onChangeText={handleToInputChange}
                  onBlur={() => {
                    setToInputValue('');
                    setShowToSuggestions(false);
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              ) : (
                <View style={styles.routeSelectedContainer}>
                  <Text style={styles.routeSelectedText} numberOfLines={1}>{toDisplayCode}</Text>
                  <TouchableOpacity onPress={handleClearTo} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <IconSymbol
                      ios_icon_name="xmark"
                      android_material_icon_name="close"
                      size={12}
                      color={colors.text}
                    />
                  </TouchableOpacity>
                </View>
              )}
              {showToSuggestions && toSuggestions.length > 0 && (
                <View style={styles.routeSuggestionsContainer}>
                  <ScrollView 
                    style={styles.routeSuggestionsList}
                    keyboardShouldPersistTaps="always"
                    nestedScrollEnabled={true}
                  >
                    {toSuggestions.map((city, index) => (
                      <TouchableOpacity
                        key={`${city}-${index}`}
                        style={styles.routeSuggestionItem}
                        onPress={() => handleToSelect(city)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.routeSuggestionText} numberOfLines={1}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
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
              <Text style={styles.sortButtonText}>{sortDisplayText}</Text>
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
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.iconButton, hasActiveFilters && styles.iconButtonActive]}
          onPress={() => {
            console.log('TravelScreen: Navigate to travel filters');
            safePush({
              pathname: '/travel-filters',
              params: { filters: params.filters || '', fromCity: selectedFrom, toCity: selectedTo }
            });
          }}
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
          onPress={() => {
            console.log('TravelScreen: Navigate to post travel');
            safePush('/post-travel');
          }}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add-circle"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.separator} />

      {loading && posts.length === 0 ? (
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
                <Text style={styles.emptyEmoji}>✈️</Text>
                <Text style={styles.emptyTitle}>No travel buddy matches found</Text>
                <Text style={styles.emptySubtitle}>Post a request to connect with others!</Text>
                <TouchableOpacity
                  style={styles.requestButton}
                  onPress={() => {
                    console.log('TravelScreen: Navigate to post travel from empty state');
                    safePush('/post-travel');
                  }}
                >
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

      {/* Travel Disclaimer Modal */}
      <Modal
        visible={showDisclaimerModal}
        onClose={() => {}}
        title="Travel Coordination Disclaimer"
        message={TRAVEL_DISCLAIMER}
        confirmText="I understand and agree"
        onConfirm={handleAcceptTravelDisclaimer}
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
    flex: 0,
  },
  pageHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeaderRight: {
    flex: 0,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeButtonContainer: {
    position: 'relative',
    minWidth: Platform.OS === 'android' ? 82 : 90,
    maxWidth: Platform.OS === 'android' ? 122 : 130,
  },
  routeInput: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 28,
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
    textAlign: 'center',
    borderWidth: 0,
    minWidth: 72,
  },
  routeSelectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    backgroundColor: colors.card,
    borderRadius: 999,
    minHeight: 28,
    borderWidth: 0,
    overflow: 'hidden',
    maxWidth: '100%',
  },
  routeSelectedText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
    textAlign: 'center',
    flex: 1,
  },
  routeSuggestionsContainer: {
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
  routeSuggestionsList: {
    maxHeight: 200,
  },
  routeSuggestionItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  routeSuggestionText: {
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
  endOfListText: {
    textAlign: 'center',
    paddingVertical: 24,
    color: colors.textSecondary,
    fontSize: 13,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDisabled: {
    opacity: 0.5,
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
