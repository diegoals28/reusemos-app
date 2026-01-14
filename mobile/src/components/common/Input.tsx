// ============================================
// REUSA - Input Component
// ============================================

import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  isPassword?: boolean;
  containerStyle?: object;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      isPassword = false,
      containerStyle,
      style,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const hasError = !!error;

    const getBorderColor = () => {
      if (hasError) return COLORS.error;
      if (isFocused) return COLORS.primary;
      return COLORS.border;
    };

    return (
      <View style={[styles.container, containerStyle]}>
        {label && <Text style={styles.label}>{label}</Text>}

        <View
          style={[
            styles.inputContainer,
            { borderColor: getBorderColor() },
            isFocused && styles.inputContainerFocused,
          ]}
        >
          {leftIcon && (
            <Ionicons
              name={leftIcon as any}
              size={20}
              color={hasError ? COLORS.error : COLORS.textTertiary}
              style={styles.leftIcon}
            />
          )}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              leftIcon && styles.inputWithLeftIcon,
              (rightIcon || isPassword) && styles.inputWithRightIcon,
              style,
            ]}
            placeholderTextColor={COLORS.textTertiary}
            secureTextEntry={isPassword && !showPassword}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            {...props}
          />

          {isPassword && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={22}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}

          {rightIcon && !isPassword && (
            <TouchableOpacity
              style={styles.rightIcon}
              onPress={onRightIconPress}
              disabled={!onRightIconPress}
            >
              <Ionicons
                name={rightIcon as any}
                size={22}
                color={hasError ? COLORS.error : COLORS.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {(error || hint) && (
          <Text style={[styles.helperText, hasError && styles.errorText]}>
            {error || hint}
          </Text>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  inputContainerFocused: {
    borderWidth: 2,
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: 0,
  },
  inputWithRightIcon: {
    paddingRight: 50,
  },
  leftIcon: {
    marginLeft: SPACING.base,
    marginRight: SPACING.sm,
  },
  rightIcon: {
    position: 'absolute',
    right: SPACING.base,
    padding: SPACING.xs,
  },
  helperText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  errorText: {
    color: COLORS.error,
  },
});
