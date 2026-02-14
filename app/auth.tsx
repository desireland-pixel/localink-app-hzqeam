
import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { colors, typography, spacing, borderRadius } from "@/styles/commonStyles";
import { SafeAreaView } from "react-native-safe-area-context";
import Modal from "@/components/ui/Modal";
import { apiPost } from "@/utils/api";
import { IconSymbol } from "@/components/IconSymbol";

type Mode = "signin" | "signup" | "forgot-password";

export default function AuthScreen() {
  const router = useRouter();
  const { user, profile, signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple, loading: authLoading, profileLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  console.log('[AuthScreen] Rendering, mode:', mode, 'user:', user?.id, 'profile:', profile?.name);

  // Redirect if already authenticated - directly to home page (sublet)
  useEffect(() => {
    if (authLoading || profileLoading) {
      console.log('[AuthScreen] Auth/profile loading, waiting...');
      return;
    }

    if (user) {
      console.log('[AuthScreen] User authenticated, redirecting to home (sublet)');
      router.replace('/(tabs)/sublet');
    }
  }, [user, profile, authLoading, profileLoading]);

  if (authLoading || profileLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const handleEmailAuth = async () => {
    console.log('[AuthScreen] Email auth attempt, mode:', mode);
    
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (mode === "signin") {
        console.log('[AuthScreen] Signing in with email');
        try {
          await signInWithEmail(email, password);
          console.log('[AuthScreen] Sign in successful');
          // Navigation will be handled by useEffect
        } catch (signInErr: any) {
          // Check for specific error messages from backend
          const errorMsg = signInErr.message || signInErr.toString();
          console.log('[AuthScreen] Sign in error message:', errorMsg);
          
          if (errorMsg.includes('not verified') || errorMsg.includes('verify') || errorMsg.includes('OTP')) {
            setError('Email not verified. Please check your email for the verification code.');
            // Redirect to OTP verification
            setTimeout(() => {
              router.push({ pathname: '/verify-otp', params: { email } });
            }, 2000);
          } else if (errorMsg.includes('incorrect') || errorMsg.includes('Invalid') || errorMsg.includes('password') || errorMsg.includes('credentials') || errorMsg.includes('401')) {
            setError('Email or Password is incorrect.');
          } else {
            setError('Email or Password is incorrect.');
          }
          throw signInErr;
        }
      } else {
        console.log('[AuthScreen] Signing up with email');
        // Call backend signup API directly to get OTP flow
        const result = await apiPost('/api/signup', { email, password, name });
        console.log('[AuthScreen] Sign up successful, redirecting to OTP verification');
        router.push({ pathname: '/verify-otp', params: { email } });
      }
    } catch (err: any) {
      console.error('[AuthScreen] Auth error:', err);
      // Error already set in signin block, only set if not already set
      if (!error) {
        const errorMsg = err.message || err.toString();
        if (errorMsg.includes('already exists') || errorMsg.includes('duplicate')) {
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(errorMsg || "Authentication failed. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    console.log('[AuthScreen] Forgot password attempt');
    
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('[AuthScreen] Sending password reset email to:', email);
      await apiPost('/api/auth/forgot-password', { email });
      console.log('[AuthScreen] Password reset email sent successfully');
      setSuccess("Password reset email sent! Please check your inbox.");
      setTimeout(() => {
        setMode("signin");
      }, 2000);
    } catch (err: any) {
      console.error('[AuthScreen] Forgot password error:', err);
      const errorMsg = err.message || err.toString();
      if (errorMsg.includes('404') || errorMsg.includes('not found')) {
        setError("No account found with this email address.");
      } else {
        setError("Failed to send reset email. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    console.log('[AuthScreen] Social auth attempt, provider:', provider);
    setLoading(true);
    setError(null);
    
    try {
      if (provider === "google") {
        await signInWithGoogle();
      } else if (provider === "apple") {
        await signInWithApple();
      }
      console.log('[AuthScreen] Social auth successful');
      // Navigation will be handled by useEffect
    } catch (err: any) {
      console.error('[AuthScreen] Social auth error:', err);
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const isSignUpFormValid = mode === "signup" && name.trim() && email.trim() && password.trim();
  const isSignInFormValid = mode === "signin" && email.trim() && password.trim();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/e0ef75c7-f2f2-4978-a582-c04be452d5cf.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>Localink</Text>
              <Text style={styles.subtitle}>
                {mode === "signin" ? "Welcome back!" : mode === "signup" ? "Create your account" : "Reset your password"}
              </Text>
            </View>

            {mode === "forgot-password" ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => setMode("signin")}
                  disabled={loading}
                >
                  <Text style={styles.switchModeText}>Back to Sign In</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {mode === "signup" && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your full name"
                      placeholderTextColor={colors.textLight}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      editable={!loading}
                    />
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.textLight}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter your password"
                      placeholderTextColor={colors.textLight}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      editable={!loading}
                    />
                    <TouchableOpacity
                      style={styles.passwordToggle}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <IconSymbol
                        ios_icon_name={showPassword ? "eye.slash" : "eye"}
                        android_material_icon_name={showPassword ? "visibility-off" : "visibility"}
                        size={20}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {mode === "signin" && (
                  <TouchableOpacity
                    style={styles.forgotPasswordButton}
                    onPress={() => setMode("forgot-password")}
                    disabled={loading}
                  >
                    <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    (loading || (mode === "signup" && !isSignUpFormValid) || (mode === "signin" && !isSignInFormValid)) && styles.buttonDisabled
                  ]}
                  onPress={handleEmailAuth}
                  disabled={loading || (mode === "signup" && !isSignUpFormValid) || (mode === "signin" && !isSignInFormValid)}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {mode === "signin" ? "Sign In" : "Sign Up"}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.switchModeButton}
                  onPress={() => setMode(mode === "signin" ? "signup" : "signin")}
                  disabled={loading}
                >
                  <Text style={styles.switchModeText}>
                    {mode === "signin"
                      ? "Don't have an account? Sign Up"
                      : "Already have an account? Sign In"}
                  </Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialAuth("google")}
                  disabled={loading}
                >
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={() => handleSocialAuth("apple")}
                  disabled={loading}
                >
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
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
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text,
    fontWeight: "600",
    marginBottom: spacing.xs,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  passwordToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    ...typography.bodySmall,
    color: colors.primary,
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
    color: colors.primary,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  socialButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  socialButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: "500",
  },
});
