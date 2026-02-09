
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import Modal from '@/components/ui/Modal';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, profileLoading, signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  console.log('[ProfileScreen] Current user:', user?.id, 'Profile:', profile?.name);

  const handleMyPosts = () => {
    console.log('[ProfileScreen] Navigate to my posts');
    router.push('/my-posts');
  };

  const handleSettings = () => {
    console.log('[ProfileScreen] Navigate to settings');
    router.push('/settings');
  };

  const handleSignOutPress = () => {
    console.log('[ProfileScreen] Show logout confirmation');
    setShowLogoutModal(true);
  };

  const handleConfirmSignOut = async () => {
    console.log('[ProfileScreen] Confirming sign out');
    setLoggingOut(true);
    try {
      await signOut();
      console.log('[ProfileScreen] Sign out successful, navigating to auth');
      router.replace('/auth');
    } catch (error) {
      console.error('[ProfileScreen] Error signing out:', error);
    } finally {
      setLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const userNameDisplay = profile?.name || user?.name || 'User';
  const userCityDisplay = profile?.city || 'Not set';
  const userEmailDisplay = user?.email || 'Not set';
  const avatarLetter = userNameDisplay.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{avatarLetter}</Text>
          </View>
          <Text style={styles.name}>{userNameDisplay}</Text>
          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="location.fill" 
              android_material_icon_name="location-on" 
              size={16} 
              color={colors.textSecondary} 
            />
            <Text style={styles.infoText}>{userCityDisplay}</Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="envelope.fill" 
              android_material_icon_name="email" 
              size={16} 
              color={colors.textSecondary} 
            />
            <Text style={styles.infoText}>{userEmailDisplay}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={handleMyPosts}>
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="doc.text.fill" 
                android_material_icon_name="description" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.menuItemText}>My Posts</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={24} 
              color={colors.textLight} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleSettings}>
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="gearshape.fill" 
                android_material_icon_name="settings" 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.menuItemText}>Settings</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={24} 
              color={colors.textLight} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={handleSignOutPress}
            disabled={loggingOut}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="arrow.right.square.fill" 
                android_material_icon_name="logout" 
                size={24} 
                color={colors.error} 
              />
              <Text style={[styles.menuItemText, { color: colors.error }]}>
                {loggingOut ? 'Signing out...' : 'Sign Out'}
              </Text>
            </View>
            {loggingOut && <ActivityIndicator size="small" color={colors.error} />}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        type="confirm"
        confirmText="Sign Out"
        cancelText="Cancel"
        onConfirm={handleConfirmSignOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    ...typography.h1,
    color: '#FFFFFF',
  },
  name: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  menuSection: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
});
