
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function PostSubletScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [rent, setRent] = useState('');
  const [availableFrom, setAvailableFrom] = useState(new Date());
  const [availableTo, setAvailableTo] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log('PostSubletScreen: Rendering');

  const handleSubmit = async () => {
    console.log('PostSubletScreen: Submit sublet', { title, description, city, rent, availableFrom, availableTo });
    
    if (!title.trim() || !city.trim()) {
      setError('Please fill in title and city');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const postData = {
        title: title.trim(),
        description: description.trim() || undefined,
        city: city.trim(),
        availableFrom: availableFrom.toISOString(),
        availableTo: availableTo.toISOString(),
        rent: rent.trim() || undefined,
      };

      console.log('PostSubletScreen: Creating sublet with data:', postData);
      await authenticatedPost('/api/sublets', postData);
      console.log('PostSubletScreen: Sublet created successfully');
      router.back();
    } catch (error: any) {
      console.error('PostSubletScreen: Error creating sublet', error);
      setError(error.message || 'Failed to create sublet. Please try again.');
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
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Cozy 2-bedroom apartment"
            placeholderTextColor={colors.textLight}
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your sublet..."
            placeholderTextColor={colors.textLight}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>City *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Berlin"
            placeholderTextColor={colors.textLight}
            value={city}
            onChangeText={setCity}
          />

          <Text style={styles.label}>Monthly Rent (€)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 800"
            placeholderTextColor={colors.textLight}
            value={rent}
            onChangeText={setRent}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Available From</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowFromPicker(true)}
          >
            <Text style={styles.dateButtonText}>{formatDate(availableFrom)}</Text>
          </TouchableOpacity>
          {showFromPicker && (
            <DateTimePicker
              value={availableFrom}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowFromPicker(false);
                if (selectedDate) setAvailableFrom(selectedDate);
              }}
            />
          )}

          <Text style={styles.label}>Available To</Text>
          <TouchableOpacity 
            style={styles.dateButton}
            onPress={() => setShowToPicker(true)}
          >
            <Text style={styles.dateButtonText}>{formatDate(availableTo)}</Text>
          </TouchableOpacity>
          {showToPicker && (
            <DateTimePicker
              value={availableTo}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowToPicker(false);
                if (selectedDate) setAvailableTo(selectedDate);
              }}
            />
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Posting...' : 'Post Sublet'}
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
