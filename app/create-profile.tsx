
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedPut } from '@/utils/api';
import Modal from '@/components/ui/Modal';

const GERMAN_CITIES = [
  'Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Stuttgart', 
  'Düsseldorf', 'Dortmund', 'Essen', 'Leipzig', 'Bremen', 'Dresden',
  'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bonn',
  'Bielefeld', 'Mannheim', 'Karlsruhe', 'Münster', 'Wiesbaden', 'Augsburg'
];

export default function CreateProfileScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  console.log('[CreateProfile] Rendering, user:', user?.id);

  const handleSubmit = async () => {
    console.log('[CreateProfile] Submit profile', { name, city });
    
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!city.trim()) {
      setError('Please select your city');
      return;
    }

    if (!user) {
      setError('Authentication error. Please sign in again.');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[CreateProfile] Updating profile with:', { name, city });
      const result = await authenticatedPut('/api/profile', { name, city });
      console.log('[CreateProfile] Profile updated successfully:', result);
      
      console.log('[CreateProfile] Refreshing profile in context');
      await refreshProfile();
      
      console.log('[CreateProfile] Navigating to main app');
      router.replace('/(tabs)/sublet');
    } catch (err: any) {
      console.error('[CreateProfile] Error updating profile:', err);
      const errorMessage = err?.message || 'Failed to update profile. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.emoji}>👋</Text>
            <Text style={styles.title}>Welcome to Localink!</Text>
            <Text style={styles.subtitle}>Let&apos;s set up your profile</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textLight}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City in Germany</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.cityScroll}
              >
                {GERMAN_CITIES.map((cityOption) => {
                  const isSelected = city === cityOption;
                  return (
                    <TouchableOpacity
                      key={cityOption}
                      style={[styles.cityChip, isSelected && styles.cityChipSelected]}
                      onPress={() => setCity(cityOption)}
                      disabled={loading}
                    >
                      <Text style={[styles.cityChipText, isSelected && styles.cityChipTextSelected]}>
                        {cityOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!error}
        onClose={() => setError(null)}
        title="Error"
        message={error || ''}
        type="error"
      />
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
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
  cityScroll: {
    marginTop: spacing.sm,
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
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
