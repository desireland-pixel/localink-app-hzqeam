
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY, dateToISOString } from '@/utils/cities';

type TravelMode = 'offering' | 'seeking-companionship' | 'seeking-ally' | null;

const TRAVEL_CITIES = [
  'Germany',
  'India',
  'Ahmedabad',
  'Bengaluru',
  'Berlin',
  'Chennai',
  'Cologne',
  'Delhi',
  'Düsseldorf',
  'Frankfurt',
  'Goa',
  'Hamburg',
  'Hannover',
  'Hyderabad',
  'Kochi',
  'Kolkata',
  'Munich',
  'Mumbai',
  'Stuttgart',
  'Thiruvananthapuram',
];

const COMPANIONSHIP_FOR_OPTIONS = ['Mother', 'Father', 'Parents', 'MIL', 'FIL', 'Others'];

export default function PostTravelScreen() {
  const router = useRouter();
  const [travelMode, setTravelMode] = useState<TravelMode>(null);
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState(new Date());
  const [travelDateTo, setTravelDateTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const [companionshipFor, setCompanionshipFor] = useState('');
  const [showCompanionshipDropdown, setShowCompanionshipDropdown] = useState(false);
  const [canOfferCompanionship, setCanOfferCompanionship] = useState(false);
  const [canCarryItems, setCanCarryItems] = useState(false);
  const [item, setItem] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFromCityPicker, setShowFromCityPicker] = useState(false);
  const [showToCityPicker, setShowToCityPicker] = useState(false);

  console.log('PostTravelScreen: Rendering', { travelMode });

  const handleSubmit = async () => {
    console.log('PostTravelScreen: Submit travel', { travelMode, fromCity, toCity, travelDate });
    
    if (!travelMode) {
      setError('Please select a travel option');
      return;
    }
    
    if (!fromCity.trim() || !toCity.trim()) {
      setError('Please fill in from city and to city');
      return;
    }

    if (travelMode === 'seeking-companionship' && !companionshipFor.trim()) {
      setError('Please select who you need companionship for');
      return;
    }

    if (travelMode === 'seeking-ally' && !item.trim()) {
      setError('Please specify the item you need carried');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (travelDate < today) {
      setError('Travel date must be in the future');
      return;
    }

    // Validate Date (To) is not before Date (From)
    if (travelDateTo) {
      const fromTime = travelDate.getTime();
      const toTime = travelDateTo.getTime();
      if (toTime < fromTime) {
        setError('End date cannot be before start date');
        return;
      }
    }

    setLoading(true);
    setError('');
    
    try {
      const postData: any = {
        description: description.trim() || undefined,
        fromCity: fromCity.trim(),
        toCity: toCity.trim(),
        travelDate: dateToISOString(travelDate),
      };

      if (travelMode === 'offering') {
        postData.type = 'offering';
        postData.canOfferCompanionship = canOfferCompanionship;
        postData.canCarryItems = canCarryItems;
        if (canCarryItems) {
          postData.alsoPostAsAlly = true;
        }
      } else if (travelMode === 'seeking-companionship') {
        postData.type = 'seeking';
        postData.companionshipFor = companionshipFor;
        if (travelDateTo) {
          postData.travelDateTo = dateToISOString(travelDateTo);
        }
      } else if (travelMode === 'seeking-ally') {
        postData.type = 'seeking-ally';
        postData.item = item.trim();
      }

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
                onPress={() => setTravelMode('offering')}
              >
                <View style={styles.radioCircle}>
                  {travelMode === 'offering' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>offering a travel companionship/ an ally</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTravelMode('seeking-companionship')}
              >
                <View style={styles.radioCircle}>
                  {travelMode === 'seeking-companionship' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>seeking a travel companionship</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTravelMode('seeking-ally')}
              >
                <View style={styles.radioCircle}>
                  {travelMode === 'seeking-ally' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>seeking an ally</Text>
              </TouchableOpacity>
            </View>
          </View>

          {travelMode === 'offering' && (
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
                <Text style={[styles.dateButtonText, styles.dateButtonPlaceholder]}>{travelDateDisplay}</Text>
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

              <View style={styles.checkboxContainer}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setCanOfferCompanionship(!canOfferCompanionship)}
                >
                  <View style={styles.checkboxBox}>
                    {canOfferCompanionship && <View style={styles.checkboxChecked} />}
                  </View>
                  <Text style={styles.checkboxText}>I can offer companionship</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => setCanCarryItems(!canCarryItems)}
                >
                  <View style={styles.checkboxBox}>
                    {canCarryItems && <View style={styles.checkboxChecked} />}
                  </View>
                  <Text style={styles.checkboxText}>I can carry documents/items</Text>
                </TouchableOpacity>
              </View>

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
            </>
          )}

          {travelMode === 'seeking-companionship' && (
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
              <View style={styles.dateRow}>
                <View style={styles.dateHalf}>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[styles.dateButtonText, styles.dateButtonPlaceholder]}>{travelDateDisplay}</Text>
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
                </View>
                <View style={styles.dateSeparator}>
                  <Text style={styles.dateSeparatorText}>-</Text>
                </View>
                <View style={styles.dateHalf}>
                  <TouchableOpacity 
                    style={styles.dateButton}
                    onPress={() => setShowDateToPicker(true)}
                  >
                    <Text style={[styles.dateButtonText, !travelDateToDisplay && styles.dateButtonPlaceholder]}>
                      {travelDateToDisplay || 'dd.mm.yyyy'}
                    </Text>
                  </TouchableOpacity>
                  {showDateToPicker && (
                    <DateTimePicker
                      value={travelDateTo || travelDate}
                      mode="date"
                      display="default"
                      minimumDate={travelDate}
                      onChange={(event, selectedDate) => {
                        setShowDateToPicker(false);
                        if (selectedDate) setTravelDateTo(selectedDate);
                      }}
                    />
                  )}
                </View>
              </View>

              <Text style={styles.label}>For *</Text>
              <TouchableOpacity 
                style={styles.dropdownButton}
                onPress={() => setShowCompanionshipDropdown(!showCompanionshipDropdown)}
              >
                <Text style={[styles.dropdownButtonText, !companionshipFor && styles.dropdownButtonPlaceholder]}>
                  {companionshipFor || 'Select...'}
                </Text>
              </TouchableOpacity>
              {showCompanionshipDropdown && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll}>
                    {COMPANIONSHIP_FOR_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={styles.dropdownOption}
                        onPress={() => {
                          setCompanionshipFor(option);
                          setShowCompanionshipDropdown(false);
                        }}
                      >
                        <Text style={styles.dropdownOptionText}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
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

          {travelMode === 'seeking-ally' && (
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

              <Text style={styles.label}>Needed by Date *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateButtonText, styles.dateButtonPlaceholder]}>{travelDateDisplay}</Text>
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

              <Text style={styles.label}>Item *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Document, Medicine, ..."
                placeholderTextColor={colors.textLight}
                value={item}
                onChangeText={setItem}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., More details like quantity, weight, ...."
                placeholderTextColor={colors.textLight}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </>
          )}

          {travelMode && (
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
    marginBottom: spacing.lg,
  },
  radioLabel: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  radioButtons: {
    gap: spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
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
    flex: 1,
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateHalf: {
    flex: 1,
  },
  dateSeparator: {
    width: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateSeparatorText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
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
  dateButtonPlaceholder: {
    color: colors.textLight,
  },
  dropdownButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dropdownButtonText: {
    ...typography.body,
    color: colors.text,
  },
  dropdownButtonPlaceholder: {
    color: colors.textLight,
  },
  dropdown: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownOptionText: {
    ...typography.body,
    color: colors.text,
  },
  checkboxContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  checkboxText: {
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
