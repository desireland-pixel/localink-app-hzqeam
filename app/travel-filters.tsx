
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY } from '@/utils/cities';

export default function TravelFiltersScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  // Preserve from/to city filters from the travel page (they are independent)
  const preservedFromCity = typeof params.fromCity === 'string' ? params.fromCity : '';
  const preservedToCity = typeof params.toCity === 'string' ? params.toCity : '';
  const [role, setRole] = useState<'offering' | 'seeking' | null>(null);
  const [types, setTypes] = useState<Set<'companionship' | 'ally'>>(new Set());
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [incentive, setIncentive] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);

  console.log('[TravelFiltersScreen] Rendering', { role, types: Array.from(types), hydrated });
  
  // Use useFocusEffect to reinitialize filter state every time screen gains focus
  useFocusEffect(
    useCallback(() => {
      console.log('[TravelFiltersScreen] Screen focused, hydrating filters from params', params.filters);
      setHydrated(false);
      
      // Reset all filters first
      setRole(null);
      setTypes(new Set());
      setDateStart(null);
      setDateEnd(null);
      setIncentive(null);
      
      if (params.filters) {
        const filterString = params.filters as string;
        const urlParams = new URLSearchParams(filterString);
        
        const roleParam = urlParams.get('role');
        if (roleParam === 'offering' || roleParam === 'seeking') {
          console.log('[TravelFiltersScreen] Setting role:', roleParam);
          setRole(roleParam);
        }
        
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
            console.log('[TravelFiltersScreen] Setting types:', Array.from(newTypes));
            setTypes(newTypes);
          }
        }
        
        const fromDate = urlParams.get('travelDateFrom');
        if (fromDate) {
          console.log('[TravelFiltersScreen] Setting dateStart:', fromDate);
          setDateStart(new Date(fromDate));
        }
        
        const toDate = urlParams.get('travelDateTo');
        if (toDate) {
          console.log('[TravelFiltersScreen] Setting dateEnd:', toDate);
          setDateEnd(new Date(toDate));
        }
        
        const incentiveParam = urlParams.get('incentive');
        if (incentiveParam === 'true') {
          console.log('[TravelFiltersScreen] Setting incentive: true');
          setIncentive(true);
        } else if (incentiveParam === 'false') {
          console.log('[TravelFiltersScreen] Setting incentive: false');
          setIncentive(false);
        }
      }
      
      setHydrated(true);
    }, [params.filters])
  );

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
    console.log('[TravelFiltersScreen] Applying filters', { role, types: Array.from(types), dateStart, dateEnd });
    
    const params = new URLSearchParams();
    
    if (role) {
      params.append('role', role);
    }
    
    if (types.size > 0) {
      const typeArray = Array.from(types);
      params.append('type', typeArray.join(','));
    }
    
    if (dateStart) params.append('travelDateFrom', dateStart.toISOString().split('T')[0]);
    if (dateEnd) params.append('travelDateTo', dateEnd.toISOString().split('T')[0]);
    if (incentive !== null) params.append('incentive', String(incentive));
    
    const filterString = params.toString();
    console.log('[TravelFiltersScreen] Filter string:', filterString);
    
    router.replace({
      pathname: '/(tabs)/travel',
      params: { filters: filterString, fromCity: preservedFromCity, toCity: preservedToCity }
    });
  };

  const handleReset = () => {
    console.log('[TravelFiltersScreen] Resetting filters');
    setRole(null);
    setTypes(new Set());
    setDateStart(null);
    setDateEnd(null);
    setIncentive(null);
  };

  const dateStartDisplay = dateStart ? formatDateToDDMMYYYY(dateStart) : '';
  const dateEndDisplay = dateEnd ? formatDateToDDMMYYYY(dateEnd) : '';
  
  const hasActiveFilters = role !== null || types.size > 0 || dateStart !== null || dateEnd !== null || incentive !== null;

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
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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

        <Text style={styles.sectionTitle}>Incentive</Text>
        <View style={styles.radioButtons}>
          <TouchableOpacity
            style={[styles.typeOption, incentive === true && styles.typeOptionActive]}
            onPress={() => setIncentive(true)}
          >
            <Text style={[styles.typeText, incentive === true && styles.typeTextActive]}>
              Yes
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeOption, incentive === false && styles.typeOptionActive]}
            onPress={() => setIncentive(false)}
          >
            <Text style={[styles.typeText, incentive === false && styles.typeTextActive]}>
              No
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

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
  keyboardView: {
    flex: 1,
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
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
    justifyContent: 'center',
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
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 9 : 5,
    marginBottom: Platform.OS === 'ios' ? 2 : -1,
  },
  resetButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    height: 40,
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  resetButtonText: {
    ...typography.button,
    color: colors.text,
  },
  applyButton: {
    flex: 2,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    marginTop: Platform.OS === 'ios' ? 4 : 0,
  },
  applyButtonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
