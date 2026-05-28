/**
 * OneSignal Push Notification Context
 *
 * Provides push notification management for Expo + React Native apps.
 * Reads OneSignal App ID from app.json (expo.extra) automatically.
 *
 * Supports:
 * - Native iOS/Android via OneSignal SDK
 * - Permission management
 * - Notification event handling
 * - User ID linking for targeted notifications
 *
 * SETUP:
 * 1. Wrap your app with <NotificationProvider> inside <AuthProvider>
 * 2. Run: npx expo install onesignal-expo-plugin react-native-onesignal && npx expo prebuild
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { Platform } from "react-native";
import { OneSignal, NotificationWillDisplayEvent } from "react-native-onesignal";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Import auth hook for user targeting (validated at setup time)
import { useAuth } from "./AuthContext";

// Read App ID from app.json (expo.extra)
const extra = Constants.expoConfig?.extra || {};
const ONESIGNAL_APP_ID = extra.oneSignalAppId || "";

// AsyncStorage key for the one-time notification permission prompt flag.
// Includes "v1" so we can bump it in future if we ever need to re-prompt all users.
const NOTIFICATION_PROMPT_FLAG_KEY = "lokalinc_notification_prompt_shown_v1";

// Check if running on web
const isWeb = Platform.OS === "web";

interface NotificationContextType {
  /** Whether the user has granted notification permission */
  hasPermission: boolean;
  /** Whether permission has been requested but not yet granted */
  permissionDenied: boolean;
  /** Loading state during initialization */
  loading: boolean;
  /** Whether running on web (notifications not available) */
  isWeb: boolean;
  /** Request notification permission from the user */
  requestPermission: () => Promise<boolean>;
  /** Set a tag for user segmentation */
  sendTag: (key: string, value: string) => void;
  /** Remove a tag */
  deleteTag: (key: string) => void;
  /** Last received notification data */
  lastNotification: Record<string, unknown> | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // Get user from auth context for notification targeting
  // Safe: handles different auth context shapes (Better Auth, Supabase, etc.)
  const auth = useAuth() as Record<string, unknown> | null;
  const session = auth?.session as Record<string, unknown> | undefined;
  const user = (auth?.user ?? session?.user ?? null) as { id?: string } | null;

  const router = useRouter();

  const [hasPermission, setHasPermission] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastNotification, setLastNotification] = useState<Record<string, unknown> | null>(null);

  // Initialize OneSignal on mount
  useEffect(() => {
    if (isWeb) {
      setLoading(false);
      return;
    }

    if (!ONESIGNAL_APP_ID) {
      console.warn(
        "[OneSignal] App ID not provided. " +
        "Please add oneSignalAppId to app.json extra."
      );
      setLoading(false);
      return;
    }

    try {
      // Initialize OneSignal
      OneSignal.initialize(ONESIGNAL_APP_ID);

      if (__DEV__) {
        console.log("[OneSignal] Initialized with App ID:", ONESIGNAL_APP_ID.substring(0, 8) + "...");
      }

      // Check current permission status
      const permissionStatus = OneSignal.Notifications.hasPermission();
      setHasPermission(permissionStatus);

      // Listen for notification events
      const foregroundHandler = (event: NotificationWillDisplayEvent) => {
        // Display the notification
        event.getNotification().display();

        const notification = event.getNotification();
        setLastNotification({
          title: notification.title,
          body: notification.body,
          additionalData: notification.additionalData,
        });
      };
      OneSignal.Notifications.addEventListener("foregroundWillDisplay", foregroundHandler);

      // Listen for permission changes
      const permissionHandler = (granted: boolean) => {
        setHasPermission(granted);
        setPermissionDenied(!granted);
      };
      OneSignal.Notifications.addEventListener("permissionChange", permissionHandler);

      // Handle notification taps — navigate to the relevant screen
      const clickHandler = (event: any) => {
        const data = event?.notification?.additionalData as Record<string, string> | undefined;
        console.log("[OneSignal] Notification tapped", data);
        if (!data) return;

        const { type, post_id, post_type, conversationId, topicId } = data;

        if (type === "post_match" && post_id && post_type) {
          console.log("[OneSignal] Navigating to post match", { post_type, post_id });
          if (post_type === "sublet") {
            router.push(`/sublet/${post_id}` as any);
          } else if (post_type === "travel") {
            router.push(`/travel/${post_id}` as any);
          }
        } else if (type === "chat_message" && conversationId) {
          console.log("[OneSignal] Navigating to chat", { conversationId });
          router.push(`/chat/${conversationId}` as any);
        } else if (type === "community_reply" && topicId) {
          console.log("[OneSignal] Navigating to community topic (reply)", { topicId });
          router.push(`/community/${topicId}` as any);
        } else if (type === "reply_liked" && topicId) {
          console.log("[OneSignal] Navigating to community topic (liked)", { topicId });
          router.push(`/community/${topicId}` as any);
        }
      };
      OneSignal.Notifications.addEventListener("click", clickHandler);

      return () => {
        OneSignal.Notifications.removeEventListener("foregroundWillDisplay", foregroundHandler);
        OneSignal.Notifications.removeEventListener("permissionChange", permissionHandler);
        OneSignal.Notifications.removeEventListener("click", clickHandler);
      };
    } catch (error) {
      console.error("[OneSignal] Failed to initialize:", error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  // Sync OneSignal external user ID with authenticated user
  useEffect(() => {
    if (isWeb || !ONESIGNAL_APP_ID) return;

    try {
      if (user?.id) {
        OneSignal.login(user.id);
        if (__DEV__) {
          console.log("[OneSignal] Linked user ID:", user.id);
        }
      } else {
        OneSignal.logout();
      }
    } catch (error) {
      console.error("[OneSignal] Failed to update user:", error);
    }
  }, [user?.id]);

  // Helper: shared navigation logic for both foreground taps and cold-start launch notifications.
  const navigateFromNotificationData = useCallback((data: Record<string, string>) => {
    const { type, post_id, post_type, conversationId, topicId } = data;

    if (type === "post_match" && post_id && post_type) {
      console.log("[OneSignal] Navigating to post match", { post_type, post_id });
      if (post_type === "sublet") {
        router.push(`/sublet/${post_id}` as any);
      } else if (post_type === "travel") {
        router.push(`/travel/${post_id}` as any);
      }
    } else if (type === "chat_message" && conversationId) {
      console.log("[OneSignal] Navigating to chat", { conversationId });
      router.push(`/chat/${conversationId}` as any);
    } else if (type === "community_reply" && topicId) {
      console.log("[OneSignal] Navigating to community topic (reply)", { topicId });
      router.push(`/community/${topicId}` as any);
    } else if (type === "reply_liked" && topicId) {
      console.log("[OneSignal] Navigating to community topic (liked)", { topicId });
      router.push(`/community/${topicId}` as any);
    }
  }, [router]);

  // Change 1 — Auto-request OS notification permission once after login.
  // Fires whenever user.id changes (i.e. on login). The AsyncStorage flag ensures
  // the OS dialog is shown at most once per device, ever.
  useEffect(() => {
    if (isWeb) return;
    if (!ONESIGNAL_APP_ID) return;
    if (!user?.id) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    timeoutId = setTimeout(async () => {
      try {
        const alreadyAsked = await AsyncStorage.getItem(NOTIFICATION_PROMPT_FLAG_KEY);
        if (alreadyAsked === "true") {
          console.log("[OneSignal] Notification prompt already shown on this device — skipping.");
          return;
        }

        const currentlyHasPermission = OneSignal.Notifications.hasPermission();
        if (currentlyHasPermission === true) {
          // User already granted permission (e.g. from a previous install) — just mark the flag.
          await AsyncStorage.setItem(NOTIFICATION_PROMPT_FLAG_KEY, "true");
          console.log("[OneSignal] Permission already granted — flag set, no prompt needed.");
          return;
        }

        // Show the OS native permission dialog.
        console.log("[OneSignal] Requesting notification permission for user:", user?.id);
        await OneSignal.Notifications.requestPermission(true);
        // Mark as asked regardless of the user's choice — the OS only allows asking once per install.
        await AsyncStorage.setItem(NOTIFICATION_PROMPT_FLAG_KEY, "true");
        console.log("[OneSignal] Notification permission prompt shown and flag set.");
      } catch (error) {
        // Silent failure — must never break the login flow.
        console.warn("[OneSignal] Auto-permission request failed silently:", error);
      }
    }, 800);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [user?.id]);

  // Change 2 — Cold-start notification tap navigation fix.
  // When the app is launched by tapping a notification, the click handler fires before
  // expo-router is ready. This effect waits 1 s then reads the launch notification and
  // navigates to the correct screen.
  useEffect(() => {
    if (isWeb) return;
    if (!ONESIGNAL_APP_ID) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    timeoutId = setTimeout(async () => {
      try {
        const notificationsApi = OneSignal.Notifications as any;
        let launchNotification: any = null;

        if (typeof notificationsApi.getLastNotification === "function") {
          launchNotification = await notificationsApi.getLastNotification();
        } else if (typeof notificationsApi.getInitialNotification === "function") {
          launchNotification = await notificationsApi.getInitialNotification();
        } else if (typeof notificationsApi.getLaunchNotification === "function") {
          launchNotification = await notificationsApi.getLaunchNotification();
        }

        if (!launchNotification) return;

        // additionalData may live at the top level or nested under .notification
        const additionalData =
          launchNotification.additionalData ??
          launchNotification.notification?.additionalData;

        if (additionalData) {
          console.log("[OneSignal] Cold-start launch notification detected", additionalData);
          navigateFromNotificationData(additionalData as Record<string, string>);
        }
      } catch (error) {
        // Silent failure — if the SDK version doesn't support these methods, do nothing.
        console.warn("[OneSignal] Cold-start notification check failed silently:", error);
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [router, navigateFromNotificationData]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (isWeb) return false;

    try {
      const granted = await OneSignal.Notifications.requestPermission(true);
      setHasPermission(granted);
      setPermissionDenied(!granted);
      return granted;
    } catch (error) {
      console.error("[OneSignal] Permission request failed:", error);
      return false;
    }
  }, []);

  const sendTag = useCallback((key: string, value: string) => {
    if (isWeb) return;
    try {
      OneSignal.User.addTag(key, value);
    } catch (error) {
      console.error("[OneSignal] Failed to send tag:", error);
    }
  }, []);

  const deleteTag = useCallback((key: string) => {
    if (isWeb) return;
    try {
      OneSignal.User.removeTag(key);
    } catch (error) {
      console.error("[OneSignal] Failed to delete tag:", error);
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        hasPermission,
        permissionDenied,
        loading,
        isWeb,
        requestPermission,
        sendTag,
        deleteTag,
        lastNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification state and methods.
 *
 * @example
 * const { hasPermission, requestPermission } = useNotifications();
 *
 * if (!hasPermission) {
 *   return <Button onPress={requestPermission}>Enable Notifications</Button>;
 * }
 */
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
}
