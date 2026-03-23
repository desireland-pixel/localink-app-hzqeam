
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import Modal from '@/components/ui/Modal';
import { apiPost } from '@/utils/api';

export default function VerifyOTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  console.log('[VerifyOTP] Rendering, email:', email);

  const handleVerifyOTP = async () => {
    console.log('[VerifyOTP] Verifying OTP');
    
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      console.log('[VerifyOTP] Calling verify-otp API');
      const result = await apiPost('/api/verify-otp', { email, otp });
      console.log('[VerifyOTP] OTP verified successfully', result);
      setVerified(true);
      setSuccess('Your account has been created successfully!');
    } catch (err: any) {
      console.error('[VerifyOTP] OTP verification failed:', err);
      const errorMsg = err.message || err.toString();
      if (errorMsg.includes('Invalid') || errorMsg.includes('expired') || errorMsg.includes('400')) {
        setError('Incorrect OTP. Please try again.');
      } else {
        setError('OTP verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    console.log('[VerifyOTP] Resending OTP');
    setResending(true);
    setError(null);
    
    try {
      console.log('[VerifyOTP] Calling resend-otp API');
      await apiPost('/api/resend-otp', { email });
      console.log('[VerifyOTP] OTP resent successfully');
      setSuccess('OTP has been resent to your email');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('[VerifyOTP] Resend OTP failed:', err);
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  const handleContinue = () => {
    console.log('[VerifyOTP] Navigating to login');
    router.replace('/auth');
  };

  const emailDisplay = email || 'your email ID';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            {!verified ? (
              <>
                <View style={styles.header}>
                  <Text style={styles.emoji}>📤</Text>
                  <Text style={styles.title}>Verify your email</Text>
                  <Text style={styles.subtitle}>We have sent an OTP to {emailDisplay}</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Enter OTP</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="000000"
                    placeholderTextColor={colors.textLight}
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!loading}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, (loading || otp.length !== 6) && styles.buttonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Confirm OTP</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendButton}
                  onPress={handleResendOTP}
                  disabled={resending || loading}
                >
                  {resending ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.resendText}>Didn&apos;t receive OTP? Resend</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.successContainer}>
                <Text style={styles.successEmoji}>✅</Text>
                <Text style={styles.successTitle}>Account Created!</Text>
                <Text style={styles.successMessage}>
                  Your account has been created successfully. You can now sign in.
                </Text>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleContinue}
                >
                  <Text style={styles.primaryButtonText}>OK</Text>
                </TouchableOpacity>
              </View>
            )}
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
        visible={!!success && !verified}
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
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  emoji: {
    fontSize: 60,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
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
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 8,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    width: '100%',
  },
  primaryButtonText: {
    ...typography.button,
    color: '#FFFFFF',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  resendButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  resendText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
  successContainer: {
    alignItems: 'center',
  },
  successEmoji: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
  successMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
});
