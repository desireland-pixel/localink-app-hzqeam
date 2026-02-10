
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PostTravelScreen() {
  const router = useRouter();
  const [type, setType] = useState<'looking_for_buddy' | 'offering_companionship'>('looking_for_buddy');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log('PostTravelScreen: Rendering', { type });

  const handleSubmit = async () => {
    console.log('PostTravelScreen: Submit travel', { type, title, description, fromCity, toCity, travelDate });
    
    if (!title.trim() || !fromCity.trim() || !toCity.trim()) {
      setError('Please fill in title, from city, and to city');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const postData = {
        title: title.trim(),
        description: description.trim() || undefined,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        travelDate: travelDate.toISOString(),
        type,
      };

      console.log('PostTravelScreen: Creating travel post with data:', postData);
      await authenticatedPost('/api/travel-posts', postData);
      console.log('PostTravelScreen: Travel post created successfully');
      router.back();
    } catch (error: any) {
      console.error('PostTravelScreen: Error creating travel post', error);
      setError(error.message || 'Failed to create travel post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
              style={[styles.toggleButton, type === 'looking_for_buddy' && styles.toggleButtonActive]}
              onPress={() => setType('looking_for_buddy')}
            >
              <Text style={[styles.toggleText, type === 'looking_for_buddy' && styles.toggleTextActive]}>
                Looking for Buddy
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, type === 'offering_companionship' && styles.toggleButtonActive]}
              onPress={() => setType('offering_companionship')}
            >
              <Text style={[styles.toggleText, type === 'offering_companionship' && styles.toggleTextActive]}>
                Offering Companionship
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Looking for travel companion"
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your travel plans..."
            placeholderTextColor={colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>From City *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Berlin"
            placeholderTextColor={colors.textLight}
            value={fromCity}
            onChangeText={setFromCity}
          />

          <Text style={styles.label}>To City *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Munich"
            placeholderTextColor={colors.textLight}
            value={toCity}
            onChangeText={setToCity}
          />

          <Text style={styles.label}>Travel Date</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>{formatDate(travelDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={travelDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setTravelDate(selectedDate);
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Posting...' : 'Post Travel'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        isVisible={!!error}
        title="Error"
        message={error}
        onClose={() => setError('')}
        confirmText="OK"
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
