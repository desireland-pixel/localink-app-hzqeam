import React, { useEffect, useRef, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "@/styles/commonStyles";

const STORAGE_OPEN_COUNT = "@lokalinc/rating_open_count";
const STORAGE_STATUS = "@lokalinc/rating_status";
const STORAGE_SNOOZE_AT = "@lokalinc/rating_snooze_at";

const BUNDLE_ID = "com.lokalinc.parth";
const IOS_STORE_URL = `itms-apps://itunes.apple.com/app/bundleId/${BUNDLE_ID}`;
const IOS_STORE_FALLBACK = `https://apps.apple.com/app/bundleId/${BUNDLE_ID}`;
const ANDROID_STORE_URL = `market://details?id=${BUNDLE_ID}`;
const ANDROID_STORE_FALLBACK = `https://play.google.com/store/apps/details?id=${BUNDLE_ID}`;

export default function RatingPrompt() {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const [rawCount, status, rawSnoozeAt] = await AsyncStorage.multiGet([
          STORAGE_OPEN_COUNT,
          STORAGE_STATUS,
          STORAGE_SNOOZE_AT,
        ]);

        const prevCount = parseInt(rawCount[1] ?? "0", 10) || 0;
        const newCount = prevCount + 1;
        const currentStatus = status[1];
        const snoozeAt = parseInt(rawSnoozeAt[1] ?? "0", 10) || 0;

        await AsyncStorage.setItem(STORAGE_OPEN_COUNT, String(newCount));

        console.log("[RatingPrompt] mount — openCount:", newCount, "status:", currentStatus);

        if (currentStatus === "done" || currentStatus === "opted_out") {
          return;
        }

        const shouldShow =
          (currentStatus === null && newCount >= 3) ||
          (currentStatus === "snoozed" && newCount >= snoozeAt + 5);

        if (!shouldShow) {
          return;
        }

        timeoutRef.current = setTimeout(() => {
          if (!cancelled) {
            console.log("[RatingPrompt] showing modal");
            setVisible(true);
          }
        }, 1500);
      } catch (e) {
        // Silent fallback — never crash the app
      }
    }

    init();

    return () => {
      cancelled = true;
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function handleRateNow() {
    console.log("[RatingPrompt] button pressed: Rate Now");
    try {
      await AsyncStorage.setItem(STORAGE_STATUS, "done");
      setVisible(false);

      if (Platform.OS === "ios") {
        try {
          const canOpen = await Linking.canOpenURL(IOS_STORE_URL);
          if (canOpen) {
            await Linking.openURL(IOS_STORE_URL);
          } else {
            await Linking.openURL(IOS_STORE_FALLBACK);
          }
        } catch {
          try {
            await Linking.openURL(IOS_STORE_FALLBACK);
          } catch {
            // Silent
          }
        }
      } else if (Platform.OS === "android") {
        try {
          const canOpen = await Linking.canOpenURL(ANDROID_STORE_URL);
          if (canOpen) {
            await Linking.openURL(ANDROID_STORE_URL);
          } else {
            await Linking.openURL(ANDROID_STORE_FALLBACK);
          }
        } catch {
          try {
            await Linking.openURL(ANDROID_STORE_FALLBACK);
          } catch {
            // Silent
          }
        }
      }
    } catch {
      // Silent
    }
  }

  async function handleMaybeLater() {
    console.log("[RatingPrompt] button pressed: Maybe Later");
    try {
      let currentCount = 0;
      try {
        const raw = await AsyncStorage.getItem(STORAGE_OPEN_COUNT);
        currentCount = parseInt(raw ?? "0", 10) || 0;
      } catch {
        // Use 0 as fallback
      }
      await AsyncStorage.setItem(STORAGE_STATUS, "snoozed");
      await AsyncStorage.setItem(STORAGE_SNOOZE_AT, String(currentCount));
      setVisible(false);
    } catch {
      // Silent
    }
  }

  async function handleNoThanks() {
    console.log("[RatingPrompt] button pressed: No Thanks");
    try {
      await AsyncStorage.setItem(STORAGE_STATUS, "opted_out");
      setVisible(false);
    } catch {
      // Silent
    }
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={() => {
        // No-op: user must pick an option
      }}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Enjoying LokaLinc?</Text>
          <Text style={styles.body}>
            Do you find the app useful? Please rate us on the App Store / Play Store.
          </Text>

          <View style={styles.spacerLg} />

          <TouchableOpacity style={styles.primaryButton} onPress={handleRateNow} activeOpacity={0.85}>
            <Text style={styles.primaryButtonText}>Rate Now</Text>
          </TouchableOpacity>

          <View style={styles.spacerMd} />

          <TouchableOpacity style={styles.secondaryButton} onPress={handleMaybeLater} activeOpacity={0.85}>
            <Text style={styles.secondaryButtonText}>Maybe Later</Text>
          </TouchableOpacity>

          <View style={styles.spacerSm} />

          <TouchableOpacity onPress={handleNoThanks} activeOpacity={0.6} style={styles.noThanksButton}>
            <Text style={styles.noThanksText}>No Thanks</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: colors.text,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 21,
  },
  spacerLg: {
    marginTop: 24,
  },
  spacerMd: {
    marginTop: 12,
  },
  spacerSm: {
    marginTop: 16,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    backgroundColor: "transparent",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  noThanksButton: {
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.8,
  },
  noThanksText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
