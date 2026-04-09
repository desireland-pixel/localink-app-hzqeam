
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPut } from '@/utils/api';
import { CitySearchInput } from '@/components/CitySearchInput';
import { useRouter } from 'expo-router';
import Modal from '@/components/ui/Modal';

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const originalUsername = useRef('');
  const originalCity = useRef('');

  console.log('PersonalDetailsScreen: Rendering', { user: user?.id, profile: profile?.name });

  useEffect(() => {
    if (user) {
      setEmail(user.email || '');
    }
    if (profile) {
      const initialUsername = profile.username || '';
      const initialCity = profile.city || '';
      const initialName = profile.name || user?.name || '';
      setName(initialName);
      setCity(initialCity);
      setUsername(initialUsername);
      originalUsername.current = initialUsername;
      originalCity.current = initialCity;
    } else if (user) {
      setName(user.name || '');
    }
  }, [user, profile]);

  const hasChanges =
    username.trim() !== originalUsername.current ||
    city.trim() !== originalCity.current;

  const isFormValid = username.trim() && city.trim();
  const isSaveEnabled = isFormValid && hasChanges;

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
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      console.error('PersonalDetailsScreen: Error updating details', err);
      setError(err.message || 'Failed to update personal details');
    } finally {
      setLoading(false);
    }
  };

  const handleFaqsPress = () => {
    console.log('PersonalDetailsScreen: Navigate to FAQs');
    router.push('/faqs');
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
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

        <Text style={styles.label}>City *</Text>
        <CitySearchInput
          value={city}
          onChangeText={setCity}
          placeholder="Search city..."
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

        <TouchableOpacity
          style={[styles.button, (!isSaveEnabled || loading) && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={!isSaveEnabled || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        <View style={styles.deleteAccountSection}>
          <Text style={styles.deleteAccountTitle}>Delete Account</Text>
          <Text style={styles.deleteAccountText}>
            {'To delete your account, please send an email to support@lokalinc.de. More info in '}
            <Text style={styles.deleteAccountLink} onPress={handleFaqsPress}>
              FAQs page
            </Text>
            .
          </Text>
        </View>
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
  },
  inputDisabled: {
    opacity: 0.6,
    backgroundColor: colors.border,
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
  deleteAccountSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteAccountTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: spacing.xs,
  },
  deleteAccountText: {
    fontSize: 13,
    color: '#888888',
    lineHeight: 20,
  },
  deleteAccountLink: {
    fontSize: 13,
    color: '#888888',
    textDecorationLine: 'underline',
  },
});
