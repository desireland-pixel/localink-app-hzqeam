
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';

type SubletType = 'offering' | 'seeking' | null;

export default function PostSubletScreen() {
  const router = useRouter();
  const [subletType, setSubletType] = useState<SubletType>(null);
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

  console.log('PostSubletScreen: Rendering', { subletType });

  const handleSubmit = async () => {
    console.log('PostSubletScreen: Submit sublet', { subletType, title, description, city, rent, availableFrom, availableTo });
    
    if (!subletType) {
      setError('Please select if you are offering or seeking a sublet');
      return;
    }
    
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
        type: subletType,
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

  const fieldsDisabled = subletType === null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Sublet</Text>

          <View style={styles.radioContainer}>
            <Text style={styles.radioLabel}>I am</Text>
            <View style={styles.radioButtons}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSubletType('offering')}
              >
                <View style={styles.radioCircle}>
                  {subletType === 'offering' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>offering</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSubletType('seeking')}
              >
                <View style={styles.radioCircle}>
                  {subletType === 'seeking' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>seeking</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.radioLabelEnd}>a sublet.</Text>
          </View>

          {subletType === 'offering' && (
            <>
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
            </>
          )}

          {subletType === 'seeking' && (
            <>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Looking for 1-bedroom apartment"
                placeholderTextColor={colors.textLight}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what you're looking for..."
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

              <Text style={styles.label}>Budget (€/month)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 800"
                placeholderTextColor={colors.textLight}
                value={rent}
                onChangeText={setRent}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Move-in Date</Text>
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

              <Text style={styles.label}>Move-out Date</Text>
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
            </>
          )}

          {!fieldsDisabled && (
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Posting...' : 'Post'}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!error}
        title="Error"
        message={error}
        onClose={() => setError('')}
        confirmText="OK"
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  heading: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '700',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: spacing.xl,
  },
  radioLabel: {
    ...typography.body,
    color: colors.text,
    marginRight: spacing.sm,
  },
  radioLabelEnd: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  radioButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.sm,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  radioCircleSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  radioText: {
    ...typography.body,
    color: colors.text,
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
