
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { authenticatedGet, authenticatedPatch } from '@/utils/api';
import { useNotifications } from '@/contexts/NotificationContext';
import Modal from '@/components/ui/Modal';

export default function NotificationsScreen() {
  const { sendTag, deleteTag, requestPermission } = useNotifications();

  const [emailNotifications, setEmailNotifications] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [messageNotifications, setMessageNotifications] = useState(false);
  const [postUpdates, setPostUpdates] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    console.log('[Notifications] Fetching notification preferences');
    try {
      const data = await authenticatedGet<{
        notifyEmail: boolean;
        notifyPush: boolean;
        notifyMessages: boolean;
        notifyPosts: boolean;
      }>('/api/notification-preferences');
      console.log('[Notifications] Preferences loaded:', data);
      setEmailNotifications(!!data.notifyEmail);
      setPushNotifications(!!data.notifyPush);
      setMessageNotifications(!!data.notifyMessages);
      setPostUpdates(!!data.notifyPosts);
    } catch (err: any) {
      console.error('[Notifications] Error fetching preferences:', err);
      setError(err.message || 'Failed to load notification preferences.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmail = async () => {
    const newValue = !emailNotifications;
    console.log('[Notifications] Toggle email notifications:', newValue);
    setEmailNotifications(newValue);
    try {
      await authenticatedPatch('/api/notification-preferences', { notifyEmail: newValue });
      if (newValue) {
        sendTag('notify_email', 'true');
      } else {
        deleteTag('notify_email');
      }
    } catch (err: any) {
      console.error('[Notifications] Error saving email preference:', err);
      setEmailNotifications(!newValue);
      setError(err.message || 'Failed to update email notifications.');
    }
  };

  const handleTogglePush = async () => {
    const newValue = !pushNotifications;
    console.log('[Notifications] Toggle push notifications:', newValue);
    if (newValue) {
      const granted = await requestPermission();
      if (!granted) {
        console.log('[Notifications] Push permission not granted, aborting toggle');
        return;
      }
    }
    setPushNotifications(newValue);
    try {
      await authenticatedPatch('/api/notification-preferences', { notifyPush: newValue });
      if (newValue) {
        sendTag('notify_push', 'true');
      } else {
        deleteTag('notify_push');
      }
    } catch (err: any) {
      console.error('[Notifications] Error saving push preference:', err);
      setPushNotifications(!newValue);
      setError(err.message || 'Failed to update push notifications.');
    }
  };

  const handleToggleMessages = async () => {
    const newValue = !messageNotifications;
    console.log('[Notifications] Toggle message notifications:', newValue);
    setMessageNotifications(newValue);
    try {
      await authenticatedPatch('/api/notification-preferences', { notifyMessages: newValue });
      if (newValue) {
        sendTag('notify_messages', 'true');
      } else {
        deleteTag('notify_messages');
      }
    } catch (err: any) {
      console.error('[Notifications] Error saving message preference:', err);
      setMessageNotifications(!newValue);
      setError(err.message || 'Failed to update message notifications.');
    }
  };

  const handleTogglePosts = async () => {
    const newValue = !postUpdates;
    console.log('[Notifications] Toggle post updates:', newValue);
    setPostUpdates(newValue);
    try {
      await authenticatedPatch('/api/notification-preferences', { notifyPosts: newValue });
      if (newValue) {
        sendTag('notify_posts', 'true');
      } else {
        deleteTag('notify_posts');
      }
    } catch (err: any) {
      console.error('[Notifications] Error saving post updates preference:', err);
      setPostUpdates(!newValue);
      setError(err.message || 'Failed to update post updates.');
    }
  };

  const ToggleSwitch = ({ value, onToggle, disabled }: { value: boolean; onToggle: () => void; disabled?: boolean }) => (
    <TouchableOpacity
      style={[styles.switch, value && styles.switchActive, disabled && styles.switchDisabled]}
      onPress={onToggle}
      disabled={disabled}
    >
      <View style={[styles.switchThumb, value && styles.switchThumbActive]} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Communication</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Email Notifications</Text>
                <Text style={styles.settingDescription}>Receive updates via email</Text>
              </View>
              <ToggleSwitch value={emailNotifications} onToggle={handleToggleEmail} />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive push notifications on your device</Text>
              </View>
              <ToggleSwitch value={pushNotifications} onToggle={handleTogglePush} />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Activity</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>New Messages</Text>
                <Text style={styles.settingDescription}>Get notified when you receive a message</Text>
              </View>
              <ToggleSwitch value={messageNotifications} onToggle={handleToggleMessages} />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Post Updates</Text>
                <Text style={styles.settingDescription}>Get notified about your post activity</Text>
              </View>
              <ToggleSwitch value={postUpdates} onToggle={handleTogglePosts} />
            </View>
          </View>
        </ScrollView>
      )}

      <Modal
        visible={!!error}
        onClose={() => setError(null)}
        title="Notification Error"
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
    justifyContent: 'center',
    alignItems: 'center',
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
  switchDisabled: {
    opacity: 0.5,
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
});
