
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { CitySearchInput } from '@/components/CitySearchInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY } from '@/utils/cities';

export default function SubletFiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [subletType, setSubletType] = useState<'offering' | 'seeking' | null>(null);
  const [city, setCity] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [cityRegistration, setCityRegistration] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);

  console.log('[SubletFiltersScreen] Rendering', { subletType, city, minRent, maxRent, cityRegistration, hydrated });
  
  // Use useFocusEffect to reinitialize filter state every time screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('[SubletFiltersScreen] Screen focused, hydrating filters from params', params.filters);
      setHydrated(false);
      
      // Reset all filters first
      setSubletType(null);
      setCity('');
      setDateStart(null);
      setDateEnd(null);
      setMinRent('');
      setMaxRent('');
      setCityRegistration(null);
      
      if (params.filters) {
        const filterString = params.filters as string;
        const urlParams = new URLSearchParams(filterString);
        
        const type = urlParams.get('type');
        if (type === 'offering' || type === 'seeking') {
          console.log('[SubletFiltersScreen] Setting subletType:', type);
          setSubletType(type);
        }
        
        const cityParam = urlParams.get('city');
        if (cityParam) {
          console.log('[SubletFiltersScreen] Setting city:', cityParam);
          setCity(cityParam);
        }
        
        const fromDate = urlParams.get('availableFrom');
        if (fromDate) {
          console.log('[SubletFiltersScreen] Setting dateStart:', fromDate);
          setDateStart(new Date(fromDate));
        }
        
        const toDate = urlParams.get('availableTo');
        if (toDate) {
          console.log('[SubletFiltersScreen] Setting dateEnd:', toDate);
          setDateEnd(new Date(toDate));
        }
        
        const minRentParam = urlParams.get('minRent');
        if (minRentParam) {
          console.log('[SubletFiltersScreen] Setting minRent:', minRentParam);
          setMinRent(minRentParam);
        }
        
        const maxRentParam = urlParams.get('maxRent');
        if (maxRentParam) {
          console.log('[SubletFiltersScreen] Setting maxRent:', maxRentParam);
          setMaxRent(maxRentParam);
        }
        
        const cityReg = urlParams.get('cityRegistrationRequired');
        if (cityReg === 'yes') {
          console.log('[SubletFiltersScreen] Setting cityRegistration: true');
          setCityRegistration(true);
        } else if (cityReg === 'no') {
          console.log('[SubletFiltersScreen] Setting cityRegistration: false');
          setCityRegistration(false);
        }
      }
      
      setHydrated(true);
    }, [params.filters])
  );

  const handleApply = () => {
    console.log('[SubletFiltersScreen] Applying filters', { subletType, city, dateStart, dateEnd, minRent, maxRent, cityRegistration });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (dateStart) {
      const startDate = new Date(dateStart);
      startDate.setHours(0, 0, 0, 0);
      
      if (startDate < today) {
        alert('Start date cannot be older than today');
        return;
      }
    }
    
    if (dateStart && dateEnd) {
      const startDate = new Date(dateStart);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(dateEnd);
      endDate.setHours(0, 0, 0, 0);
      
      if (endDate <= startDate) {
        alert('End date must be after start date');
        return;
      }
    }
    
    const params = new URLSearchParams();
    if (subletType) params.append('type', subletType);
    if (city) params.append('city', city);
    if (dateStart) params.append('availableFrom', dateStart.toISOString().split('T')[0]);
    if (dateEnd) params.append('availableTo', dateEnd.toISOString().split('T')[0]);
    if (minRent) params.append('minRent', minRent);
    if (maxRent) params.append('maxRent', maxRent);
    if (cityRegistration !== null) params.append('cityRegistrationRequired', cityRegistration ? 'yes' : 'no');
    
    const filterString = params.toString();
    console.log('[SubletFiltersScreen] Filter string:', filterString);
    
    router.replace({
      pathname: '/(tabs)/sublet',
      params: { filters: filterString }
    });
  };

  const handleReset = () => {
    console.log('[SubletFiltersScreen] Resetting filters');
    setSubletType(null);
    setCity('');
    setDateStart(null);
    setDateEnd(null);
    setMinRent('');
    setMaxRent('');
    setCityRegistration(null);
  };

  const dateStartDisplay = dateStart ? formatDateToDDMMYYYY(dateStart) : '';
  const dateEndDisplay = dateEnd ? formatDateToDDMMYYYY(dateEnd) : '';
  
  const hasActiveFilters = subletType !== null || city !== '' || dateStart !== null || dateEnd !== null || minRent !== '' || maxRent !== '' || cityRegistration !== null;

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
        <Text style={styles.sectionTitle}>Sublet</Text>
        <View style={styles.radioButtons}>
          <TouchableOpacity
            style={[styles.typeOption, subletType === 'offering' && styles.typeOptionActive]}
            onPress={() => setSubletType('offering')}
          >
            <Text style={[styles.typeText, subletType === 'offering' && styles.typeTextActive]}>
              Offering
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, subletType === 'seeking' && styles.typeOptionActive]}
            onPress={() => setSubletType('seeking')}
          >
            <Text style={[styles.typeText, subletType === 'seeking' && styles.typeTextActive]}>
              Seeking
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>City</Text>
        <CitySearchInput
          value={city}
          onChangeText={setCity}
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
                minimumDate={new Date()}
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
                value={dateEnd || dateStart || new Date()}
                mode="date"
                display="default"
                minimumDate={dateStart || new Date()}
                onChange={(event, selectedDate) => {
                  setShowEndPicker(false);
                  if (selectedDate) setDateEnd(selectedDate);
                }}
              />
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rent (€/month)</Text>
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <TextInput
              style={styles.input}
              placeholder="Min"
              placeholderTextColor={colors.textLight}
              value={minRent}
              onChangeText={setMinRent}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.separatorContainer}>
            <Text style={styles.separatorText}>-</Text>
          </View>
          <View style={styles.halfWidth}>
            <TextInput
              style={styles.input}
              placeholder="Max"
              placeholderTextColor={colors.textLight}
              value={maxRent}
              onChangeText={setMaxRent}
              keyboardType="numeric"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>City registration required</Text>
        <View style={styles.radioButtons}>
          <TouchableOpacity
            style={[styles.typeOption, cityRegistration === true && styles.typeOptionActive]}
            onPress={() => setCityRegistration(true)}
          >
            <Text style={[styles.typeText, cityRegistration === true && styles.typeTextActive]}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, cityRegistration === false && styles.typeOptionActive]}
            onPress={() => setCityRegistration(false)}
          >
            <Text style={[styles.typeText, cityRegistration === false && styles.typeTextActive]}>
              No
            </Text>
          </TouchableOpacity>
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
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    fontWeight: '600',
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
    fontSize: 14,
    color: colors.text,
  },
  typeTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
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
