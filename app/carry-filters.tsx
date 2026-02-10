
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { CitySearchInput } from '@/components/CitySearchInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY } from '@/utils/cities';

export default function CarryFiltersScreen() {
  const router = useRouter();
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [carryType, setCarryType] = useState<'all' | 'request' | 'traveler'>('all');

  console.log('[CarryFiltersScreen] Rendering', { fromCity, toCity, carryType });

  const handleApply = () => {
    console.log('[CarryFiltersScreen] Applying filters', { fromCity, toCity, dateStart, dateEnd, carryType });
    
    // Build query params
    const params = new URLSearchParams();
    if (fromCity) params.append('fromCity', fromCity);
    if (toCity) params.append('toCity', toCity);
    if (dateStart) params.append('travelDate', dateStart.toISOString().split('T')[0]);
    if (carryType !== 'all') params.append('type', carryType);
    
    // Navigate back with filters
    router.back();
    router.setParams({ filters: params.toString() });
  };

  const handleReset = () => {
    console.log('[CarryFiltersScreen] Resetting filters');
    setFromCity('');
    setToCity('');
    setDateStart(null);
    setDateEnd(null);
    setCarryType('all');
  };

  const dateStartDisplay = dateStart ? formatDateToDDMMYYYY(dateStart) : '';
  const dateEndDisplay = dateEnd ? formatDateToDDMMYYYY(dateEnd) : '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>From</Text>
        <CitySearchInput
          value={fromCity}
          onChangeText={setFromCity}
          placeholder="Search city..."
        />

        <Text style={styles.sectionTitle}>To</Text>
        <CitySearchInput
          value={toCity}
          onChangeText={setToCity}
          placeholder="Search city..."
        />

        <Text style={styles.sectionTitle}>Date</Text>
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={[styles.dateButtonText, !dateStartDisplay && styles.dateButtonPlaceholder]}>
                {dateStartDisplay || 'dd.mm.yyyy'}
              </Text>
            </TouchableOpacity>
            {showStartPicker && (
              <DateTimePicker
                value={dateStart || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartPicker(false);
                  if (selectedDate) setDateStart(selectedDate);
                }}
              />
            )}
          </View>
          <View style={styles.separator} />
          <View style={styles.halfWidth}>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={[styles.dateButtonText, !dateEndDisplay && styles.dateButtonPlaceholder]}>
                {dateEndDisplay || 'dd.mm.yyyy'}
              </Text>
            </TouchableOpacity>
            {showEndPicker && (
              <DateTimePicker
                value={dateEnd || new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) setDateEnd(selectedDate);
                }}
              />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Type</Text>
        <TouchableOpacity
          style={[styles.typeOption, carryType === 'all' && styles.typeOptionActive]}
          onPress={() => setCarryType('all')}
        >
          <Text style={[styles.typeText, carryType === 'all' && styles.typeTextActive]}>
            All Types
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, carryType === 'request' && styles.typeOptionActive]}
          onPress={() => setCarryType('request')}
        >
          <Text style={[styles.typeText, carryType === 'request' && styles.typeTextActive]}>
            Requests
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeOption, carryType === 'traveler' && styles.typeOptionActive]}
          onPress={() => setCarryType('traveler')}
        >
          <Text style={[styles.typeText, carryType === 'traveler' && styles.typeTextActive]}>
            Travelers
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
    paddingTop: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  separator: {
    width: spacing.md,
  },
  dateButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateButtonText: {
    ...typography.body,
    color: colors.text,
  },
  dateButtonPlaceholder: {
    color: colors.textLight,
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
