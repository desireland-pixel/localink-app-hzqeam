
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { AppFooter } from '@/components/AppFooter';

const CATEGORIES = [
  'General',
  'Education',
  'Finance',
  'Healthcare',
  'Housing',
  'Insurance',
  'Jobs',
  'Visa',
];

export default function CommunityFiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Preserve city filter from the community page (city filter is independent)
  const preservedCity = typeof params.city === 'string' ? params.city : '';
  const [category, setCategory] = useState<string | null>(null);
  const [status, setStatus] = useState<'open' | 'closed' | null>(null);
  const [hydrated, setHydrated] = useState(false);

  console.log('[CommunityFiltersScreen] Rendering', { category, status, hydrated });

  // Use useFocusEffect to reinitialize filter state every time screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('[CommunityFiltersScreen] Screen focused, hydrating filters from params', params.filters);
      setHydrated(false);
      
      // Reset all filters first
      setCategory(null);
      setStatus(null);
      
      if (params.filters) {
        const filterString = params.filters as string;
        const urlParams = new URLSearchParams(filterString);
        
        const categoryParam = urlParams.get('category');
        if (categoryParam && CATEGORIES.includes(categoryParam)) {
          console.log('[CommunityFiltersScreen] Setting category:', categoryParam);
          setCategory(categoryParam);
        }
        
        const statusParam = urlParams.get('status');
        if (statusParam === 'open' || statusParam === 'closed') {
          console.log('[CommunityFiltersScreen] Setting status:', statusParam);
          setStatus(statusParam);
        }
      }
      
      setHydrated(true);
    }, [params.filters])
  );

  const handleApply = () => {
    console.log('[CommunityFiltersScreen] Applying filters', { category, status });
    
    const params = new URLSearchParams();
    
    if (category) {
      params.append('category', category);
    }
    
    if (status) {
      params.append('status', status);
    }
    
    const filterString = params.toString();
    console.log('[CommunityFiltersScreen] Filter string:', filterString);
    
    // Use router.back() instead of router.replace to preserve the header state
    router.back();
    
    // Pass filters via router.setParams after navigation
    setTimeout(() => {
      router.setParams({ filters: filterString, city: preservedCity });
    }, 100);
  };

  const handleReset = () => {
    console.log('[CommunityFiltersScreen] Resetting filters');
    setCategory(null);
    setStatus(null);
  };

  // Don't render inputs until hydration is complete
  if (!hydrated) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.content} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.radioButtons}>
          <TouchableOpacity
            style={[styles.typeOption, status === 'open' && styles.typeOptionActive]}
            onPress={() => setStatus('open')}
          >
            <Text style={[styles.typeText, status === 'open' && styles.typeTextActive]}>
              Open
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, status === 'closed' && styles.typeOptionActive]}
            onPress={() => setStatus('closed')}
          >
            <Text style={[styles.typeText, status === 'closed' && styles.typeTextActive]}>
              Closed
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Category</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryOption, category === cat && styles.categoryOptionActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <AppFooter style={styles.footer}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </AppFooter>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryOption: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    width: '48%',
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  categoryOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '400',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  radioButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  resetButtonText: {
    ...typography.button,
    color: colors.text,
  },
  applyButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
