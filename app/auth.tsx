
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
import { apiPost, apiGet } from "@/utils/api";
import { IconSymbol } from "@/components/IconSymbol";
import { CitySearchInput } from "@/components/CitySearchInput";

type Mode = "signin" | "signup" | "forgot-password";

const DEFAULT_TERMS_CONTENT = `Welcome to LokaLinc!

By creating an account and using our services, you agree to the following terms:

1. Account Registration
- You must provide accurate and complete information
- You are responsible for maintaining the security of your account
- You must be at least 18 years old to use this service

2. User Conduct
- You agree to use LokaLinc respectfully and lawfully
- You will not post false, misleading, or harmful content
- You will not harass, abuse, or harm other users

3. Content
- You retain ownership of content you post
- By posting, you grant LokaLinc a license to display and distribute your content
- LokaLinc reserves the right to remove content that violates these terms

4. Privacy
- We collect and process your data as described in our Privacy Policy
- Your personal information will be handled in accordance with GDPR

5. Liability
- LokaLinc is a platform connecting users
- We are not responsible for transactions between users
- Use the service at your own risk

6. Termination
- We reserve the right to suspend or terminate accounts that violate these terms
- You may delete your account at any time

7. Changes to Terms
- We may update these terms from time to time
- Continued use of the service constitutes acceptance of updated terms

For questions or concerns, please contact us through the app.

Last updated: February 2025`;

export default function AuthScreen() {
  const router = useRouter();
  const { user, signInWithEmail, loading: authLoading } = useAuth();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState<string | null>(null);

  const fetchAndShowTerms = async () => {
    if (termsContent) {
      setShowTermsModal(true);
      return;
    }
    try {
      console.log('[AuthScreen] Fetching Terms & Conditions from backend');
      const result = await apiGet<any>('/api/terms-and-conditions');
      let content = '';
      if (typeof result === 'string') {
        content = result;
      } else if (result && typeof result === 'object') {
        content = result.content || result.terms || result.text || result.html || '';
        if (!content) content = JSON.stringify(result, null, 2);
      }
      setTermsContent(content || DEFAULT_TERMS_CONTENT);
    } catch (err) {
      console.error('[AuthScreen] Failed to fetch T&C, using default:', err);
      setTermsContent(DEFAULT_TERMS_CONTENT);
    } finally {
      setShowTermsModal(true);
    }
  };

  console.log('[AuthScreen] Rendering, mode:', mode, 'user:', user?.id, 'profile:', profile?.name);

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) {
      console.log('[AuthScreen] Auth loading, waiting...');
      return;
    }

    if (user) {
      console.log('[AuthScreen] User authenticated, redirecting to home (sublet)');
      router.replace('/(tabs)/sublet');
    }
  }, [user, authLoading, router]);

  if (authLoading) {
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

    if (mode === "signup") {
      if (!name.trim()) {
        setError("Please enter your full name");
        return;
      }
      if (!username.trim()) {
        setError("Please enter a username");
        return;
      }
      if (!city.trim()) {
        setError("Please select a city");
        return;
      }
      if (!termsAccepted) {
        setError("Please accept the Terms & Conditions");
        return;
      }
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
          } else {
            // For any authentication failure (wrong email/password), show generic error message
            setError('Email or Password is incorrect.');
          }
          throw signInErr;
        }
      } else {
        console.log('[AuthScreen] Signing up with email');
        // Call backend signup API directly to get OTP flow
        const result = await apiPost('/api/signup', { 
          email, 
          password, 
          name,
          username,
          city,
          termsAccepted: true
        });
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

  const isSignUpFormValid = mode === "signup" && name.trim() && email.trim() && password.trim() && username.trim() && city.trim() && termsAccepted;
  const isSignInFormValid = mode === "signin" && email.trim() && password.trim();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        keyboardVerticalOffset={Platform.OS === "android" ? 0 : 0}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <View style={styles.header}>
              <Image
                source={require('@/assets/images/e0ef75c7-f2f2-4978-a582-c04be452d5cf.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>LokaLinc</Text>
              <Text style={styles.tagline}>Living and Moving together</Text>
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
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Full Name *</Text>
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
                  </>
                )}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>{mode === "signup" ? "Email *" : "Email"}</Text>
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
                  <Text style={styles.label}>{mode === "signup" ? "Password *" : "Password"}</Text>
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

                {mode === "signup" && (
                  <>
                    <Text style={styles.infoText}>The following things can be changed later under Personal details</Text>
                    
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Username *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Enter your username"
                        placeholderTextColor={colors.textLight}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>City *</Text>
                      <CitySearchInput
                        value={city}
                        onChangeText={setCity}
                        placeholder="Search city..."
                      />
                    </View>

                    <View style={styles.termsContainer}>
                      <TouchableOpacity
                        style={styles.radioRow}
                        onPress={() => setTermsAccepted(!termsAccepted)}
                        disabled={loading}
                      >
                        <View style={styles.radioCircle}>
                          {termsAccepted && <View style={styles.radioCircleSelected} />}
                        </View>
                        <Text style={styles.termsText}>
                          By creating an account on LokaLinc you hereby agree to our{' '}
                          <Text 
                            style={styles.termsLink}
                            onPress={(e) => {
                              e.stopPropagation();
                              fetchAndShowTerms();
                            }}
                          >
                            Terms & Conditions
                          </Text>
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {mode === "signin" && (
                  <>
                    <View style={styles.rememberMeRow}>
                      <TouchableOpacity
                        style={styles.rememberMeButton}
                        onPress={() => setRememberMe(!rememberMe)}
                        disabled={loading}
                      >
                        <View style={styles.checkbox}>
                          {rememberMe && (
                            <IconSymbol
                              ios_icon_name="checkmark"
                              android_material_icon_name="check"
                              size={16}
                              color={colors.primary}
                            />
                          )}
                        </View>
                        <Text style={styles.rememberMeText}>Remember me</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.forgotPasswordButton}
                        onPress={() => setMode("forgot-password")}
                        disabled={loading}
                      >
                        <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                      </TouchableOpacity>
                    </View>
                  </>
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

      <Modal
        visible={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        title="Terms & Conditions"
        message={termsContent || DEFAULT_TERMS_CONTENT}
        type="info"
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
    paddingVertical: spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: spacing.sm,
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
    fontStyle: "italic",
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  inputGroup: {
    marginBottom: spacing.sm,
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
  infoText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
    marginBottom: spacing.sm,
    fontStyle: "italic",
  },
  termsContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioCircleSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  termsText: {
    ...typography.bodySmall,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  rememberMeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  rememberMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberMeText: {
    ...typography.bodySmall,
    color: colors.text,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
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
    marginTop: spacing.sm,
  },
  primaryButtonText: {
    ...typography.button,
    color: "#FFFFFF",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  switchModeButton: {
    marginTop: spacing.sm,
    alignItems: "center",
  },
  switchModeText: {
    ...typography.bodySmall,
    color: colors.primary,
  },
});
