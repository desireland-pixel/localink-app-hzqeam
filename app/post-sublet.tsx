
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedPost, authenticatedPut, BACKEND_URL, getBearerToken } from '@/utils/api';
import Modal from '@/components/ui/Modal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CitySearchInput } from '@/components/CitySearchInput';
import { useScreenTracking } from '@/utils/useScreenTracking';
import { SCREEN_NAMES } from '@/utils/analytics';
import { formatDateToDDMMYYYY, dateToISOString, parseDateFromDDMMYYYY } from '@/utils/cities';
import * as ImagePicker from 'expo-image-picker';
import { IconSymbol } from '@/components/IconSymbol';

type SubletType = 'offering' | 'seeking' | null;

export default function PostSubletScreen() {
  useScreenTracking(SCREEN_NAMES.SUBLET_POST);
  const router = useRouter();
  const params = useLocalSearchParams();
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

  const isEditing = !!params.editId;
  const editId = params.editId as string | undefined;

  console.log('PostSubletScreen: Rendering', { subletType, imageCount: imageUrls.length, consentChecked, isEditing, editId });

  // Load existing data for editing
  useEffect(() => {
    if (isEditing && params.editData) {
      try {
        const data = JSON.parse(params.editData as string);
        console.log('PostSubletScreen: Loading edit data', data);
        
        setSubletType(data.type);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setCity(data.city || '');
        setAddress(data.address || '');
        setPincode(data.pincode || '');
        setCityRegistration(data.cityRegistrationRequired ?? null);
        setRent(data.rent || '');
        setDeposit(data.deposit || '');
        setImageUrls(data.imageUrls || []);
        setConsentChecked(true); // Pre-check consent for editing
        
        // Parse dates from dd.mm.yyyy format
        if (data.availableFrom) {
          const fromDate = parseDateFromDDMMYYYY(data.availableFrom);
          if (fromDate) {
            setAvailableFrom(new Date(fromDate));
          }
        }
        if (data.availableTo) {
          const toDate = parseDateFromDDMMYYYY(data.availableTo);
          if (toDate) {
            setAvailableTo(new Date(toDate));
          }
        }
      } catch (err) {
        console.error('PostSubletScreen: Error parsing edit data', err);
        setError('Failed to load post data');
      }
    }
  }, [isEditing, params.editData]);

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
        
        // Check file sizes before uploading
        for (const asset of result.assets) {
          if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
            setError('Photo size should be less than 5 mb');
            return;
          }
        }
        
        setUploadingImages(true);
        
        try {
          // Get auth token
          const token = await getBearerToken();
          if (!token) {
            throw new Error('Not authenticated');
          }

          // Create FormData for image upload
          const formData = new FormData();
          result.assets.forEach((asset, index) => {
            const uri = asset.uri;
            const filename = uri.split('/').pop() || `image_${index}.jpg`;
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : 'image/jpeg';
            
            // Append each image with the field name 'images'
            formData.append('images', {
              uri,
              name: filename,
              type,
            } as any);
          });

          // Upload images to backend with authentication
          console.log('PostSubletScreen: Uploading images to backend');
          const response = await fetch(`${BACKEND_URL}/api/upload/images`, {
            method: 'POST',
            body: formData,
            headers: {
              'Authorization': `Bearer ${token}`,
              // Don't set Content-Type - let the browser set it with boundary
            },
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('PostSubletScreen: Upload failed', response.status, errorText);
            
            // Check for size limit error from backend
            if (errorText.includes('5 mb') || errorText.includes('5MB')) {
              throw new Error('Photo size should be less than 5 mb');
            }
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
    console.log('PostSubletScreen: Submit sublet', { subletType, title, city, availableFrom, availableTo, consentChecked, isEditing });
    
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

    if (subletType === 'seeking') {
      if (cityRegistration === null) {
        setError('Please select city registration requirement');
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
      if (subletType === 'offering') {
        setError('Available To date must be after Available From date');
      } else {
        setError('Move-out date must be after Move-in date');
      }
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const postData: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        city: city.trim(),
        availableFrom: formatDateToDDMMYYYY(availableFrom),
        availableTo: formatDateToDDMMYYYY(availableTo),
        rent: rent.trim() || undefined,
        type: subletType,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        independentArrangementConsent: consentChecked,
        cityRegistrationRequired: cityRegistration, // Backend now accepts this for BOTH offering and seeking
      };

      // Add offering-specific fields
      if (subletType === 'offering') {
        postData.address = address.trim();
        postData.pincode = pincode.trim();
        postData.deposit = deposit.trim() || undefined;
      }

      if (isEditing && editId) {
        console.log('PostSubletScreen: Updating sublet with data:', postData);
        await authenticatedPut(`/api/sublets/${editId}`, postData);
        console.log('PostSubletScreen: Sublet updated successfully');
        router.replace('/(tabs)/sublet');
      } else {
        console.log('PostSubletScreen: Creating sublet with data:', postData);
        await authenticatedPost('/api/sublets', postData);
        console.log('PostSubletScreen: Sublet created successfully');
        router.back();
      }
    } catch (error: any) {
      console.error('PostSubletScreen: Error saving sublet', error);
      setError(error.message || `Failed to ${isEditing ? 'update' : 'create'} sublet. Please try again.`);
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
        <ScrollView 
          style={styles.content} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.radioContainer}>
            <Text style={styles.radioLabel}>I am</Text>
            <View style={styles.radioButtons}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSubletType('offering')}
                disabled={isEditing}
              >
                <View style={styles.radioCircle}>
                  {subletType === 'offering' && <View style={styles.radioCircleSelected} />}
                </View>
                <Text style={styles.radioText}>offering</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() => setSubletType('seeking')}
                disabled={isEditing}
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
              <Text style={[styles.label, styles.labelReduced]}>Title *</Text>
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
                <View style={styles.consentRadio}>
                  {consentChecked && <View style={styles.consentRadioSelected} />}
                </View>
                <Text style={styles.consentText}>{consentText}</Text>
              </TouchableOpacity>
            </>
          )}

          {subletType === 'seeking' && (
            <>
              <Text style={[styles.label, styles.labelReduced]}>Title *</Text>
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

              <TouchableOpacity
                style={styles.consentContainer}
                onPress={() => setConsentChecked(!consentChecked)}
              >
                <View style={styles.consentRadio}>
                  {consentChecked && <View style={styles.consentRadioSelected} />}
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
  scrollContent: {
    paddingBottom: spacing.xxl,
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
  labelReduced: {
    marginTop: spacing.xs,
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
    paddingVertical: 10,
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
    paddingVertical: 10,
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
