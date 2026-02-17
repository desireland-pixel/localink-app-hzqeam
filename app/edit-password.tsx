
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from '@/components/ui/Modal';
import { authenticatedPut } from '@/utils/api';
import { IconSymbol } from '@/components/IconSymbol';

export default function EditPasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  console.log('[EditPassword] Rendering');

  const handleSave = async () => {
    console.log('[EditPassword] Saving new password');
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[EditPassword] Calling change-password API');
      await authenticatedPut('/api/profile/change-password', {
        oldPassword,
        newPassword,
      });
      console.log('[EditPassword] Password updated successfully');
      setSuccess('Password updated successfully!');
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err: any) {
      console.error('[EditPassword] Password update failed:', err);
      const errorMsg = err.message || err.toString();
      if (errorMsg.includes('500') || errorMsg.includes('Failed to change password')) {
        setError('Current password is incorrect. Please try again.');
      } else if (errorMsg.includes('401') || errorMsg.includes('Unauthorized')) {
        setError('Session expired. Please sign in again.');
      } else {
        setError('Failed to update password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = oldPassword && newPassword && confirmPassword && newPassword === confirmPassword;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>Edit Password</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Old Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your current password"
                  placeholderTextColor={colors.textLight}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  secureTextEntry={!showOldPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowOldPassword(!showOldPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showOldPassword ? "eye.slash" : "eye"}
                    android_material_icon_name={showOldPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your new password"
                  placeholderTextColor={colors.textLight}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showNewPassword ? "eye.slash" : "eye"}
                    android_material_icon_name={showNewPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your new password"
                  placeholderTextColor={colors.textLight}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <IconSymbol
                    ios_icon_name={showConfirmPassword ? "eye.slash" : "eye"}
                    android_material_icon_name={showConfirmPassword ? "visibility-off" : "visibility"}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={!!error}
        onClose={() => setError(null)}
        title="Error"
        message={error || ''}
        type="error"
      />

      <Modal
        visible={!!success}
        onClose={() => setSuccess(null)}
        title="Success"
        message={success || ''}
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  passwordContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    paddingRight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 32,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: '#FFFFFF',
  },
});
