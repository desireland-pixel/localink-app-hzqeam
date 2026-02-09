
import { StyleSheet } from 'react-native';

// Localink color theme - warm, welcoming colors for community connection
export const colors = {
  // Primary brand colors
  primary: '#FF6B35', // Vibrant orange - energy and connection
  primaryDark: '#E85A2A',
  primaryLight: '#FF8A5C',
  
  // Secondary colors
  secondary: '#4ECDC4', // Teal - trust and reliability
  secondaryDark: '#3DB5AD',
  secondaryLight: '#6FD9D1',
  
  // Accent colors
  accent: '#FFE66D', // Warm yellow - friendliness
  accentDark: '#F5D84F',
  
  // Neutral colors
  background: '#FFFFFF',
  backgroundDark: '#1A1A1A',
  card: '#F8F9FA',
  cardDark: '#2A2A2A',
  
  // Text colors
  text: '#2D3436',
  textSecondary: '#636E72',
  textLight: '#B2BEC3',
  textDark: '#FFFFFF',
  textSecondaryDark: '#DFE6E9',
  
  // Status colors
  success: '#00B894',
  error: '#D63031',
  warning: '#FDCB6E',
  info: '#74B9FF',
  
  // Border and divider
  border: '#DFE6E9',
  borderDark: '#4A4A4A',
  divider: '#ECEFF1',
  
  // Highlight
  highlight: '#FFF3E0',
  highlightDark: '#3A3A3A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDark: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    ...typography.button,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.body,
    color: colors.text,
  },
  inputDark: {
    backgroundColor: colors.cardDark,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDark,
    ...typography.body,
    color: colors.textDark,
  },
});
