
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';

type TravelType = 'offering' | 'seeking' | null;

export default function PostTravelScreen() {
  const router = useRouter();
  const [travelType, setTravelType] = useState<TravelType>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log('PostTravelScreen: Rendering', { travelType });

  const handleSubmit = async () => {
    console.log('PostTravelScreen: Submit travel', { travelType, title, description, fromCity, toCity, travelDate });
    
    if (!travelType) {
      setError('Please select if you are offering or seeking travel companionship');
      return;
    }
    
    if (!title.trim() || !fromCity.trim() || !toCity.trim()) {
      setError('Please fill in title, from city, and to city');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const apiType = travelType === 'offering' ? 'offering_companionship' : 'looking_for_buddy';
      const postData = {
        title: title.trim(),
        description: description.trim() || undefined,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        travelDate: travelDate.toISOString(),
        type: apiType,
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

  const fieldsDisabled = travelType === null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Travel buddy</Text>

          <View style={styles.radioContainer}>
            <Text style={styles.radioLabel}>I am</Text>
            <View style={styles.radioButtons}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTravelType('offering')}
              >
                <View style={styles.radioCircle}>
                  {travelType === 'offering' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>offering</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTravelType('seeking')}
              >
                <View style={styles.radioCircle}>
                  {travelType === 'seeking' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>seeking</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.radioLabelEnd}>travel companionship.</Text>
          </View>

          {travelType === 'offering' && (
            <>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Traveling to Munich, can accompany"
                placeholderTextColor={colors.textLight}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your travel plans and who you can help..."
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
            </>
          )}

          {travelType === 'seeking' && (
            <>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Need travel companion to Munich"
                placeholderTextColor={colors.textLight}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your travel needs and who you're looking for..."
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
