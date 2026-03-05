
import React from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { unreadCount, communityUnreadCount } = useAuth();
  const insets = useSafeAreaInsets();
  console.log('TabLayout: Rendering tabs', { unreadCount, communityUnreadCount, insets });

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom,
          paddingTop: Platform.OS === 'android' ? 10 : 5,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        swipeEnabled: true,
        animationEnabled: true,
      }}
    >
      <Tabs.Screen
        name="sublet"
        options={{
          title: 'Sublet',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              ios_icon_name="house.fill"
              android_material_icon_name="home"
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="travel"
        options={{
          title: 'Travel',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              ios_icon_name="airplane"
              android_material_icon_name="flight"
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="carry"
        options={{
          title: 'Community',
          tabBarBadge: communityUnreadCount > 0 ? communityUnreadCount : undefined,
          tabBarBadgeStyle: {
            fontSize: 10,
            fontWeight: '700',
            minWidth: 16,
            height: 16,
            lineHeight: Platform.OS === 'android' ? 16 : undefined,
            borderRadius: 8,
            paddingHorizontal: 3,
            top: -2,
          },
          tabBarIcon: ({ color }) => (
            <IconSymbol
              ios_icon_name="person.3.fill"
              android_material_icon_name="group"
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          title: 'Inbox',
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarBadgeStyle: {
            fontSize: 10,
            fontWeight: '700',
            minWidth: 16,
            height: 16,
            lineHeight: Platform.OS === 'android' ? 16 : undefined,
            borderRadius: 8,
            paddingHorizontal: 3,
            top: -2,
          },
          tabBarIcon: ({ color }) => (
            <IconSymbol
              ios_icon_name="message.fill"
              android_material_icon_name="chat"
              size={26}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={26}
              color={color}
            />
          ),
        }}
      />
      {/* Hide the (home) folder from tabs */}
      <Tabs.Screen
        name="(home)"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
