
import React from 'react';
import { Platform } from 'react-native';
import FloatingTabBar from '@/components/FloatingTabBar';
import { colors } from '@/styles/commonStyles';

export default function TabLayout() {
  console.log('TabLayout: Rendering tabs');

  const tabs = [
    {
      name: 'Sublet',
      route: '/(tabs)/sublet',
      ios_icon_name: 'house.fill',
      android_material_icon_name: 'home',
    },
    {
      name: 'Travel',
      route: '/(tabs)/travel',
      ios_icon_name: 'airplane',
      android_material_icon_name: 'flight',
    },
    {
      name: 'Carry',
      route: '/(tabs)/carry',
      ios_icon_name: 'shippingbox.fill',
      android_material_icon_name: 'local-shipping',
    },
    {
      name: 'Inbox',
      route: '/(tabs)/inbox',
      ios_icon_name: 'message.fill',
      android_material_icon_name: 'chat',
    },
    {
      name: 'Profile',
      route: '/(tabs)/profile',
      ios_icon_name: 'person.fill',
      android_material_icon_name: 'person',
    },
  ];

  return <FloatingTabBar tabs={tabs} />;
}
