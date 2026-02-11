
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { CitySearchInput } from '@/components/CitySearchInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY } from '@/utils/cities';

export default function TravelFiltersScreen() {
  const router = useRouter();
  const [companionshipType, setCompanionshipType] = useState<'offering' | 'seeking' | null>(null);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  console.log('[TravelFiltersScreen] Rendering', { companionshipType, fromCity, toCity });

  const handleApply = () => {
    console.log('[TravelFiltersScreen] Applying filters', { companionshipType, fromCity, toCity, dateStart, dateEnd });
    
    // Build query params
    const params = new URLSearchParams();
    if (companionshipType) params.append('type', companionshipType);
    if (fromCity) params.append('fromCity', fromCity);
    if (toCity) params.append('toCity', toCity);
    if (dateStart) params.append('travelDateFrom', dateStart.toISOString().split('T')[0]);
    if (dateEnd) params.append('travelDateTo', dateEnd.toISOString().split('T')[0]);
    
    const filterString = params.toString();
    console.log('[TravelFiltersScreen] Filter string:', filterString);
    
    // Navigate back with filters
    router.push({
      pathname: '/(tabs)/travel',
      params: { filters: filterString }
    });
  };

  const handleReset = () => {
    console.log('[TravelFiltersScreen] Resetting filters');
    setCompanionshipType(null);
    setFromCity('');
    setToCity('');
    setDateStart(null);
    setDateEnd(null);
  };

  const dateStartDisplay = dateStart ? formatDateToDDMMYYYY(dateStart) : '';
  const dateEndDisplay = dateEnd ? formatDateToDDMMYYYY(dateEnd) : '';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Companionship</Text>
        <View style={styles.radioButtons}>
          <TouchableOpacity
            style={[styles.typeOption, companionshipType === 'offering' && styles.typeOptionActive]}
            onPress={() => setCompanionshipType('offering')}
          >
            <Text style={[styles.typeText, companionshipType === 'offering' && styles.typeTextActive]}>
              Offering
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, companionshipType === 'seeking' && styles.typeOptionActive]}
            onPress={() => setCompanionshipType('seeking')}
          >
            <Text style={[styles.typeText, companionshipType === 'seeking' && styles.typeTextActive]}>
              Seeking
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>From</Text>
        <CitySearchInput
          value={fromCity}
          onChangeText={setFromCity}
          placeholder="Search city or type India/Germany..."
        />

        <Text style={styles.sectionTitle}>To</Text>
        <CitySearchInput
          value={toCity}
          onChangeText={setToCity}
          placeholder="Search city or type India/Germany..."
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
          <View style={styles.separatorContainer}>
            <Text style={styles.separatorText}>-</Text>
          </View>
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
  radioButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  halfWidth: {
    flex: 1,
  },
  separatorContainer: {
    width: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separatorText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
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
