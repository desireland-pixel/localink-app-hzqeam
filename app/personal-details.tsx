
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedGet, authenticatedPut, BACKEND_URL, getBearerToken } from '@/utils/api';
import { CitySearchInput } from '@/components/CitySearchInput';
import { useRouter } from 'expo-router';
import Modal from '@/components/ui/Modal';
import * as ImagePicker from 'expo-image-picker';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);

  console.log('PersonalDetailsScreen: Rendering', { user: user?.id, profile: profile?.name, gdprConsent });

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
    if (profile) {
      setName(profile.name || user?.name || '');
      setCity(profile.city || '');
      setUsername(profile.username || '');
      setGdprConsent((profile as any).gdprConsentAccepted || false);
    } else if (user) {
      setName(user.name || '');
    }
  }, [user, profile]);

  const handleSave = async () => {
    console.log('PersonalDetailsScreen: Saving personal details');
    
    if (!username.trim()) {
      setError('Username is required');
      return;
    }
    
    if (!city.trim()) {
      setError('City is required');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const updateData: any = {
        username: username.trim(),
        city: city.trim(),
      };
      
      // Only include gdprConsentAccepted if it's been checked
      if (gdprConsent) {
        updateData.gdprConsentAccepted = true;
      }
      
      await authenticatedPut('/api/profile', updateData);
      setSuccess('Personal details updated successfully');
      await refreshProfile();
      
      // If this is first-time setup (no profile before), redirect to main app
      if (!profile || !profile.username || !profile.city) {
        console.log('PersonalDetailsScreen: First-time setup complete, redirecting to main app');
        setTimeout(() => {
          router.replace('/(tabs)/sublet');
        }, 1000);
      }
    } catch (err: any) {
      console.error('PersonalDetailsScreen: Error updating details', err);
      setError(err.message || 'Failed to update personal details');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPassword = () => {
    console.log('PersonalDetailsScreen: Navigate to edit password');
    router.push('/edit-password');
  };

  const handlePickPhoto = async () => {
    console.log('PersonalDetailsScreen: Pick photo');
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      setError('Permission to access photos is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      console.log('PersonalDetailsScreen: Photo selected', asset.uri);
      
      // Check file size
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        setError('Photo size should be less than 5 mb');
        return;
      }
      
      setLoading(true);
      
      try {
        // Upload photo to backend
        const formData = new FormData();
        const uri = asset.uri;
        const filename = uri.split('/').pop() || 'profile.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        
        formData.append('photo', {
          uri,
          name: filename,
          type,
        } as any);
        
        const token = await getBearerToken();
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        const response = await fetch(`${BACKEND_URL}/api/upload/profile-photo`, {
          method: 'POST',
          body: formData,
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          if (errorText.includes('5 mb') || errorText.includes('5MB')) {
            throw new Error('Photo size should be less than 5 mb');
          }
          throw new Error('Failed to upload photo');
        }
        
        const data = await response.json();
        console.log('PersonalDetailsScreen: Photo uploaded', data);
        setSuccess('Profile photo updated successfully');
        await refreshProfile();
      } catch (err: any) {
        console.error('PersonalDetailsScreen: Error uploading photo', err);
        setError(err.message || 'Failed to upload photo');
      } finally {
        setLoading(false);
      }
    }
  };

  const isFormValid = username.trim() && city.trim();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textLight}
          value={name}
          editable={false}
        />

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          placeholderTextColor={colors.textLight}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="Email address"
          placeholderTextColor={colors.textLight}
          value={email}
          editable={false}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            style={[styles.input, styles.passwordInput, styles.inputDisabled]}
            placeholder="••••••••"
            placeholderTextColor={colors.textLight}
            value="••••••••"
            editable={false}
            secureTextEntry
          />
          <TouchableOpacity
            style={styles.editPasswordButton}
            onPress={handleEditPassword}
          >
            <Text style={styles.editPasswordText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>City</Text>
        <CitySearchInput
          value={city}
          onChangeText={setCity}
          placeholder="Search city..."
        />

        <Text style={styles.label}>Profile Photo</Text>
        <TouchableOpacity
          style={styles.photoButton}
          onPress={handlePickPhoto}
        >
          <Text style={styles.photoButtonText}>Add a photo</Text>
        </TouchableOpacity>

        <View style={styles.gdprContainer}>
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setGdprConsent(!gdprConsent)}
          >
            <View style={[styles.checkbox, gdprConsent && styles.checkboxChecked]}>
              {gdprConsent && (
                <Text style={styles.checkboxIcon}>✓</Text>
              )}
            </View>
            <Text style={styles.gdprText}>
              I consent to the processing of my personal data in accordance with the GDPR
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={!!error}
        title="Error"
        message={error}
        onClose={() => setError('')}
        type="error"
      />

      <Modal
        visible={!!success}
        title="Success"
        message={success}
        onClose={() => setSuccess('')}
        type="success"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.border,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  passwordInput: {
    flex: 1,
  },
  editPasswordButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  editPasswordText: {
    ...typography.button,
    color: '#FFFFFF',
    fontSize: 14,
  },
  photoButton: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  photoButtonText: {
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
  gdprContainer: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  gdprText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
});
