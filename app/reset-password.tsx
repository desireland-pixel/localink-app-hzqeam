
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, typography, spacing, borderRadius } from "@/styles/commonStyles";
import { IconSymbol } from "@/components/IconSymbol";
import Modal from "@/components/ui/Modal";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();
  console.log('[ResetPassword] token value:', token)
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const hasToken = !!token && token.length > 0;

  const handleToggleNewPassword = () => {
    console.log('[ResetPassword] Toggle new password visibility');
    setShowNewPassword((prev) => !prev);
  };

  const handleToggleConfirmPassword = () => {
    console.log('[ResetPassword] Toggle confirm password visibility');
    setShowConfirmPassword((prev) => !prev);
  };

  const handleSubmit = async () => {
    console.log('[ResetPassword] Submit pressed, token present:', hasToken);

    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[ResetPassword] POST /api/auth/do-reset-password called');
      const response = await fetch(
        'https://prod-proj-dpluqp3d5nexthtfrcpmq-liwg5h36mq-ey.a.run.app/api/auth/do-reset-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: token as string, newPassword }),
        }
      );
      if (!response.ok) {
        const text = await response.text();
        let userMsg = "Failed to reset password. Please try again.";
        try {
          const json = JSON.parse(text);
          if (json.error) userMsg = json.error;
        } catch {
          // non-JSON error body
        }
        console.error('[ResetPassword] Reset password error:', response.status, text);
        setError(userMsg);
      } else {
        const json = await response.json();
        if (json.success) {
          console.log('[ResetPassword] Password reset successful');
          setSuccess(true);
        } else {
          const userMsg = json.error || "Failed to reset password. Please try again.";
          console.error('[ResetPassword] Reset password failed:', userMsg);
          setError(userMsg);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToSignIn = () => {
    console.log('[ResetPassword] Navigate to sign in');
    router.replace('/auth');
  };

  const handleSuccessClose = () => {
    console.log('[ResetPassword] Success modal closed, navigating to auth');
    setSuccess(false);
    router.replace('/auth');
  };

  const isFormValid = newPassword.length >= 8 && confirmPassword.length >= 8;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Header — matches auth.tsx */}
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/Logo_LokaLinc.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>LokaLinc</Text>
              <Text style={styles.tagline}>Living and Moving together</Text>
              <Text style={styles.subtitle}>Set new password</Text>
            </View>

            {!hasToken ? (
              /* Invalid / missing token state */
              <View style={styles.invalidTokenContainer}>
                <View style={styles.invalidTokenIcon}>
                  <IconSymbol
                    ios_icon_name="exclamationmark.triangle"
                    android_material_icon_name="warning"
                    size={40}
                    color={colors.error}
                  />
                </View>
                <Text style={styles.invalidTokenTitle}>Invalid Link</Text>
                <Text style={styles.invalidTokenMessage}>
                  This password reset link is invalid or has expired. Please request a new reset email.
                </Text>
                <TouchableOpacity style={styles.primaryButton} onPress={handleGoToSignIn}>
                  <Text style={styles.primaryButtonText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* Reset form */
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="At least 8 characters"
                      placeholderTextColor={colors.textLight}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={!showNewPassword}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={handleToggleNewPassword}
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
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Re-enter your password"
                      placeholderTextColor={colors.textLight}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={handleToggleConfirmPassword}
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
                  style={[
                    styles.primaryButton,
                    (loading || !isFormValid) && styles.buttonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading || !isFormValid}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Reset Password</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={handleGoToSignIn}
                  disabled={loading}
                >
                  <Text style={styles.switchModeText}>
                    <Text style={styles.switchModeTextBlack}>Remember your password? </Text>
                    <Text style={styles.switchModeTextBold}>Back to Sign In</Text>
                  </Text>
                </TouchableOpacity>
              </>
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
        visible={success}
        onClose={handleSuccessClose}
        title="Password Reset"
        message="Your password has been reset successfully. You can now sign in with your new password."
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
    justifyContent: "center",
    paddingTop: Platform.OS === 'android' ? spacing.sm : spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  logo: {
    width: 70,
    height: 70,
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  tagline: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: "center",
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
    textAlignVertical: 'center',
    minHeight: 44,
  },
  passwordToggle: {
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  primaryButtonText: {
    ...typography.button,
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchModeButton: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  switchModeText: {
    ...typography.bodySmall,
  },
  switchModeTextBlack: {
    color: '#000000',
  },
  switchModeTextBold: {
    color: colors.primary,
    fontWeight: '700',
  },
  invalidTokenContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  invalidTokenIcon: {
    marginBottom: spacing.md,
  },
  invalidTokenTitle: {
    ...typography.h3,
    color: colors.error,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  invalidTokenMessage: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
});
