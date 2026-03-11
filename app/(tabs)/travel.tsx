
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, TextInput, ActivityIndicator, RefreshControl, Modal as RNModal, Keyboard } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { authenticatedGet, authenticatedPost, authenticatedDelete, apiGet } from '@/utils/api';
import { formatDateToDDMMYYYY, parseDateFromDDMMYYYY, getCityCode } from '@/utils/cities';
import { useAuth } from '@/contexts/AuthContext';
import Modal from '@/components/ui/Modal';

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

const TRAVEL_DISCLAIMER = `LokaLinc provides a digital platform enabling users to connect and coordinate independently.

Users are solely responsible for compliance with all applicable laws, airline policies, and customs regulations. The transport of illegal, restricted, hazardous, or commercially regulated goods is strictly prohibited. Offered/Received incentives do not constitute employment, commercial transport fees, or service engagement by the platform.

No responsibility or liability is assumed for loss, damage, delay, disputes, or legal consequences arising from arrangements made between users.`;

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

  // Disclaimer state
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [disclaimerCheckLoading, setDisclaimerCheckLoading] = useState(true);

  const [selectedFrom, setSelectedFrom] = useState<string>(() => {
    // Initialize from city from params if available (preserved from filter page navigation)
    return typeof params.fromCity === 'string' ? params.fromCity : '';
  });
  const [selectedTo, setSelectedTo] = useState<string>(() => {
    // Initialize to city from params if available (preserved from filter page navigation)
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
      } catch (error) {
        console.error('TravelScreen: Error checking disclaimer:', error);
        // If error, assume not accepted and show disclaimer
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
    } catch (error) {
      console.error('TravelScreen: Error accepting travel disclaimer:', error);
    }
  };

  console.log('TravelScreen: Rendering', { postsCount: posts.length, loading, selectedFrom, selectedTo });

  const fetchPosts = React.useCallback(async () => {
    console.log('TravelScreen: Fetching travel posts');
    if (posts.length === 0) {
      setLoading(true);
    }
    try {
      // DO NOT pass From/To to backend - route filtering is done on frontend only
      const filterParams = params.filters ? `?${params.filters}` : '';
      
      const data = await authenticatedGet<TravelPost[]>(`/api/travel-posts${filterParams}`);
      console.log('TravelScreen: Fetched travel posts', data);
      const dataArray = Array.isArray(data) ? data : [];
      
      setPosts(dataArray);
    } catch (error) {
      console.error('TravelScreen: Error fetching travel posts', error);
      if (posts.length === 0) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params.filters, posts.length]);

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
  }, [params.filters]);

  useFocusEffect(
    React.useCallback(() => {
      console.log('TravelScreen: Screen focused, refreshing posts');
      fetchPosts();
      fetchFavorites();
    }, [fetchPosts, fetchFavorites])
  );

  // Country-to-cities mapping for expanded country filtering
  const COUNTRY_CITIES: { [country: string]: string[] } = {
    'India': ['Ahmedabad', 'Bengaluru', 'Chennai', 'Delhi', 'Goa', 'Hyderabad', 'Kochi', 'Kolkata', 'Mumbai', 'Thiruvananthapuram'],
    'Germany': ['Berlin', 'Cologne', 'Düsseldorf', 'Frankfurt', 'Hamburg', 'Hannover', 'Munich', 'Stuttgart'],
  };

  // Returns all city names that match the selection (expands country to its cities)
  const getMatchingCities = (selection: string): string[] => {
    const countryCities = COUNTRY_CITIES[selection];
    if (countryCities) {
      // Include both the country name itself and all its cities
      return [selection, ...countryCities];
    }
    return [selection];
  };

  // Apply from/to filter and sorting on the frontend
  const filteredAndSortedPosts = useMemo(() => {
    console.log('TravelScreen: Applying from/to filter and sorting', { selectedFrom, selectedTo, sortOption });
    
    // Step 1: Apply from/to filter with country expansion
    let filtered = posts;
    if (selectedFrom) {
      const matchingFromCities = getMatchingCities(selectedFrom);
      console.log('TravelScreen: Matching fromCity values:', matchingFromCities);
      filtered = filtered.filter(p =>
        matchingFromCities.some(city => city.toLowerCase() === p.fromCity.toLowerCase())
      );
    }
    if (selectedTo) {
      const matchingToCities = getMatchingCities(selectedTo);
      console.log('TravelScreen: Matching toCity values:', matchingToCities);
      filtered = filtered.filter(p =>
        matchingToCities.some(city => city.toLowerCase() === p.toCity.toLowerCase())
      );
    }
    
    // Step 2: Apply search query filter
    filtered = filtered.filter(post =>
      post.fromCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.toCity.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.description && post.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    // Step 3: Apply sorting
    const parseDateStr = (dateStr: string | null | undefined): number => {
      if (!dateStr) return 0;
      
      let day, month, year;
      
      if (dateStr.includes('-')) {
        [year, month, day] = dateStr.split('-');
      } else {
        [day, month, year] = dateStr.split('.');
      }
      
      return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
    };

    let sorted = [...filtered];
    if (sortOption === 'Newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortOption === 'Earliest departure') {
      sorted.sort((a, b) => {
        const startA = parseDateStr(a.travelDate);
        const startB = parseDateStr(b.travelDate);
        const startDateComparison = startA - startB;
        if (startDateComparison !== 0) return startDateComparison;

        const endA = parseDateStr(a.travelDateTo || a.travelDate);
        const endB = parseDateStr(b.travelDateTo || b.travelDate);
        return endA - endB;
      });
    } else if (sortOption === 'Latest departure') {
      sorted.sort((a, b) => {
        const endA = parseDateStr(a.travelDateTo || a.travelDate);
        const endB = parseDateStr(b.travelDateTo || b.travelDate);
        const endDateComparison = endB - endA;
        if (endDateComparison !== 0) return endDateComparison;

        const startA = parseDateStr(a.travelDate);
        const startB = parseDateStr(b.travelDate);
        return startB - startA;
      });
    }
    
    return sorted;
  }, [posts, selectedFrom, selectedTo, sortOption, searchQuery]);

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

  const handleFromInputChange = async (text: string) => {
    setFromInputValue(text);
    
    if (text.trim().length > 0) {
      try {
        const response = await apiGet<{ cities: string[] }>(`/api/cities/search?q=${encodeURIComponent(text)}&limit=8&type=travel`);
        setFromSuggestions(response.cities);
        setShowFromSuggestions(response.cities.length > 0);
      } catch (error) {
        console.error('TravelScreen: Error searching from cities:', error);
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
      } catch (error) {
        console.error('TravelScreen: Error searching to cities:', error);
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
    console.log('TravelScreen: Clear from selection');
    setSelectedFrom('');
    setFromInputValue('');
    setShowFromSuggestions(false);
  };

  const handleClearTo = () => {
    console.log('TravelScreen: Clear to selection');
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
    setSortOption(option);
    setShowSortModal(false);
  };
  
  const hasActiveFilters = params.filters && params.filters.toString().length > 0;
  
  const sortDisplayText = sortOption === 'Earliest departure' ? 'Earliest dep..' : sortOption === 'Latest departure' ? 'Latest dep..' : sortOption;

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
        </View>
        <TouchableOpacity
          style={[styles.iconButton, hasActiveFilters && styles.iconButtonActive]}
          onPress={() => router.push({
            pathname: '/travel-filters',
            params: { filters: params.filters || '', fromCity: selectedFrom, toCity: selectedTo }
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

      <View style={styles.separator} />

      {loading && posts.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filteredAndSortedPosts.length === 0 ? (
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
          {filteredAndSortedPosts.map((post) => {

            console.log('Travel expiry check', {
              id: post.id,
              type: post.type,
              travelDate: post.travelDate,
              travelDateTo: post.travelDateTo,
            });
          
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

            // Determine expiry date
            const expiryDateStr =
              post.type === 'offering'
                ? post.travelDate
                : post.travelDateTo || post.travelDate;
            
            if (expiryDateStr) {

              let expiryDate;

              if (expiryDateStr.includes('-')) {
                // YYYY-MM-DD from backend
                const [year, month, day] = expiryDateStr.split('-');
                expiryDate = new Date(Number(year), Number(month) - 1, Number(day));
              } else {
                // DD.MM.YYYY
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
                key={post.id}
                style={[styles.card, isExpired && styles.cardDisabled]}
                onPress={() => !isExpired && router.push(`/travel/${post.id}`)}
                disabled={isExpired}
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
  },
  routeSelectedText: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '500',
    lineHeight: 14,
    textAlign: 'center',
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
});
