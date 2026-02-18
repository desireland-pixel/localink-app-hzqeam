
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost, authenticatedPut } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDateToDDMMYYYY, dateToISOString, parseDateFromDDMMYYYY } from '@/utils/cities';

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
  const params = useLocalSearchParams();
  const [travelMode, setTravelMode] = useState<TravelMode>(null);
  
  const isEditing = !!params.editId;
  const editId = params.editId as string | undefined;
  const [fromCity, setFromCity] = useState('');
  const [toCity, setToCity] = useState('');
  const [travelDate, setTravelDate] = useState<Date | null>(null);
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
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [incentiveEnabled, setIncentiveEnabled] = useState(false);
  const [incentiveAmount, setIncentiveAmount] = useState('');

  console.log('PostTravelScreen: Rendering', { travelMode, isEditing, editId, consentAccepted });

  // Load existing data for editing
  useEffect(() => {
    if (isEditing && params.editData) {
      try {
        const data = JSON.parse(params.editData as string);
        console.log('PostTravelScreen: Loading edit data', data);
        
        // Determine travel mode from type
        if (data.type === 'offering') {
          setTravelMode('offering');
          setCanOfferCompanionship(data.canOfferCompanionship || false);
          setCanCarryItems(data.canCarryItems || false);
        } else if (data.type === 'seeking') {
          setTravelMode('seeking-companionship');
          setCompanionshipFor(data.companionshipFor || '');
        } else if (data.type === 'seeking-ally') {
          setTravelMode('seeking-ally');
          setItem(data.item || '');
        }
        
        setFromCity(data.fromCity || '');
        setToCity(data.toCity || '');
        setDescription(data.description || '');
        setConsentAccepted(true); // Pre-check consent for editing
        
        // Load incentive data
        if (data.incentiveAmount) {
          setIncentiveEnabled(true);
          setIncentiveAmount(data.incentiveAmount.toString());
        }
        
        // Parse dates
        if (data.travelDate) {
          const date = parseDateFromDDMMYYYY(data.travelDate);
          if (date) {
            setTravelDate(new Date(date));
          }
        }
        if (data.travelDateTo) {
          const dateTo = parseDateFromDDMMYYYY(data.travelDateTo);
          if (dateTo) {
            setTravelDateTo(new Date(dateTo));
          }
        }
      } catch (err) {
        console.error('PostTravelScreen: Error parsing edit data', err);
        setError('Failed to load post data');
      }
    }
  }, [isEditing, params.editData]);

  const handleSubmit = async () => {
    console.log('PostTravelScreen: Submit travel', { travelMode, fromCity, toCity, travelDate });
    
    if (!travelMode) {
      setError('Please select a travel option');
      return;
    }
    
    if (!fromCity.trim() || !toCity.trim()) {
      setError('Please fill all mandatory fields');
      return;
    }

    if (travelMode === 'seeking-companionship' && !companionshipFor.trim()) {
      setError('Please fill all mandatory fields');
      return;
    }

    if (travelMode === 'seeking-ally' && !item.trim()) {
      setError('Please fill all mandatory fields');
      return;
    }

    if (!consentAccepted) {
      setError('Please accept the consent information');
      return;
    }

    // Date validation
    if (!travelDate) {
      setError('Please select a travel date');
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dateCheck = new Date(travelDate);
    dateCheck.setHours(0, 0, 0, 0);
    
    if (dateCheck < today) {
      setError('Travel date cannot be older than today');
      return;
    }

    // Validate Date (To) is not before Date (From) for seeking companionship
    if (travelMode === 'seeking-companionship' && travelDateTo) {
      const fromDate = new Date(travelDate);
      fromDate.setHours(0, 0, 0, 0);
      
      const toDate = new Date(travelDateTo);
      toDate.setHours(0, 0, 0, 0);
      
      if (toDate <= fromDate) {
        setError('Move-out date must be after Move-in date');
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
        postData.companionshipConsent = consentAccepted;
        if (canCarryItems) {
          postData.alsoPostAsAlly = true;
        }
      } else if (travelMode === 'seeking-companionship') {
        postData.type = 'seeking';
        postData.companionshipFor = companionshipFor;
        postData.seekingConsent = consentAccepted;
        if (travelDateTo) {
          postData.travelDateTo = dateToISOString(travelDateTo);
        }
        // Add incentive for seeking companionship
        if (incentiveEnabled && incentiveAmount) {
          const amount = parseFloat(incentiveAmount);
          if (!isNaN(amount) && amount >= 0.01 && amount <= 99.99) {
            postData.incentiveAmount = amount;
          }
        }
      } else if (travelMode === 'seeking-ally') {
        postData.type = 'seeking-ally';
        postData.item = item.trim();
        postData.allyConsent = consentAccepted;
        // Add incentive for seeking ally
        if (incentiveEnabled && incentiveAmount) {
          const amount = parseFloat(incentiveAmount);
          if (!isNaN(amount) && amount >= 0.01 && amount <= 99.99) {
            postData.incentiveAmount = amount;
          }
        }
      }

      if (isEditing && editId) {
        console.log('PostTravelScreen: Updating travel post with data:', postData);
        await authenticatedPut(`/api/travel-posts/${editId}`, postData);
        console.log('PostTravelScreen: Travel post updated successfully');
      } else {
        console.log('PostTravelScreen: Creating travel post with data:', postData);
        await authenticatedPost('/api/travel-posts', postData);
        console.log('PostTravelScreen: Travel post created successfully');
      }
      router.back();
    } catch (error: any) {
      console.error('PostTravelScreen: Error creating travel post', error);
      setError(error.message || 'Failed to create travel post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const travelDateDisplay = travelDate ? formatDateToDDMMYYYY(travelDate) : 'dd.mm.yyyy';
  const travelDateToDisplay = travelDateTo ? formatDateToDDMMYYYY(travelDateTo) : 'dd.mm.yyyy';

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
                disabled={isEditing}
              >
                <View style={styles.radioCircle}>
                  {travelMode === 'offering' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>offering a travel companionship/ an ally</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTravelMode('seeking-companionship')}
                disabled={isEditing}
              >
                <View style={styles.radioCircle}>
                  {travelMode === 'seeking-companionship' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>seeking a travel companionship</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setTravelMode('seeking-ally')}
                disabled={isEditing}
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
                <Text style={[styles.dateButtonText, !travelDate && styles.dateButtonPlaceholder]}>{travelDateDisplay}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={travelDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
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

              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setConsentAccepted(!consentAccepted)}
              >
                <View style={styles.consentRadio}>
                  {consentAccepted && <View style={styles.consentRadioSelected} />}
                </View>
                <Text style={styles.consentText}>
                  I understand that I am acting independently. The platform only facilitates connections and assumes no responsibility for personal arrangements or transported items.
                </Text>
              </TouchableOpacity>
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
                    <Text style={[styles.dateButtonText, !travelDate && styles.dateButtonPlaceholder]}>{travelDateDisplay}</Text>
                  </TouchableOpacity>
                  {showDatePicker && (
                    <DateTimePicker
                      value={travelDate || new Date()}
                      mode="date"
                      display="default"
                      minimumDate={new Date()}
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
                    <Text style={[styles.dateButtonText, !travelDateTo && styles.dateButtonPlaceholder]}>
                      {travelDateToDisplay}
                    </Text>
                  </TouchableOpacity>
                  {showDateToPicker && (
                    <DateTimePicker
                      value={travelDateTo || travelDate || new Date()}
                      mode="date"
                      display="default"
                      minimumDate={travelDate || new Date()}
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

              <View style={styles.incentiveContainer}>
                <TouchableOpacity
                  style={styles.incentiveRadioRow}
                  onPress={() => {
                    setIncentiveEnabled(!incentiveEnabled);
                    if (incentiveEnabled) {
                      setIncentiveAmount('');
                    }
                  }}
                >
                  <View style={styles.radioCircle}>
                    {incentiveEnabled && <View style={styles.radioCircleSelected} />}
                  </View>
                  <Text style={styles.incentiveLabel}>I&apos;d like to offer an incentive (optional): €</Text>
                </TouchableOpacity>
                {incentiveEnabled && (
                  <TextInput
                    style={styles.incentiveInput}
                    value={incentiveAmount}
                    onChangeText={(text) => {
                      // Regex to allow xx.xx format (00.01 to 99.99)
                      if (/^\d{0,2}(\.\d{0,2})?$/.test(text) || text === '') {
                        setIncentiveAmount(text);
                      }
                    }}
                    keyboardType="decimal-pad"
                    placeholder="00.00"
                    placeholderTextColor={colors.textLight}
                    maxLength={5}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setConsentAccepted(!consentAccepted)}
              >
                <View style={styles.consentRadio}>
                  {consentAccepted && <View style={styles.consentRadioSelected} />}
                </View>
                <Text style={styles.consentText}>
                  I understand that I am responsible for conducting due diligence. The platform facilitates connections only and assumes no liability for personal arrangements.
                </Text>
              </TouchableOpacity>
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
                <Text style={[styles.dateButtonText, !travelDate && styles.dateButtonPlaceholder]}>{travelDateDisplay}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={travelDate || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
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

              <View style={styles.incentiveContainer}>
                <TouchableOpacity
                  style={styles.incentiveRadioRow}
                  onPress={() => {
                    setIncentiveEnabled(!incentiveEnabled);
                    if (incentiveEnabled) {
                      setIncentiveAmount('');
                    }
                  }}
                >
                  <View style={styles.radioCircle}>
                    {incentiveEnabled && <View style={styles.radioCircleSelected} />}
                  </View>
                  <Text style={styles.incentiveLabel}>I&apos;d like to offer an incentive (optional): €</Text>
                </TouchableOpacity>
                {incentiveEnabled && (
                  <TextInput
                    style={styles.incentiveInput}
                    value={incentiveAmount}
                    onChangeText={(text) => {
                      // Regex to allow xx.xx format (00.01 to 99.99)
                      if (/^\d{0,2}(\.\d{0,2})?$/.test(text) || text === '') {
                        setIncentiveAmount(text);
                      }
                    }}
                    keyboardType="decimal-pad"
                    placeholder="00.00"
                    placeholderTextColor={colors.textLight}
                    maxLength={5}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setConsentAccepted(!consentAccepted)}
              >
                <View style={styles.consentRadio}>
                  {consentAccepted && <View style={styles.consentRadioSelected} />}
                </View>
                <Text style={styles.consentText}>
                  I understand that I am responsible for ensuring items comply with airline, customs, and applicable laws. The platform assumes no responsibility for transported items.
                </Text>
              </TouchableOpacity>
            </>
          )}

          {travelMode && (
            <TouchableOpacity
              style={[styles.button, (loading || !consentAccepted) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !consentAccepted}
            >
              <Text style={styles.buttonText}>
                {loading ? (isEditing ? 'Updating...' : 'Posting...') : (isEditing ? 'Update' : 'Post')}
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
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  consentRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  consentRadioSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  consentText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
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
    opacity: 0.4,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  incentiveContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  incentiveRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  incentiveLabel: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  incentiveInput: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    marginLeft: 36,
  },
});
