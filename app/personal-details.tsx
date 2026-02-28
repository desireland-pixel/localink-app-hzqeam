
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPut } from '@/utils/api';
import { CitySearchInput } from '@/components/CitySearchInput';
import { useRouter } from 'expo-router';
import Modal from '@/components/ui/Modal';
import { AppFooter } from '@/components/AppFooter';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const cityInputRef = useRef<View>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cityInputLayout, setCityInputLayout] = useState({ y: 0, height: 0 });

  console.log('PersonalDetailsScreen: Rendering', { user: user?.id, profile: profile?.name });

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
    if (profile) {
      setName(profile.name || user?.name || '');
      setCity(profile.city || '');
      setUsername(profile.username || '');
    } else if (user) {
      setName(user.name || '');
    }
  }, [user, profile]);

  const handleCityInputFocus = () => {
    // When city input is focused, scroll to make it visible above the keyboard
    setTimeout(() => {
      if (cityInputLayout.y > 0) {
        scrollViewRef.current?.scrollTo({
          y: cityInputLayout.y - 100, // Scroll with some offset to show dropdown
          animated: true,
        });
      }
    }, 300);
  };

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

    try {
      const updateData: any = {
        username: username.trim(),
        city: city.trim(),
      };
      
      const response = await authenticatedPut('/api/profile', updateData);
      console.log('PersonalDetailsScreen: Profile update response:', response);
      
      // Refresh profile to get updated data from backend
      await refreshProfile();
      
      // Navigate to home page after successful save
      console.log('PersonalDetailsScreen: Profile saved, redirecting to home page');
      router.replace('/(tabs)/sublet');
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

  const isFormValid = username.trim() && city.trim();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        keyboardShouldPersistTaps="handled" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.label}>Full Name *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="Enter your full name"
          placeholderTextColor={colors.textLight}
          value={name}
          editable={false}
        />

        <Text style={styles.label}>Username *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          placeholderTextColor={colors.textLight}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          editable={!loading}
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="Email address"
          placeholderTextColor={colors.textLight}
          value={email}
          editable={false}
        />

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          placeholder="••••••••"
          placeholderTextColor={colors.textLight}
          value="••••••••"
          editable={false}
          secureTextEntry={true}
        />

        <Text style={styles.label}>City *</Text>
        <View
          ref={cityInputRef}
          onLayout={(event) => {
            const { y, height } = event.nativeEvent.layout;
            setCityInputLayout({ y, height });
          }}
        >
          <CitySearchInput
            value={city}
            onChangeText={setCity}
            placeholder="Search city..."
            onFocus={handleCityInputFocus}
          />
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <AppFooter>
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
      </AppFooter>

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
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    height: 44,
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.border,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
