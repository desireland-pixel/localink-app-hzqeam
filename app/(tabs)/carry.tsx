
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function CarryScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCity, setSelectedCity] = useState('Berlin');
  const [selectedType, setSelectedType] = useState<'request' | 'traveler'>('request');

  console.log('CarryScreen: Rendering', { selectedType });

  const onRefresh = async () => {
    console.log('CarryScreen: Refreshing feed', { selectedType });
    setRefreshing(true);
    // TODO: Backend Integration - GET /api/carry?city=Berlin&type=request&status=active → [{ id, type, title, description, fromCity, toCity, travelDate, itemType, user: { name } }]
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handlePostCarry = () => {
    console.log('CarryScreen: Navigate to post carry');
    router.push('/post-carry');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Carry & Send</Text>
        <TouchableOpacity onPress={handlePostCarry} style={styles.postButton}>
          <IconSymbol 
            ios_icon_name="plus" 
            android_material_icon_name="add" 
            size={24} 
            color="#FFFFFF" 
          />
        </TouchableOpacity>
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, selectedType === 'request' && styles.toggleButtonActive]}
          onPress={() => setSelectedType('request')}
        >
          <Text style={[styles.toggleText, selectedType === 'request' && styles.toggleTextActive]}>
            Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, selectedType === 'traveler' && styles.toggleButtonActive]}
          onPress={() => setSelectedType('traveler')}
        >
          <Text style={[styles.toggleText, selectedType === 'traveler' && styles.toggleTextActive]}>
            Travelers
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.citySelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'].map((city) => {
            const isSelected = selectedCity === city;
            return (
              <TouchableOpacity
                key={city}
                style={[styles.cityChip, isSelected && styles.cityChipSelected]}
                onPress={() => setSelectedCity(city)}
              >
                <Text style={[styles.cityChipText, isSelected && styles.cityChipTextSelected]}>
                  {city}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>
            {selectedType === 'request' ? 'No requests yet' : 'No travelers yet'}
          </Text>
          <Text style={styles.emptyText}>
            {selectedType === 'request' 
              ? 'Be the first to request an item in ' + selectedCity + '!'
              : 'Be the first to offer carrying items in ' + selectedCity + '!'}
          </Text>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  postButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  citySelector: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  cityChip: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  cityChipText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  cityChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
