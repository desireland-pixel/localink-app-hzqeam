
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

export default function SubletFiltersScreen() {
  const router = useRouter();
  const [city, setCity] = useState('Berlin');
  const [minRent, setMinRent] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [noAnmeldung, setNoAnmeldung] = useState(false);

  console.log('[SubletFiltersScreen] Rendering', { city, minRent, maxRent, noAnmeldung });

  const handleApply = () => {
    console.log('[SubletFiltersScreen] Applying filters', { city, minRent, maxRent, noAnmeldung });
    // TODO: Pass filters back to feed screen
    router.back();
  };

  const handleReset = () => {
    console.log('[SubletFiltersScreen] Resetting filters');
    setCity('Berlin');
    setMinRent('');
    setMaxRent('');
    setNoAnmeldung(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="City"
          placeholderTextColor={colors.textLight}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.sectionTitle}>Rent Range (€/month)</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Min"
            placeholderTextColor={colors.textLight}
            value={minRent}
            onChangeText={setMinRent}
            keyboardType="numeric"
          />
          <View style={styles.separator} />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Max"
            placeholderTextColor={colors.textLight}
            value={maxRent}
            onChangeText={setMaxRent}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>No Anmeldung Required</Text>
          <Switch
            value={noAnmeldung}
            onValueChange={setNoAnmeldung}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor="#FFFFFF"
          />
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  halfInput: {
    flex: 1,
  },
  separator: {
    width: spacing.md,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  switchLabel: {
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
