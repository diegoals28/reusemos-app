// ============================================
// REUSA - Badge Component
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';

type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  outlined?: boolean;
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  primary: {
    bg: COLORS.secondaryLight,
    text: COLORS.primary,
    border: COLORS.primary,
  },
  secondary: {
    bg: '#FFF3E0',
    text: COLORS.secondary,
    border: COLORS.secondary,
  },
  success: {
    bg: '#E8F5E9',
    text: COLORS.success,
    border: COLORS.success,
  },
  warning: {
    bg: '#FFF8E1',
    text: '#F57C00',
    border: '#F57C00',
  },
  error: {
    bg: '#FFEBEE',
    text: COLORS.error,
    border: COLORS.error,
  },
  info: {
    bg: '#E3F2FD',
    text: '#1976D2',
    border: '#1976D2',
  },
};

const SIZE_STYLES: Record<BadgeSize, { paddingH: number; paddingV: number; fontSize: number; iconSize: number }> = {
  sm: {
    paddingH: SPACING.sm,
    paddingV: 2,
    fontSize: FONT_SIZES.xs,
    iconSize: 12,
  },
  md: {
    paddingH: SPACING.md,
    paddingV: SPACING.xs,
    fontSize: FONT_SIZES.sm,
    iconSize: 14,
  },
  lg: {
    paddingH: SPACING.md,
    paddingV: SPACING.sm,
    fontSize: FONT_SIZES.base,
    iconSize: 16,
  },
};

export function Badge({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  outlined = false,
}: BadgeProps) {
  const colors = VARIANT_COLORS[variant];
  const sizeStyle = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: outlined ? 'transparent' : colors.bg,
          borderColor: colors.border,
          borderWidth: outlined ? 1 : 0,
          paddingHorizontal: sizeStyle.paddingH,
          paddingVertical: sizeStyle.paddingV,
        },
      ]}
    >
      {icon && (
        <Ionicons
          name={icon as any}
          size={sizeStyle.iconSize}
          color={colors.text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.label,
          { color: colors.text, fontSize: sizeStyle.fontSize },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontWeight: '500',
  },
});
