
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { CitySearchInput } from '@/components/CitySearchInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY } from '@/utils/cities';

export default function TravelFiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [role, setRole] = useState<'offering' | 'seeking' | null>(null);
  const [types, setTypes] = useState<Set<'companionship' | 'ally'>>(new Set());
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  console.log('[TravelFiltersScreen] Rendering', { role, types, fromCity, toCity });
  
  // Load existing filters from params
  useEffect(() => {
    if (params.filters) {
      const filterString = params.filters as string;
      const urlParams = new URLSearchParams(filterString);
      
      const roleParam = urlParams.get('role');
      if (roleParam === 'offering' || roleParam === 'seeking') {
        setRole(roleParam);
      }
      
      // Check for type parameter
      const typeParam = urlParams.get('type');
      if (typeParam) {
        const newTypes = new Set<'companionship' | 'ally'>();
        if (typeParam.includes('companionship')) {
          newTypes.add('companionship');
        }
        if (typeParam.includes('ally')) {
          newTypes.add('ally');
        }
        if (newTypes.size > 0) {
          setTypes(newTypes);
        }
      }
      
      const from = urlParams.get('fromCity');
      if (from) setFromCity(from);
      
      const to = urlParams.get('toCity');
      if (to) setToCity(to);
      
      const fromDate = urlParams.get('travelDateFrom');
      if (fromDate) setDateStart(new Date(fromDate));
      
      const toDate = urlParams.get('travelDateTo');
      if (toDate) setDateEnd(new Date(toDate));
    }
  }, []);

  const toggleType = (type: 'companionship' | 'ally') => {
    const newTypes = new Set(types);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setTypes(newTypes);
  };

  const handleApply = () => {
    console.log('[TravelFiltersScreen] Applying filters', { role, types, fromCity, toCity, dateStart, dateEnd });
    
    // Build query params
    const params = new URLSearchParams();
    
    // Add role filter
    if (role) {
      params.append('role', role);
    }
    
    // Add type filter - send as comma-separated string
    if (types.size > 0) {
      const typeArray = Array.from(types);
      params.append('type', typeArray.join(','));
    }
    
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
    setRole(null);
    setTypes(new Set());
    setFromCity('');
    setToCity('');
    setDateStart(null);
    setDateEnd(null);
  };

  const dateStartDisplay = dateStart ? formatDateToDDMMYYYY(dateStart) : '';
  const dateEndDisplay = dateEnd ? formatDateToDDMMYYYY(dateEnd) : '';
  
  // Check if any filters are active
  const hasActiveFilters = role !== null || types.size > 0 || fromCity !== '' || toCity !== '' || dateStart !== null || dateEnd !== null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Role</Text>
        <View style={styles.radioButtons}>
          <TouchableOpacity
            style={[styles.typeOption, role === 'offering' && styles.typeOptionActive]}
            onPress={() => setRole('offering')}
          >
            <Text style={[styles.typeText, role === 'offering' && styles.typeTextActive]}>
              Offering
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, role === 'seeking' && styles.typeOptionActive]}
            onPress={() => setRole('seeking')}
          >
            <Text style={[styles.typeText, role === 'seeking' && styles.typeTextActive]}>
              Seeking
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Type</Text>
        <View style={styles.radioButtons}>
          <TouchableOpacity
            style={[styles.typeOption, types.has('companionship') && styles.typeOptionActive]}
            onPress={() => toggleType('companionship')}
          >
            <Text style={[styles.typeText, types.has('companionship') && styles.typeTextActive]}>
              👥
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, types.has('ally') && styles.typeOptionActive]}
            onPress={() => toggleType('ally')}
          >
            <Text style={[styles.typeText, types.has('ally') && styles.typeTextActive]}>
              📦
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>From</Text>
        <CitySearchInput
          value={fromCity}
          onChangeText={setFromCity}
          placeholder="Search city or type India/Germany..."
          cityType="travel"
        />

        <Text style={styles.sectionTitle}>To</Text>
        <CitySearchInput
          value={toCity}
          onChangeText={setToCity}
          placeholder="Search city or type India/Germany..."
          cityType="travel"
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
