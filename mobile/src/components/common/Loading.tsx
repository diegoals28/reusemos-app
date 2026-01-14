// ============================================
// REUSA - Loading Component
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '@/constants';

interface LoadingProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  overlay?: boolean;
}

export function Loading({
  message,
  size = 'large',
  fullScreen = false,
  overlay = false,
}: LoadingProps) {
  const content = (
    <>
      <ActivityIndicator size={size} color={COLORS.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </>
  );

  if (overlay) {
    return (
      <View style={styles.overlay}>
        <View style={styles.overlayContent}>{content}</View>
      </View>
    );
  }

  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  overlayContent: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.xl,
    alignItems: 'center',
    minWidth: 150,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});
