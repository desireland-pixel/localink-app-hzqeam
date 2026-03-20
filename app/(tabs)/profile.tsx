
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import Modal from '@/components/ui/Modal';

export default function ProfileScreen() {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  console.log('[ProfileScreen] Rendering, user:', user?.id, 'profile:', profile?.name);

  const handleSignOut = async () => {
    console.log('[ProfileScreen] Signing out');
    setShowSignOutModal(false);
    try {
      await signOut();
      console.log('[ProfileScreen] Sign out successful, redirecting to auth');
      router.replace('/auth');
    } catch (error) {
      console.error('[ProfileScreen] Sign out error:', error);
    }
  };

  const userName = profile?.username || profile?.name || user?.name || 'User';
  const userCity = profile?.city || 'Not set';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            <TouchableOpacity 
              style={styles.editAvatarButton}
              onPress={() => {
                console.log('[ProfileScreen] Navigate to personal details for photo edit');
                router.push('/personal-details');
              }}
            >
              <IconSymbol 
                ios_icon_name="pencil.circle.fill" 
                android_material_icon_name="edit" 
                size={24} 
                color={colors.primary} 
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.profileName}>@{userName}</Text>
          <View style={styles.locationContainer}>
            <IconSymbol 
              ios_icon_name="location.fill" 
              android_material_icon_name="location-on" 
              size={16} 
              color={colors.textSecondary} 
            />
            <Text style={styles.profileCity}>{userCity}</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('[ProfileScreen] Navigate to personal details');
              router.push('/personal-details');
            }}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="person.fill" 
                android_material_icon_name="person" 
                size={22} 
                color={colors.text} 
              />
              <Text style={styles.menuItemText}>Personal details</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => router.push('/my-posts')}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="doc.text.fill" 
                android_material_icon_name="description" 
                size={22} 
                color={colors.text} 
              />
              <Text style={styles.menuItemText}>My Posts</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('[ProfileScreen] Navigate to favourites');
              router.push('/favourites');
            }}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="heart.fill" 
                android_material_icon_name="favorite" 
                size={22} 
                color={colors.text} 
              />
              <Text style={styles.menuItemText}>Favourites</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('[ProfileScreen] Navigate to notifications');
              router.push('/notifications');
            }}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="bell.fill" 
                android_material_icon_name="notifications" 
                size={22} 
                color={colors.text} 
              />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('[ProfileScreen] Navigate to FAQs');
              router.push('/faqs');
            }}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="questionmark.circle.fill" 
                android_material_icon_name="help" 
                size={22} 
                color={colors.text} 
              />
              <Text style={styles.menuItemText}>FAQs</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('[ProfileScreen] Navigate to data & privacy');
              router.push('/data-privacy');
            }}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="lock.fill" 
                android_material_icon_name="lock" 
                size={22} 
                color={colors.text} 
              />
              <Text style={styles.menuItemText}>Data & Privacy</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              console.log('[ProfileScreen] Navigate to about');
              router.push('/about');
            }}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="info.circle.fill" 
                android_material_icon_name="information" 
                size={22} 
                color={colors.text} 
              />
              <Text style={styles.menuItemText}>About</Text>
            </View>
            <IconSymbol 
              ios_icon_name="chevron.right" 
              android_material_icon_name="chevron-right" 
              size={20} 
              color={colors.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.menuItem, styles.signOutItem]}
            onPress={() => setShowSignOutModal(true)}
          >
            <View style={styles.menuItemLeft}>
              <IconSymbol 
                ios_icon_name="arrow.right.square.fill" 
                android_material_icon_name="logout" 
                size={22} 
                color={colors.error} 
              />
              <Text style={[styles.menuItemText, styles.signOutText]}>Sign Out</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        type="warning"
        confirmText="Sign out"
        cancelText="Cancel"
        onConfirm={handleSignOut}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 16 : 0,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    position: 'relative',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 2,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  profileCity: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  menuSection: {
    marginTop: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  signOutItem: {
    marginTop: spacing.lg,
  },
  signOutText: {
    color: colors.error,
  },
});
