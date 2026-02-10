
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY, dateToISOString } from '@/utils/cities';

type CarryType = 'offering' | 'seeking' | null;

export default function PostCarryScreen() {
  const router = useRouter();
  const [carryType, setCarryType] = useState<CarryType>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [travelDate, setTravelDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  console.log('PostCarryScreen: Rendering', { carryType });

  const handleSubmit = async () => {
    console.log('PostCarryScreen: Submit carry', { carryType, title, description, fromCity, toCity, itemDescription, travelDate });
    
    if (!carryType) {
      setError('Please select if you are offering or seeking ally support');
      return;
    }
    
    if (!title.trim() || !fromCity.trim() || !toCity.trim()) {
      setError('Please fill in title, from city, and to city');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const apiType = carryType === 'offering' ? 'traveler' : 'request';
      const postData = {
        title: title.trim(),
        description: description.trim() || undefined,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        travelDate: dateToISOString(travelDate),
        type: apiType,
        itemDescription: itemDescription.trim() || undefined,
      };

      console.log('PostCarryScreen: Creating carry post with data:', postData);
      await authenticatedPost('/api/carry-posts', postData);
      console.log('PostCarryScreen: Carry post created successfully');
      router.back();
    } catch (error: any) {
      console.error('PostCarryScreen: Error creating carry post', error);
      setError(error.message || 'Failed to create carry post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fieldsDisabled = carryType === null;
  const travelDateDisplay = formatDateToDDMMYYYY(travelDate);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.radioContainer}>
            <Text style={styles.radioLabel}>I am</Text>
            <View style={styles.radioButtons}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setCarryType('offering')}
              >
                <View style={styles.radioCircle}>
                  {carryType === 'offering' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>offering</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setCarryType('seeking')}
              >
                <View style={styles.radioCircle}>
                  {carryType === 'seeking' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>seeking</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.radioLabelEnd}>ally support.</Text>
          </View>

          {carryType === 'offering' && (
            <>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Traveling to Munich, can carry items"
                placeholderTextColor={colors.textLight}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what you can carry and any restrictions..."
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
                <Text style={styles.dateButtonText}>{travelDateDisplay}</Text>
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

              <Text style={styles.label}>What can you carry?</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Small packages, documents, medicines"
                placeholderTextColor={colors.textLight}
                value={itemDescription}
                onChangeText={setItemDescription}
              />
            </>
          )}

          {carryType === 'seeking' && (
            <>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Need documents sent to Munich"
                placeholderTextColor={colors.textLight}
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe what you need carried..."
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

              <Text style={styles.label}>Needed By Date</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateButtonText}>{travelDateDisplay}</Text>
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

              <Text style={styles.label}>Item Description *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Small package, documents, medicines"
                placeholderTextColor={colors.textLight}
                value={itemDescription}
                onChangeText={setItemDescription}
              />
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
