
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY, dateToISOString } from '@/utils/cities';

type TravelType = 'offering' | 'seeking' | null;

const TRAVEL_CITIES = [
  'India',
  'Germany',
  'Delhi',
  'Mumbai',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Kochi',
  'Kolkata',
  'Ahmedabad',
  'Goa',
  'Thiruvananthapuram',
  'Frankfurt',
  'Munich',
  'Berlin',
  'Düsseldorf',
  'Hamburg',
  'Stuttgart',
  'Cologne',
  'Hannover',
];

const COMPANIONSHIP_FOR_OPTIONS = ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others', 'No selection'];

export default function PostTravelScreen() {
  const router = useRouter();
  const [travelType, setTravelType] = useState<TravelType>(null);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState(new Date());
  const [travelDateTo, setTravelDateTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [companionshipFor, setCompanionshipFor] = useState('');
  const [description, setDescription] = useState('');
  const [alsoPostAsAlly, setAlsoPostAsAlly] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFromCityPicker, setShowFromCityPicker] = useState(false);
  const [showToCityPicker, setShowToCityPicker] = useState(false);

  console.log('PostTravelScreen: Rendering', { travelType, alsoPostAsAlly });

  const handleSubmit = async () => {
    console.log('PostTravelScreen: Submit travel', { travelType, fromCity, toCity, travelDate, alsoPostAsAlly });
    
    if (!travelType) {
      setError('Please select if you are offering or seeking travel companionship');
      return;
    }
    
    if (!fromCity.trim() || !toCity.trim()) {
      setError('Please fill in from city and to city');
      return;
    }

    if (travelType === 'seeking' && !companionshipFor.trim()) {
      setError('Please select who you need companionship for');
      return;
    }

    if (travelType === 'offering' && alsoPostAsAlly === null) {
      setError('Please select if you can be an Ally');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (travelDate < today) {
      setError('Travel date must be in the future');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const postData: any = {
        description: description.trim() || undefined,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        travelDate: dateToISOString(travelDate),
        type: travelType,
      };

      if (travelType === 'seeking') {
        postData.companionshipFor = companionshipFor;
        if (travelDateTo) {
          postData.travelDateTo = dateToISOString(travelDateTo);
        }
      }

      if (travelType === 'offering' && alsoPostAsAlly) {
        postData.alsoPostAsAlly = true;
      }

      console.log('PostTravelScreen: Creating travel post with data:', postData);
      // TODO: Backend Integration - POST /api/travel-posts with alsoPostAsAlly support → { travelPostId, carryPostId? }
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

  const fieldsDisabled = travelType === null;

  const travelDateDisplay = formatDateToDDMMYYYY(travelDate);
  const travelDateToDisplay = travelDateTo ? formatDateToDDMMYYYY(travelDateTo) : '';

  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

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
              <Text style={styles.label}>From *</Text>
              <TouchableOpacity 
                style={styles.cityButton}
                onPress={() => setShowFromCityPicker(!showFromCityPicker)}
              >
                <Text style={[styles.cityButtonText, !fromCity && styles.cityButtonPlaceholder]}>
                  {fromCity || 'Select city...'}
                </Text>
              </TouchableOpacity>
              {showFromCityPicker && (
                <View style={styles.cityPicker}>
                  <ScrollView style={styles.cityPickerScroll}>
                    {TRAVEL_CITIES.map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={styles.cityOption}
                        onPress={() => {
                          setFromCity(city);
                          setShowFromCityPicker(false);
                        }}
                      >
                        <Text style={styles.cityOptionText}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>To *</Text>
              <TouchableOpacity 
                style={styles.cityButton}
                onPress={() => setShowToCityPicker(!showToCityPicker)}
              >
                <Text style={[styles.cityButtonText, !toCity && styles.cityButtonPlaceholder]}>
                  {toCity || 'Select city...'}
                </Text>
              </TouchableOpacity>
              {showToCityPicker && (
                <View style={styles.cityPicker}>
                  <ScrollView style={styles.cityPickerScroll}>
                    {TRAVEL_CITIES.map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={styles.cityOption}
                        onPress={() => {
                          setToCity(city);
                          setShowToCityPicker(false);
                        }}
                      >
                        <Text style={styles.cityOptionText}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>Date *</Text>
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
                  minimumDate={minDate}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setTravelDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your exact travel city, who you can help, Luggage limit, ..."
                placeholderTextColor={colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />

              <View style={styles.allySection}>
                <Text style={styles.allyLabel}>I can be an Ally and bring something from the departure country</Text>
                <Text style={styles.allyInfo}>(info: Your post will be published on the "Carry" page as well)</Text>
                <View style={styles.allyButtons}>
                  <TouchableOpacity
                    style={[styles.allyButton, alsoPostAsAlly === true && styles.allyButtonActive]}
                    onPress={() => setAlsoPostAsAlly(true)}
                  >
                    <Text style={[styles.allyButtonText, alsoPostAsAlly === true && styles.allyButtonTextActive]}>
                      Yes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.allyButton, alsoPostAsAlly === false && styles.allyButtonActive]}
                    onPress={() => setAlsoPostAsAlly(false)}
                  >
                    <Text style={[styles.allyButtonText, alsoPostAsAlly === false && styles.allyButtonTextActive]}>
                      No
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {travelType === 'seeking' && (
            <>
              <Text style={styles.label}>For *</Text>
              <View style={styles.optionsGrid}>
                {COMPANIONSHIP_FOR_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.optionButton,
                      companionshipFor === option && styles.optionButtonActive,
                    ]}
                    onPress={() => setCompanionshipFor(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        companionshipFor === option && styles.optionTextActive,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>From *</Text>
              <TouchableOpacity 
                style={styles.cityButton}
                onPress={() => setShowFromCityPicker(!showFromCityPicker)}
              >
                <Text style={[styles.cityButtonText, !fromCity && styles.cityButtonPlaceholder]}>
                  {fromCity || 'Select city...'}
                </Text>
              </TouchableOpacity>
              {showFromCityPicker && (
                <View style={styles.cityPicker}>
                  <ScrollView style={styles.cityPickerScroll}>
                    {TRAVEL_CITIES.map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={styles.cityOption}
                        onPress={() => {
                          setFromCity(city);
                          setShowFromCityPicker(false);
                        }}
                      >
                        <Text style={styles.cityOptionText}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>To *</Text>
              <TouchableOpacity 
                style={styles.cityButton}
                onPress={() => setShowToCityPicker(!showToCityPicker)}
              >
                <Text style={[styles.cityButtonText, !toCity && styles.cityButtonPlaceholder]}>
                  {toCity || 'Select city...'}
                </Text>
              </TouchableOpacity>
              {showToCityPicker && (
                <View style={styles.cityPicker}>
                  <ScrollView style={styles.cityPickerScroll}>
                    {TRAVEL_CITIES.map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={styles.cityOption}
                        onPress={() => {
                          setToCity(city);
                          setShowToCityPicker(false);
                        }}
                      >
                        <Text style={styles.cityOptionText}>{city}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <Text style={styles.label}>Date (From) *</Text>
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
                  minimumDate={minDate}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setTravelDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Date (To)</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDateToPicker(true)}
              >
                <Text style={styles.dateButtonText}>
                  {travelDateToDisplay || 'Optional - Select end date'}
                </Text>
              </TouchableOpacity>
              {showDateToPicker && (
                <DateTimePicker
                  value={travelDateTo || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={minDate}
                  onChange={(event, selectedDate) => {
                    setShowDateToPicker(false);
                    if (selectedDate) setTravelDateTo(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your exact travel city, travel need, ..."
                placeholderTextColor={colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
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
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
  },
  optionTextActive: {
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  cityButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityButtonText: {
    ...typography.body,
    color: colors.text,
  },
  cityButtonPlaceholder: {
    color: colors.textLight,
  },
  cityPicker: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    maxHeight: 200,
  },
  cityPickerScroll: {
    maxHeight: 200,
  },
  cityOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cityOptionText: {
    ...typography.body,
    color: colors.text,
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
  allySection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  allyLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  allyInfo: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  allyButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  allyButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  allyButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  allyButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  allyButtonTextActive: {
    color: '#FFFFFF',
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
