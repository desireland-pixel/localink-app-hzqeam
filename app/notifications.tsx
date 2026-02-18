
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { authenticatedPost, authenticatedDelete } from '@/utils/api';
import Modal from '@/components/ui/Modal';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function NotificationsScreen() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [postUpdates, setPostUpdates] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkPushNotificationStatus();
  }, []);

  const checkPushNotificationStatus = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus === 'granted') {
        setPushNotifications(true);
      }
    } catch (error) {
      console.error('[Notifications] Error checking push notification status:', error);
    }
  };

  const registerForPushNotifications = async () => {
    try {
      console.log('[Notifications] Registering for push notifications');
      
      if (!Device.isDevice) {
        setError('Push notifications are not available on simulators/emulators');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        setError('Permission to receive push notifications was denied');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id', // This will be auto-configured by Expo
      });
      const token = tokenData.data;
      console.log('[Notifications] Push token obtained:', token);

      // Register token with backend
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      await authenticatedPost('/api/push-tokens', { token, platform });
      console.log('[Notifications] Push token registered with backend');

      setPushToken(token);
      setSuccess('Push notifications enabled successfully');
      return token;
    } catch (error: any) {
      console.error('[Notifications] Error registering for push notifications:', error);
      setError(error.message || 'Failed to enable push notifications');
      return null;
    }
  };

  const unregisterPushNotifications = async () => {
    try {
      console.log('[Notifications] Unregistering push notifications');
      
      if (pushToken) {
        await authenticatedDelete(`/api/push-tokens/${pushToken}`, {});
        console.log('[Notifications] Push token removed from backend');
      }

      setPushToken(null);
      setSuccess('Push notifications disabled');
    } catch (error: any) {
      console.error('[Notifications] Error unregistering push notifications:', error);
      setError(error.message || 'Failed to disable push notifications');
    }
  };

  const handleTogglePushNotifications = async () => {
    if (pushNotifications) {
      // Disable push notifications
      await unregisterPushNotifications();
      setPushNotifications(false);
    } else {
      // Enable push notifications
      const token = await registerForPushNotifications();
      if (token) {
        setPushNotifications(true);
      }
    }
  };

  const ToggleSwitch = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
    <TouchableOpacity
      style={[styles.switch, value && styles.switchActive]}
      onPress={onToggle}
    >
      <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Communication</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Text style={styles.settingDescription}>Receive updates via email</Text>
            </View>
            <ToggleSwitch value={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Text style={styles.settingDescription}>Receive push notifications on your device</Text>
            </View>
            <ToggleSwitch value={pushNotifications} onToggle={handleTogglePushNotifications} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>New Messages</Text>
              <Text style={styles.settingDescription}>Get notified when you receive a message</Text>
            </View>
            <ToggleSwitch value={messageNotifications} onToggle={() => setMessageNotifications(!messageNotifications)} />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Post Updates</Text>
              <Text style={styles.settingDescription}>Get notified about your post activity</Text>
            </View>
            <ToggleSwitch value={postUpdates} onToggle={() => setPostUpdates(!postUpdates)} />
          </View>
        </View>

        <Text style={styles.note}>
          Push notifications will alert you about new messages and community replies. Make sure to allow notifications when prompted.
        </Text>
      </ScrollView>

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
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  settingDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  switch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: colors.primary,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  note: {
    ...typography.bodySmall,
    color: colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});
