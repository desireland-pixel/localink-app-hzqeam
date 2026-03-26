
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
import { apiPost, apiGet, BACKEND_URL } from "@/utils/api";
import { IconSymbol } from "@/components/IconSymbol";
import { CitySearchInput } from "@/components/CitySearchInput";
import { setBearerToken } from "@/lib/auth";
import * as SecureStore from "expo-secure-store";

type Mode = "signin" | "signup" | "forgot-password";

const DEFAULT_TERMS_CONTENT = `Welcome to LokaLinc!

By creating an account and using our services, you agree to the following terms:

1. Platform Nature
- LokaLinc is a digital platform that enables users to connect for housing, travel coordination, and community interaction. LokaLinc is not a rental provider, logistics company, courier service, payment processor, or contracting party to agreements between users.

2. Subletting
- Users are solely responsible for compliance with applicable rental laws, including obtaining any required landlord consent. LokaLinc assumes no responsibility for legality or fulfillment of subletting arrangements.

3. Travel & Item Coordination
- Users are solely responsible for compliance with customs laws, airline regulations, and all applicable legal requirements. The transport of illegal, restricted, or hazardous goods is strictly prohibited. LokaLinc assumes no liability for arrangements between users.

4. User Content
- Users are responsible for content they publish. We reserve the right to remove content or suspend accounts.

5. Liability
- LokaLinc shall only be liable in cases of intent or gross negligence, except where mandatory statutory provisions apply.

6. Termination
- Accounts may be suspended for violations. Users may request deletion at any time.

For questions or concerns, please contact us through the app or email.

Last updated: March 2026`;

// Storage keys for Remember Me
const REMEMBER_ME_EMAIL_KEY = "localink_remember_email";
const REMEMBER_ME_PASSWORD_KEY = "localink_remember_password";

