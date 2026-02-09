
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

export default function TravelFiltersScreen() {
  const router = useRouter();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelType, setTravelType] = useState<'all' | 'looking_for_buddy' | 'offering_companionship'>('all');

  console.log('[TravelFiltersScreen] Rendering', { fromCity, toCity, travelType });

  const handleApply = () => {
    console.log('[TravelFiltersScreen] Applying filters', { fromCity, toCity, travelType });
    // TODO: Pass filters back to feed screen
    router.back();
  };

  const handleReset = () => {
    console.log('[TravelFiltersScreen] Resetting filters');
    setFromCity('');
    setToCity('');
    setTravelType('all');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Route</Text>
        <TextInput
          style={styles.input}
          placeholder="From City"
          placeholderTextColor={colors.textLight}
          value={fromCity}
          onChangeText={setFromCity}
        />
        <TextInput
          style={styles.input}
          placeholder="To City"
          placeholderTextColor={colors.textLight}
          value={toCity}
          onChangeText={setToCity}
        />

        <Text style={styles.sectionTitle}>Travel Type</Text>
        <TouchableOpacity
          style={[styles.typeOption, travelType === 'all' && styles.typeOptionActive]}
          onPress={() => setTravelType('all')}
        >
          <Text style={[styles.typeText, travelType === 'all' && styles.typeTextActive]}>
            All Types
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, travelType === 'looking_for_buddy' && styles.typeOptionActive]}
          onPress={() => setTravelType('looking_for_buddy')}
        >
          <Text style={[styles.typeText, travelType === 'looking_for_buddy' && styles.typeTextActive]}>
            Looking for Buddy
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, travelType === 'offering_companionship' && styles.typeOptionActive]}
          onPress={() => setTravelType('offering_companionship')}
        >
          <Text style={[styles.typeText, travelType === 'offering_companionship' && styles.typeTextActive]}>
            Offering Companionship
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
          <Text style={styles.resetButtonText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
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
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  typeOption: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  typeOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeText: {
    ...typography.body,
    color: colors.text,
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
  },
  applyButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
