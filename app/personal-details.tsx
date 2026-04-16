
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { authenticatedPut, authenticatedPost } from '@/utils/api';
import { CitySearchInput } from '@/components/CitySearchInput';
import { useRouter } from 'expo-router';
import AppModal from '@/components/ui/Modal';
import { useScreenTracking } from '@/utils/useScreenTracking';
import { SCREEN_NAMES, capture } from '@/utils/analytics';

const DANGER_COLOR = '#E53935';
const DELETE_CONFIRM_WORD = 'DELETE';

export default function PersonalDetailsScreen() {
  useScreenTracking(SCREEN_NAMES.PERSONAL_DETAILS);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Delete account modal state
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const isDeleteConfirmValid = deleteConfirmText === DELETE_CONFIRM_WORD;

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
      
      await refreshProfile();
      
      console.log('PersonalDetailsScreen: Profile saved, redirecting to home page');
      router.replace('/(tabs)/profile');
    } catch (err: any) {
      console.error('PersonalDetailsScreen: Error updating details', err);
      setError(err.message || 'Failed to update personal details');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccountPress = () => {
    console.log('PersonalDetailsScreen: Delete account button pressed, opening modal');
    capture('account_deletion_requested');
    setDeleteConfirmText('');
    setDeleteModalVisible(true);
  };

  const handleDeleteModalCancel = () => {
    console.log('PersonalDetailsScreen: Delete account modal cancelled');
    capture('account_deletion_cancelled');
    setDeleteModalVisible(false);
    setDeleteConfirmText('');
  };

  const handleDeleteConfirm = async () => {
    console.log('PersonalDetailsScreen: Confirming account deletion');
    setDeleteLoading(true);

    try {
      await authenticatedPost('/api/user/delete-account', {});
      console.log('PersonalDetailsScreen: Account deletion request successful');

      capture('account_deletion_confirmed', { userId: user?.id });

      setDeleteModalVisible(false);
      setDeleteConfirmText('');

      Alert.alert(
        'Account Scheduled for Deletion',
        'Your account has been scheduled for deletion. You will receive a confirmation email. Your account and all associated data will be permanently deleted within 7 days.',
        [
          {
            text: 'OK',
            onPress: async () => {
              console.log('PersonalDetailsScreen: Signing out after account deletion');
              await signOut();
              router.replace('/auth');
            },
          },
        ]
      );
    } catch (err: any) {
      console.error('PersonalDetailsScreen: Account deletion failed', err);
      const errorMessage = err.message || 'Failed to delete account. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.outerContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
        >
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View>
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
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[styles.deleteAccountSection, { paddingBottom: insets.bottom > 0 ? insets.bottom : spacing.xl }]}>
          <TouchableOpacity
            style={styles.deleteAccountButton}
            onPress={handleDeleteAccountPress}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleDeleteModalCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalWarning}>
              Are you sure you want to delete your account? This action is permanent and cannot be undone. You will lose access immediately. All your data (posts, messages, favourites) will be permanently deleted within 7 days.
            </Text>

            <Text style={styles.modalInputLabel}>
              Type{' '}
              <Text style={styles.modalInputLabelBold}>DELETE</Text>
              {' '}to confirm
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Type DELETE to confirm"
              placeholderTextColor="#AAAAAA"
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!deleteLoading}
            />

            <TouchableOpacity
              style={[styles.modalConfirmButton, (!isDeleteConfirmValid || deleteLoading) && styles.modalConfirmButtonDisabled]}
              onPress={handleDeleteConfirm}
              disabled={!isDeleteConfirmValid || deleteLoading}
              activeOpacity={0.8}
            >
              {deleteLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.modalConfirmButtonText}>Confirm Delete</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={handleDeleteModalCancel}
              disabled={deleteLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <AppModal
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
  outerContainer: {
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
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
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
  // Delete account section
  deleteAccountSection: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteAccountTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: DANGER_COLOR,
    marginBottom: spacing.xs,
  },
  deleteAccountDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  deleteAccountButton: {
    borderWidth: 1.5,
    borderColor: DANGER_COLOR,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteAccountButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: DANGER_COLOR,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: DANGER_COLOR,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalWarning: {
    fontSize: 14,
    color: '#444444',
    lineHeight: 22,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalInputLabel: {
    fontSize: 13,
    color: '#666666',
    marginBottom: spacing.xs,
  },
  modalInputLabelBold: {
    fontWeight: '700',
    color: '#333333',
    letterSpacing: 1,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: '#222222',
    marginBottom: spacing.lg,
    letterSpacing: 1,
  },
  modalConfirmButton: {
    backgroundColor: DANGER_COLOR,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modalConfirmButtonDisabled: {
    opacity: 0.35,
  },
  modalConfirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCancelButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },
});
