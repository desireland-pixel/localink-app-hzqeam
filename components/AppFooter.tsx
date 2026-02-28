
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/styles/commonStyles';

interface AppFooterProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Standardized footer component for consistent height across all screens.
 * Uses base vertical padding (spacing.md = 16px) + safe area bottom inset.
 * This matches the tab bar height for visual consistency.
 */
export function AppFooter({ children, style }: AppFooterProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.footer,
        {
          paddingBottom: Math.max(spacing.md, insets.bottom),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
