
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { authClient, setBearerToken, clearAuthTokens } from "@/lib/auth";
import { authenticatedGet, getBearerToken, BACKEND_URL } from "@/utils/api";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
}

interface Profile {
  userId: string;
  name: string;
  username?: string;
  city: string;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileLoading: boolean;
  unreadCount: number;
  communityUnreadCount: number;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  fetchCommunityUnreadCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function openOAuthPopup(provider: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const popupUrl = `${window.location.origin}/auth-popup?provider=${provider}`;
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      popupUrl,
      "oauth-popup",
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    );

    if (!popup) {
      reject(new Error("Failed to open popup. Please allow popups."));
      return;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "oauth-success" && event.data?.token) {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        resolve(event.data.token);
      } else if (event.data?.type === "oauth-error") {
        window.removeEventListener("message", handleMessage);
        clearInterval(checkClosed);
        reject(new Error(event.data.error || "OAuth failed"));
      }
    };

    window.addEventListener("message", handleMessage);

    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener("message", handleMessage);
        reject(new Error("Authentication cancelled"));
      }
    }, 500);
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [communityUnreadCount, setCommunityUnreadCount] = useState(0);

  // Use a ref to hold the latest setUser/setProfile so we can call them from
  // inside fetchUser without stale-closure issues
  const setUserRef = useRef(setUser);
  const setProfileRef = useRef(setProfile);
  setUserRef.current = setUser;
  setProfileRef.current = setProfile;

  /**
   * Fetch the user's profile from the API.
   * Standalone function (not a useCallback) so it can be called from fetchUser
   * without circular dependency issues.
   */
  const fetchProfileStandalone = async (): Promise<void> => {
    try {
      console.log('[AuthContext] Fetching user profile');
      setProfileLoading(true);
      const response = await authenticatedGet<Profile>('/api/profile');
      console.log('[AuthContext] Profile fetched successfully:', response);
      setProfileRef.current(response);
    } catch (error: any) {
      console.log('[AuthContext] Profile fetch failed (may not exist yet):', error?.message);
      setProfileRef.current(null);
    } finally {
      setProfileLoading(false);
    }
  };

  /**
   * Core session check + refresh logic.
   *
   * Strategy:
   * 1. If we have a stored Bearer token, call /api/auth/refresh-session.
   *    - On success: update token (if new one returned), set user, fetch profile.
   *    - On 401: token is expired/invalid → clear tokens, set user null.
   * 2. If no stored token, fall back to authClient.getSession() (handles
   *    cookie-based sessions on web and native deep-link flows).
   */
  const fetchUser = React.useCallback(async (): Promise<void> => {
    try {
      console.log('[AuthContext] Fetching user session');

      const token = await getBearerToken();

      if (token) {
        console.log('[AuthContext] Token found, attempting session refresh via /api/auth/refresh-session');
        try {
          const refreshResponse = await fetch(`${BACKEND_URL}/api/auth/refresh-session`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (refreshResponse.ok) {
            const refreshData = await refreshResponse.json();
            console.log('[AuthContext] Session refreshed successfully');

            // If the backend issued a new token, persist it
            if (refreshData?.session?.token && refreshData.session.token !== token) {
              console.log('[AuthContext] Updating bearer token from refresh response');
              await setBearerToken(refreshData.session.token);
            }

            // Set user from refresh response
            if (refreshData?.user) {
              console.log('[AuthContext] Setting user from refresh response:', refreshData.user.id);
              setUserRef.current(refreshData.user as User);
              await fetchProfileStandalone();
              return; // ✅ Done
            }
          } else if (refreshResponse.status === 401) {
            // Token is definitively expired/invalid – clear it and fall through
            console.log('[AuthContext] Refresh returned 401 – clearing stored token');
            await clearAuthTokens();
          } else {
            console.log('[AuthContext] Session refresh failed with status:', refreshResponse.status, '– falling back to authClient');
          }
        } catch (refreshError) {
          console.log('[AuthContext] Session refresh network error:', refreshError, '– falling back to authClient');
        }
      }

      // Fallback: use Better Auth client (handles cookie sessions & native flows)
      console.log('[AuthContext] Falling back to authClient.getSession()');
      const session = await authClient.getSession();

      if (session?.data?.user) {
        console.log('[AuthContext] User session found via authClient:', session.data.user.id);
        setUserRef.current(session.data.user as User);

        // Persist the token so future refreshes work
        if (session.data.session?.token) {
          console.log('[AuthContext] Syncing bearer token from authClient session');
          await setBearerToken(session.data.session.token);
        }

        await fetchProfileStandalone();
      } else {
        console.log('[AuthContext] No user session found – user is logged out');
        setUserRef.current(null);
        setProfileRef.current(null);
        await clearAuthTokens();
      }
    } catch (error) {
      console.error('[AuthContext] Failed to fetch user:', error);
      setUserRef.current(null);
      setProfileRef.current(null);
    }
  }, []); // No deps – uses refs and standalone helpers

  const initializeAuth = React.useCallback(async () => {
    try {
      console.log('[AuthContext] Starting auth initialization');
      setLoading(true);
      await fetchUser();
    } catch (error) {
      console.error('[AuthContext] Auth initialization failed:', error);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [fetchUser]);

  const fetchProfileInternal = React.useCallback(async () => {
    await fetchProfileStandalone();
  }, []);

  const fetchProfile = React.useCallback(async () => {
    await fetchProfileStandalone();
  }, []);

  const refreshProfile = React.useCallback(async () => {
    console.log('[AuthContext] Refreshing profile');
    await fetchProfileStandalone();
  }, []);

  const fetchUnreadCountInternal = React.useCallback(async () => {
    try {
      const response = await authenticatedGet<{ unreadConversationCount: number }>('/api/conversations/unread-count');
      console.log('[AuthContext] Unread count fetched:', response.unreadConversationCount);
      setUnreadCount(response.unreadConversationCount || 0);
    } catch (error: any) {
      console.error('[AuthContext] Failed to fetch unread count:', error);
      setUnreadCount(0);
    }
  }, []);

  const fetchCommunityUnreadCountInternal = React.useCallback(async () => {
    try {
      const response = await authenticatedGet<{ unreadTopicsCount: number }>('/api/community/unread-count');
      console.log('[AuthContext] Community unread count fetched:', response.unreadTopicsCount);
      setCommunityUnreadCount(response.unreadTopicsCount || 0);
    } catch (error: any) {
      console.error('[AuthContext] Failed to fetch community unread count:', error);
      setCommunityUnreadCount(0);
    }
  }, []);

  const fetchUnreadCount = React.useCallback(async () => {
    await fetchUnreadCountInternal();
  }, [fetchUnreadCountInternal]);

  const fetchCommunityUnreadCount = React.useCallback(async () => {
    await fetchCommunityUnreadCountInternal();
  }, [fetchCommunityUnreadCountInternal]);

  useEffect(() => {
    console.log('[AuthContext] Initializing auth state');
    initializeAuth();

    const subscription = Linking.addEventListener("url", (event) => {
      console.log("[AuthContext] Deep link received, refreshing user session");
      setTimeout(() => initializeAuth(), 500);
    });

    // Refresh session every 20 minutes to keep it alive well within the 30-day window.
    // The backend's updateAge is 24 hours, so this ensures the session stays fresh.
    const intervalId = setInterval(() => {
      console.log("[AuthContext] Auto-refreshing user session (20-min interval)...");
      fetchUser();
    }, 20 * 60 * 1000); // 20 minutes

    return () => {
      subscription.remove();
      clearInterval(intervalId);
    };
  }, [initializeAuth, fetchUser]);

  useEffect(() => {
    if (user) {
      console.log('[AuthContext] User logged in, starting unread count polling');
      fetchUnreadCountInternal();
      fetchCommunityUnreadCountInternal();
      const unreadInterval = setInterval(() => {
        fetchUnreadCountInternal();
        fetchCommunityUnreadCountInternal();
      }, 30000);

      return () => {
        clearInterval(unreadInterval);
      };
    } else {
      setUnreadCount(0);
      setCommunityUnreadCount(0);
    }
  }, [user, fetchUnreadCountInternal, fetchCommunityUnreadCountInternal]);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] Signing in with email via /api/login');
      const response = await fetch(`${BACKEND_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      console.log('[AuthContext] Login response status:', response.status);

      // Parse response body
      let data: any;
      try {
        const text = await response.text();
        console.log('[AuthContext] Login response body:', text);
        data = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error('[AuthContext] Failed to parse response:', parseError);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        const errorMsg = data?.error || data?.message || 'Login failed';
        console.error('[AuthContext] Login failed:', errorMsg);
        throw new Error(errorMsg);
      }

      // Store bearer token if returned
      if (data?.session?.token) {
        console.log('[AuthContext] Storing bearer token (session.token) after email sign in');
        await setBearerToken(data.session.token);
      } else if (data?.token) {
        console.log('[AuthContext] Storing bearer token (token field) after email sign in');
        await setBearerToken(data.token);
      }

      // Set user from response or re-fetch
      if (data?.user) {
        console.log('[AuthContext] Setting user from login response:', data.user.id);
        setUser(data.user as User);
        await fetchProfileStandalone();
      } else {
        console.log('[AuthContext] No user in response, fetching from session');
        await fetchUser();
      }
    } catch (error: any) {
      console.error("[AuthContext] Email sign in failed:", error);
      throw error;
    }
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    try {
      console.log('[AuthContext] Signing up with email');
      const result = await authClient.signUp.email({
        email,
        password,
        name,
      });
      console.log('[AuthContext] Sign up result:', result);

      if (result.data?.session?.token) {
        console.log('[AuthContext] Storing bearer token after email sign up');
        await setBearerToken(result.data.session.token);
      }

      await fetchUser();
    } catch (error) {
      console.error("[AuthContext] Email sign up failed:", error);
      throw error;
    }
  };

  const signInWithSocial = async (provider: "google" | "apple" | "github") => {
    try {
      console.log(`[AuthContext] Signing in with ${provider}`);
      if (Platform.OS === "web") {
        const token = await openOAuthPopup(provider);
        await setBearerToken(token);
        await fetchUser();
      } else {
        const callbackURL = Linking.createURL("/");
        console.log(`[AuthContext] Using callback URL: ${callbackURL}`);
        await authClient.signIn.social({
          provider,
          callbackURL,
        });
        await fetchUser();
      }
    } catch (error) {
      console.error(`[AuthContext] ${provider} sign in failed:`, error);
      throw error;
    }
  };

  const signInWithGoogle = () => signInWithSocial("google");
  const signInWithApple = () => signInWithSocial("apple");
  const signInWithGitHub = () => signInWithSocial("github");

  const signOut = async () => {
    try {
      console.log('[AuthContext] Signing out');
      await authClient.signOut();
    } catch (error) {
      console.error("[AuthContext] Sign out failed (API):", error);
    } finally {
      setUser(null);
      setProfile(null);
      setUnreadCount(0);
      setCommunityUnreadCount(0);
      await clearAuthTokens();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        unreadCount,
        communityUnreadCount,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signInWithApple,
        signInWithGitHub,
        signOut,
        fetchUser,
        fetchProfile,
        refreshProfile,
        fetchUnreadCount,
        fetchCommunityUnreadCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
