// ============================================
// REUSA - Avatar Component
// ============================================

import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES } from '@/constants';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: AvatarSize;
  showOnlineStatus?: boolean;
  isOnline?: boolean;
  showVerifiedBadge?: boolean;
  onPress?: () => void;
}

const SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
  '2xl': 120,
};

const ICON_SIZES: Record<AvatarSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
  '2xl': 56,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
  '2xl': 40,
};

export function Avatar({
  source,
  name,
  size = 'md',
  showOnlineStatus = false,
  isOnline = false,
  showVerifiedBadge = false,
  onPress,
}: AvatarProps) {
  const dimension = SIZES[size];
  const iconSize = ICON_SIZES[size];
  const fontSize = FONT_SIZE_MAP[size];

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const containerStyle = [
    styles.container,
    {
      width: dimension,
      height: dimension,
      borderRadius: dimension / 2,
    },
  ];

  const content = source ? (
    <Image
      source={{ uri: source }}
      style={[styles.image, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
    />
  ) : name ? (
    <View style={[styles.placeholder, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}>
      <Text style={[styles.initials, { fontSize }]}>{getInitials(name)}</Text>
    </View>
  ) : (
    <View style={[styles.placeholder, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}>
      <Ionicons name="person" size={iconSize} color={COLORS.textTertiary} />
    </View>
  );

  const statusSize = Math.max(dimension * 0.25, 10);
  const badgeSize = Math.max(dimension * 0.3, 16);

  const wrapper = (
    <View style={containerStyle}>
      {content}

      {showOnlineStatus && (
        <View
          style={[
            styles.onlineStatus,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              borderWidth: statusSize * 0.15,
              backgroundColor: isOnline ? COLORS.success : COLORS.textTertiary,
            },
          ]}
        />
      )}

      {showVerifiedBadge && (
        <View
          style={[
            styles.verifiedBadge,
            {
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
            },
          ]}
        >
          <Ionicons name="checkmark" size={badgeSize * 0.6} color={COLORS.white} />
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {wrapper}
      </TouchableOpacity>
    );
  }

  return wrapper;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    backgroundColor: COLORS.background,
  },
  placeholder: {
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  onlineStatus: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderColor: COLORS.white,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
});
