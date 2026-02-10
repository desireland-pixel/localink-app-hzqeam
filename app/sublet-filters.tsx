
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { CitySearchInput } from '@/components/CitySearchInput';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY } from '@/utils/cities';

export default function SubletFiltersScreen() {
  const router = useRouter();
  const [subletType, setSubletType] = useState<'offering' | 'seeking' | null>(null);
  const [city, setCity] = useState('');
  const [dateStart, setDateStart] = useState<Date | null>(null);
  const [dateEnd, setDateEnd] = useState<Date | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [cityRegistration, setCityRegistration] = useState<boolean | null>(null);

  console.log('[SubletFiltersScreen] Rendering', { subletType, city, minRent, maxRent });

  const handleApply = () => {
    console.log('[SubletFiltersScreen] Applying filters', { subletType, city, dateStart, dateEnd, minRent, maxRent, cityRegistration });
    // TODO: Pass filters back to feed screen
    router.back();
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

  const dateStartDisplay = dateStart ? formatDateToDDMMYYYY(dateStart) : 'Select start date';
  const dateEndDisplay = dateEnd ? formatDateToDDMMYYYY(dateEnd) : 'Select end date';

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
            <Text style={styles.label}>Start</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateButtonText}>{dateStartDisplay}</Text>
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
            <Text style={styles.label}>End</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateButtonText}>{dateEndDisplay}</Text>
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

        <Text style={styles.sectionTitle}>Rent (€/month)</Text>
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Min</Text>
            <TextInput
              style={styles.input}
              placeholder="Min"
              placeholderTextColor={colors.textLight}
              value={minRent}
              onChangeText={setMinRent}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.separator} />
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Max</Text>
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
    paddingTop: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  radioButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
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
    alignItems: 'flex-end',
    marginBottom: spacing.md,
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
