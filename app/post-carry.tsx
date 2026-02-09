
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';

export default function PostCarryScreen() {
  const router = useRouter();
  const [type, setType] = useState<'request' | 'traveler'>('request');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [loading, setLoading] = useState(false);

  console.log('PostCarryScreen: Rendering', { type });

  const handleSubmit = async () => {
    console.log('PostCarryScreen: Submit carry', { type, title, description, fromCity, toCity });
    setLoading(true);
    
    try {
      // TODO: Backend Integration - POST /api/carry with { type, title, description, fromCity, toCity, travelDate, itemType } → created carry item
      console.log('PostCarryScreen: Would create carry item');
      router.back();
    } catch (error) {
      console.error('PostCarryScreen: Error creating carry item', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleButton, type === 'request' && styles.toggleButtonActive]}
              onPress={() => setType('request')}
            >
              <Text style={[styles.toggleText, type === 'request' && styles.toggleTextActive]}>
                Request
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, type === 'traveler' && styles.toggleButtonActive]}
              onPress={() => setType('traveler')}
            >
              <Text style={[styles.toggleText, type === 'traveler' && styles.toggleTextActive]}>
                Traveler
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder={type === 'request' ? 'e.g., Need documents sent' : 'e.g., Traveling to Munich'}
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={type === 'request' ? 'Describe what you need...' : 'Describe what you can carry...'}
            placeholderTextColor={colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>From City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Berlin"
            placeholderTextColor={colors.textLight}
            value={fromCity}
            onChangeText={setFromCity}
          />

          <Text style={styles.label}>To City</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Munich"
            placeholderTextColor={colors.textLight}
            value={toCity}
            onChangeText={setToCity}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Posting...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingTop: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
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
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
