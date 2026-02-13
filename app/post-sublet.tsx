
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CitySearchInput } from '@/components/CitySearchInput';
import { formatDateToDDMMYYYY, dateToISOString } from '@/utils/cities';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';

type SubletType = 'offering' | 'seeking' | null;

export default function PostSubletScreen() {
  const router = useRouter();
  const [subletType, setSubletType] = useState<SubletType>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [cityRegistration, setCityRegistration] = useState<boolean | null>(null);
  const [rent, setRent] = useState('');
  const [deposit, setDeposit] = useState('');
  const [availableFrom, setAvailableFrom] = useState<Date | null>(null);
  const [availableTo, setAvailableTo] = useState<Date | null>(null);
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  console.log('PostSubletScreen: Rendering', { subletType, imageCount: imageUrls.length, consentChecked });

  const handlePickImages = async () => {
    console.log('PostSubletScreen: Pick images');
    
    if (imageUrls.length >= 5) {
      setError('Maximum 5 images allowed');
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5 - imageUrls.length,
      });

      if (!result.canceled && result.assets.length > 0) {
        console.log('PostSubletScreen: Images selected', result.assets.length);
        setUploadingImages(true);
        
        try {
          // Create FormData for image upload
          const formData = new FormData();
          result.assets.forEach((asset, index) => {
            const uri = asset.uri;
            const filename = uri.split('/').pop() || `image_${index}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            
            formData.append('images', {
              uri,
              name: filename,
              type,
            } as any);
          });

          // Upload images to backend
          console.log('PostSubletScreen: Uploading images to backend');
          const response = await fetch(`${require('@/utils/api').BACKEND_URL}/api/upload/images`, {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          if (!response.ok) {
            throw new Error('Failed to upload images');
          }

          const data = await response.json();
          console.log('PostSubletScreen: Images uploaded', data);
          
          if (data.urls && Array.isArray(data.urls)) {
            setImageUrls([...imageUrls, ...data.urls]);
          }
        } catch (uploadError: any) {
          console.error('PostSubletScreen: Error uploading images', uploadError);
          setError(uploadError.message || 'Failed to upload images');
        } finally {
          setUploadingImages(false);
        }
      }
    } catch (error: any) {
      console.error('PostSubletScreen: Error picking images', error);
      setError(error.message || 'Failed to pick images');
    }
  };

  const handleRemoveImage = (index: number) => {
    console.log('PostSubletScreen: Remove image', index);
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    console.log('PostSubletScreen: Submit sublet', { subletType, title, city, availableFrom, availableTo, consentChecked });
    
    if (!subletType) {
      setError('Please select if you are offering or seeking a sublet');
      return;
    }
    
    if (!title.trim() || !city.trim()) {
      setError('Please fill all mandatory fields');
      return;
    }

    if (subletType === 'offering') {
      if (!address.trim() || !pincode.trim() || cityRegistration === null || !rent.trim()) {
        setError('Please fill all mandatory fields');
        return;
      }
    }

    if (!consentChecked) {
      setError('Please accept the consent information');
      return;
    }

    // Date validation
    if (!availableFrom || !availableTo) {
      setError('Please select both Move-in and Move-out dates');
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const fromDate = new Date(availableFrom);
    fromDate.setHours(0, 0, 0, 0);
    
    const toDate = new Date(availableTo);
    toDate.setHours(0, 0, 0, 0);
    
    if (fromDate < today) {
      setError('Move-in date cannot be older than today');
      return;
    }
    
    if (toDate <= fromDate) {
      setError('Move-out date must be after Move-in date');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const postData: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        city: city.trim(),
        availableFrom: dateToISOString(availableFrom),
        availableTo: dateToISOString(availableTo),
        rent: rent.trim() || undefined,
        type: subletType,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      };

      // Add offering-specific fields
      if (subletType === 'offering') {
        postData.address = address.trim();
        postData.pincode = pincode.trim();
        postData.cityRegistrationRequired = cityRegistration;
        postData.deposit = deposit.trim() || undefined;
      }

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

  const fieldsDisabled = subletType === null;

  const availableFromDisplay = availableFrom ? formatDateToDDMMYYYY(availableFrom) : 'dd.mm.yyyy';
  const availableToDisplay = availableTo ? formatDateToDDMMYYYY(availableTo) : 'dd.mm.yyyy';

  const consentText = subletType === 'offering' 
    ? "Subletting may require prior landlord consent under § 540 and § 553 BGB. Users are solely responsible for ensuring compliance with their rental agreement and applicable laws."
    : "Entering into a subletting arrangement is subject to § 540 and § 553 BGB and the terms of the primary lease. Users are solely responsible for verifying legal permissibility.";

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
              <CitySearchInput
                value={city}
                onChangeText={setCity}
                placeholder="Search city..."
              />

              <Text style={styles.label}>Address *</Text>
              <Text style={styles.infoText}>Your address will not be published</Text>
              <TextInput
                style={styles.input}
                placeholder="Street address"
                placeholderTextColor={colors.textLight}
                value={address}
                onChangeText={setAddress}
              />

              <Text style={styles.label}>Pin code *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 10115"
                placeholderTextColor={colors.textLight}
                value={pincode}
                onChangeText={setPincode}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Available From *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={[styles.dateButtonText, !availableFrom && styles.dateButtonPlaceholder]}>{availableFromDisplay}</Text>
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={availableFrom || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) setAvailableFrom(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Available To *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={[styles.dateButtonText, !availableTo && styles.dateButtonPlaceholder]}>{availableToDisplay}</Text>
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={availableTo || availableFrom || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={availableFrom || new Date()}
                  onChange={(event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) setAvailableTo(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Monthly Rent (€) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 800"
                placeholderTextColor={colors.textLight}
                value={rent}
                onChangeText={setRent}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Deposit (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 1600"
                placeholderTextColor={colors.textLight}
                value={deposit}
                onChangeText={setDeposit}
                keyboardType="numeric"
              />

              <Text style={styles.label}>City Registration *</Text>
              <View style={styles.radioButtons}>
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setCityRegistration(true)}
                >
                  <View style={styles.radioCircle}>
                    {cityRegistration === true && <View style={styles.radioCircleSelected} />}
                  </View>
                  <Text style={styles.radioText}>Yes</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.radioOption}
                  onPress={() => setCityRegistration(false)}
                >
                  <View style={styles.radioCircle}>
                    {cityRegistration === false && <View style={styles.radioCircleSelected} />}
                  </View>
                  <Text style={styles.radioText}>No</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Photos (Max 5)</Text>
              <View style={styles.imagesContainer}>
                {imageUrls.map((url, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri: url }} style={styles.imagePreview} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => handleRemoveImage(index)}
                    >
                      <IconSymbol
                        ios_icon_name="xmark.circle.fill"
                        android_material_icon_name="cancel"
                        size={24}
                        color={colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                {imageUrls.length < 5 && (
                  <TouchableOpacity
                    style={styles.addImageButton}
                    onPress={handlePickImages}
                    disabled={uploadingImages}
                  >
                    {uploadingImages ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <IconSymbol
                          ios_icon_name="plus.circle.fill"
                          android_material_icon_name="add-circle"
                          size={32}
                          color={colors.primary}
                        />
                        <Text style={styles.addImageText}>Add Photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setConsentChecked(!consentChecked)}
              >
                <View style={styles.consentCheckbox}>
                  {consentChecked && <View style={styles.consentCheckboxChecked} />}
                </View>
                <Text style={styles.consentText}>{consentText}</Text>
              </TouchableOpacity>
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
              <CitySearchInput
                value={city}
                onChangeText={setCity}
                placeholder="Search city..."
              />

              <Text style={styles.label}>Move-in Date *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowFromPicker(true)}
              >
                <Text style={[styles.dateButtonText, !availableFrom && styles.dateButtonPlaceholder]}>{availableFromDisplay}</Text>
              </TouchableOpacity>
              {showFromPicker && (
                <DateTimePicker
                  value={availableFrom || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowFromPicker(false);
                    if (selectedDate) setAvailableFrom(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Move-out Date *</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowToPicker(true)}
              >
                <Text style={[styles.dateButtonText, !availableTo && styles.dateButtonPlaceholder]}>{availableToDisplay}</Text>
              </TouchableOpacity>
              {showToPicker && (
                <DateTimePicker
                  value={availableTo || availableFrom || new Date()}
                  mode="date"
                  display="default"
                  minimumDate={availableFrom || new Date()}
                  onChange={(event, selectedDate) => {
                    setShowToPicker(false);
                    if (selectedDate) setAvailableTo(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>Budget (€/month)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 800"
                placeholderTextColor={colors.textLight}
                value={rent}
                onChangeText={setRent}
                keyboardType="numeric"
              />

              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setConsentChecked(!consentChecked)}
              >
                <View style={styles.consentCheckbox}>
                  {consentChecked && <View style={styles.consentCheckboxChecked} />}
                </View>
                <Text style={styles.consentText}>{consentText}</Text>
              </TouchableOpacity>
            </>
          )}

          {!fieldsDisabled && (
            <TouchableOpacity
              style={[styles.button, (loading || !consentChecked) && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading || !consentChecked}
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
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
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
  dateButtonPlaceholder: {
    color: colors.textLight,
  },
  consentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  consentCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  consentCheckboxChecked: {
    width: 14,
    height: 14,
    borderRadius: 2,
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
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  imagePreview: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  addImageText: {
    ...typography.bodySmall,
    color: colors.primary,
    marginTop: spacing.xs,
  },
});
