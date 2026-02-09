
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function SubletScreen() {
  const router = useRouter();
  const [selectedCity, setSelectedCity] = useState('Berlin');

  console.log('[SubletScreen] Rendering');

  const handlePostSublet = () => {
    console.log('[SubletScreen] Navigate to post sublet');
    router.push('/post-sublet');
  };

  const handleFilters = () => {
    console.log('[SubletScreen] Navigate to filters');
    router.push('/sublet-filters');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Sublet</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={handleFilters} style={styles.iconButton}>
            <IconSymbol 
              ios_icon_name="line.3.horizontal.decrease.circle" 
              android_material_icon_name="filter-list" 
              size={22} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePostSublet} style={styles.addButton}>
            <IconSymbol 
              ios_icon_name="plus" 
              android_material_icon_name="add" 
              size={22} 
              color="#FFFFFF" 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.citySelector}
        contentContainerStyle={styles.citySelectorContent}
      >
        {['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'].map((city) => {
          const isSelected = selectedCity === city;
          return (
            <TouchableOpacity
              key={city}
              style={[styles.cityChip, isSelected && styles.cityChipSelected]}
              onPress={() => {
                console.log('[SubletScreen] City selected:', city);
                setSelectedCity(city);
              }}
            >
              <Text style={[styles.cityChipText, isSelected && styles.cityChipTextSelected]}>
                {city}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>No sublets yet</Text>
          <Text style={styles.emptyText}>
            Be the first to post a sublet in {selectedCity}!
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handlePostSublet}>
            <Text style={styles.emptyButtonText}>Create your first post</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  citySelector: {
    maxHeight: 60,
    paddingVertical: spacing.md,
  },
  citySelectorContent: {
    paddingHorizontal: spacing.lg,
  },
  cityChip: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  cityChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
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
