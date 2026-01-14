// ============================================
// REUSA - Reset Password Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { Button } from '@/components/common/Button';
import { authApi } from '@/services/api';

type ResetPasswordRouteParams = {
  ResetPassword: {
    token: string;
  };
};

export default function ResetPasswordScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ResetPasswordRouteParams, 'ResetPassword'>>();
  const token = route.params?.token || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validatePassword = () => {
    if (password.length < 8) {
      Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'El enlace ha expirado o es inválido'
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconContainerSuccess}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </View>
          <Text style={styles.title}>¡Contraseña actualizada!</Text>
          <Text style={styles.description}>
            Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
          </Text>
          <Button
            title="Iniciar sesión"
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
            fullWidth
            size="lg"
            style={styles.button}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="key" size={64} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Nueva contraseña</Text>
          <Text style={styles.description}>
            Crea una nueva contraseña segura para tu cuenta. Debe tener al menos 8 caracteres.
          </Text>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nueva contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Password Requirements */}
          <View style={styles.requirements}>
            <View style={styles.requirementRow}>
              <Ionicons
                name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={password.length >= 8 ? COLORS.success : COLORS.textTertiary}
              />
              <Text style={[
                styles.requirementText,
                password.length >= 8 && styles.requirementMet
              ]}>
                Al menos 8 caracteres
              </Text>
            </View>
            <View style={styles.requirementRow}>
              <Ionicons
                name={password && password === confirmPassword ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={password && password === confirmPassword ? COLORS.success : COLORS.textTertiary}
              />
              <Text style={[
                styles.requirementText,
                password && password === confirmPassword && styles.requirementMet
              ]}>
                Las contraseñas coinciden
              </Text>
            </View>
          </View>

          <Button
            title="Restablecer contraseña"
            onPress={handleSubmit}
            loading={loading}
            fullWidth
            size="lg"
            style={styles.button}
            disabled={password.length < 8 || password !== confirmPassword}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primaryLight + '20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainerSuccess: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    gap: SPACING.xs,
    marginBottom: SPACING.base,
  },
  label: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: SPACING.base,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  requirements: {
    marginBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  requirementText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  requirementMet: {
    color: COLORS.success,
  },
  button: {
    marginTop: SPACING.sm,
  },
});