export default function AuthScreen() {
  const router = useRouter();
  const { user, profile, fetchUser, loading: authLoading } = useAuth();

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
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  // Username uniqueness is NOT checked here — it is deferred to after OTP verification

  // Load saved credentials on mount if Remember Me was previously enabled
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        if (Platform.OS === "web") {
          const savedEmail = localStorage.getItem(REMEMBER_ME_EMAIL_KEY);
          const savedPassword = localStorage.getItem(REMEMBER_ME_PASSWORD_KEY);
          if (savedEmail && savedPassword) {
            console.log('[AuthScreen] Loading saved credentials from localStorage');
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
          }
        } else {
          const savedEmail = await SecureStore.getItemAsync(REMEMBER_ME_EMAIL_KEY);
          const savedPassword = await SecureStore.getItemAsync(REMEMBER_ME_PASSWORD_KEY);
          if (savedEmail && savedPassword) {
            console.log('[AuthScreen] Loading saved credentials from SecureStore');
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
          }
        }
      } catch (err) {
        console.error('[AuthScreen] Error loading saved credentials:', err);
      }
    };

    loadSavedCredentials();
  }, []);

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
    console.log('[AuthScreen] Email auth attempt, mode:', mode, 'rememberMe:', rememberMe);

    // Reset inline errors
    setEmailError(null);
    setPasswordError(null);
    
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]{2,}\.[^\s@]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      console.log('[AuthScreen] Email validation failed:', email);
      setEmailError("Please enter a valid email address.");
      return;
    }

    // Password minimum length
    if (password.length < 8) {
      console.log('[AuthScreen] Password too short:', password.length, 'chars');
      setPasswordError("Password must be at least 8 characters.");
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
        console.log('[AuthScreen] Signing in with email:', email, 'rememberMe:', rememberMe);
        
        // Call backend login API with rememberMe parameter
        const response = await fetch(`${BACKEND_URL}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, rememberMe }),
          credentials: 'include',
        });

        console.log('[AuthScreen] Login response status:', response.status);

        // Parse response body
        let data: any;
        try {
          const text = await response.text();
          console.log('[AuthScreen] Login response body:', text);
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('[AuthScreen] Failed to parse response:', parseError);
          throw new Error('Invalid response from server');
        }

        if (!response.ok) {
          const errorMsg = data?.error || data?.message || 'Login failed';
          console.error('[AuthScreen] Login failed:', errorMsg);
          
          if (errorMsg.includes('not verified') || errorMsg.includes('verify') || errorMsg.includes('OTP')) {
            setError('Email not verified. Please check your email for the verification code.');
            // Redirect to OTP verification
            setTimeout(() => {
              router.push({ pathname: '/verify-otp', params: { email } });
            }, 2000);
          } else if (errorMsg.includes('Invalid') || errorMsg.includes('incorrect') || errorMsg.includes('wrong') || errorMsg.includes('credentials')) {
            // For authentication failures (wrong email/password)
            setError('Email or Password is incorrect.');
          } else {
            // Generic error
            setError(errorMsg || 'Login failed. Please try again.');
          }
          throw new Error(errorMsg);
        }

        // Store bearer token if returned
        if (data?.session?.token) {
          console.log('[AuthScreen] Storing bearer token after email sign in');
          await setBearerToken(data.session.token);
        } else if (data?.token) {
          console.log('[AuthScreen] Storing bearer token (token field) after email sign in');
          await setBearerToken(data.token);
        }

        // Save or clear credentials based on Remember Me
        if (rememberMe) {
          console.log('[AuthScreen] Saving credentials for Remember Me');
          if (Platform.OS === "web") {
            localStorage.setItem(REMEMBER_ME_EMAIL_KEY, email);
            localStorage.setItem(REMEMBER_ME_PASSWORD_KEY, password);
          } else {
            await SecureStore.setItemAsync(REMEMBER_ME_EMAIL_KEY, email);
            await SecureStore.setItemAsync(REMEMBER_ME_PASSWORD_KEY, password);
          }
        } else {
          console.log('[AuthScreen] Clearing saved credentials (Remember Me not checked)');
          if (Platform.OS === "web") {
            localStorage.removeItem(REMEMBER_ME_EMAIL_KEY);
            localStorage.removeItem(REMEMBER_ME_PASSWORD_KEY);
          } else {
            await SecureStore.deleteItemAsync(REMEMBER_ME_EMAIL_KEY);
            await SecureStore.deleteItemAsync(REMEMBER_ME_PASSWORD_KEY);
          }
        }

        // Trigger auth context refresh to fetch user and profile
        console.log('[AuthScreen] Sign in successful, triggering auth refresh');
        await fetchUser();
        
        // Navigation will happen automatically via the useEffect that watches user state
      } else {
        console.log('[AuthScreen] Signing up with email');
        // Call backend signup API directly to get OTP flow
        // Backend now allows re-signup if email_verified = false (unverified accounts)
        // Username uniqueness is NOT checked here — deferred to after OTP verification
        const result = await apiPost<{
          success: boolean;
          message?: string;
          requiresOtpVerification?: boolean;
          email?: string;
        }>('/api/signup', { 
          email, 
          password, 
          name,
          username: username.toLowerCase(),
          city,
          termsAccepted: true
        });
        console.log('[AuthScreen] Sign up successful, redirecting to OTP verification', result);
        // Pass signup data to OTP screen so username can be registered after verification
        router.push({
          pathname: '/verify-otp',
          params: { email, username: username.toLowerCase(), name, city },
        });
      }
    } catch (err: any) {
      console.error('[AuthScreen] Auth error:', err);
      // Error already set in signin block, only set if not already set
      if (!error) {
        const errorMsg = err.message || err.toString();
        // Try to extract JSON error message from API error response
        let parsedErrorMsg = errorMsg;
        try {
          const jsonMatch = errorMsg.match(/\{.*\}/s);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            parsedErrorMsg = parsed.error || parsed.message || errorMsg;
          }
        } catch (_) {}
        
        if (parsedErrorMsg.toLowerCase().includes('username already exists')) {
          // Show username error below the username field instead of a modal
          setUsernameError('Username already exists');
        } else if (
          parsedErrorMsg.toLowerCase().includes('already exists') ||
          parsedErrorMsg.toLowerCase().includes('please sign in') ||
          parsedErrorMsg.includes('duplicate')
        ) {
          // Account exists and is verified - direct user to sign in
          setError('An account with this email already exists. Please sign in instead.');
        } else {
          setError(parsedErrorMsg || "Authentication failed. Please try again.");
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

  const isSignUpFormValid = mode === "signup" && name.trim() && email.trim() && password.trim() && username.trim() && city.trim() && termsAccepted && !usernameError;
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
                source={require('@/assets/images/Logo_LokaLinc.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>LokaLinc</Text>
              <Text style={styles.tagline}>Living and Moving together</Text>
              <Text style={styles.subtitle}>
                {mode === "signin" ? "Welcome back!" : mode === "signup" ? "Join the community" : "Reset your password"}
              </Text>
            </View>

            {mode === "forgot-password" ? (
              <>
                <View style={styles.inputGroup}>
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
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
                      <TextInput
                        style={styles.input}
                        placeholder="Full Name *"
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
                  {mode === "signin" && <Text style={styles.inputLabel}>Email</Text>}
                  <TextInput
                    style={styles.input}
                    placeholder={mode === "signup" ? "Email *" : "Email"}
                    placeholderTextColor={colors.textLight}
                    value={email}
                    onChangeText={(v) => { setEmail(v); setEmailError(null); }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                  {emailError && (
                    <Text style={styles.inlineError}>{emailError}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  {mode === "signin" && <Text style={styles.inputLabel}>Password</Text>}
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder={mode === "signup" ? "Password *" : "Password"}
                      placeholderTextColor={colors.textLight}
                      value={password}
                      onChangeText={(v) => { setPassword(v); setPasswordError(null); }}
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
                  {passwordError && (
                    <Text style={styles.inlineError}>{passwordError}</Text>
                  )}
                </View>

                {mode === "signup" && (
                  <>
                    <Text style={styles.infoText}>The following entries can be changed later under Personal details</Text>
                    
                    <View style={styles.inputGroup}>
                      <TextInput
                        style={styles.input}
                        placeholder="username * (small-case only)"
                        placeholderTextColor={colors.textLight}
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                      />
                      {usernameError && (
                        <Text style={styles.usernameError}>{usernameError}</Text>
                      )}
                    </View>

                    <View style={styles.inputGroup}>
                      <CitySearchInput
                        value={city}
                        onChangeText={setCity}
                        placeholder="City *"
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
                  {mode === "signin" ? (
                    <Text style={styles.switchModeText}>
                      <Text style={styles.switchModeTextBlack}>Don&apos;t have an account? </Text>
                      <Text style={styles.switchModeTextBold}>Sign Up</Text>
                    </Text>
                  ) : (
                    <Text style={styles.switchModeText}>
                      <Text style={styles.switchModeTextBlack}>Already have an account? </Text>
                      <Text style={styles.switchModeTextBold}>Sign In</Text>
                    </Text>
                  )}
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
    fontStyle: "normal",
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
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
    minHeight: 44,
    textAlignVertical: 'center',
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
  infoText: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontSize: 11,
    marginBottom: spacing.sm,
    fontStyle: "italic",
  },
  usernameError: {
    ...typography.bodySmall,
    color: '#FF3B30',
    fontSize: 11,
    marginTop: spacing.xs,
  },
  inlineError: {
    ...typography.bodySmall,
    color: '#FF3B30',
    fontSize: 11,
    marginTop: spacing.xs,
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
    marginBottom: spacing.md,
    marginTop: spacing.xs,
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
});
