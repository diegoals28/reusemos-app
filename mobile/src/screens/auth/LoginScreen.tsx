// ============================================
// Reusemos - Login Screen
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
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';
import { useOAuth } from '@/hooks/useOAuth';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { setUser, setTokens, setOnboardingComplete } = useAuthStore();

  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, signInWithApple, loading: oauthLoading } = useOAuth();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const response = await authApi.login({ email, password });
        setUser(response.user);
        setTokens(response.token, response.refreshToken);
        setOnboardingComplete(true); // Skip for existing users
      } else {
        navigation.navigate(ROUTES.REGISTER);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Algo salió mal');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    if (provider === 'google') { await signInWithGoogle(); } else { await signInWithApple(); } return;
    
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>R</Text>
            </View>
            <Text style={styles.brandName}>Reusemos</Text>
          </View>

          <Text style={styles.welcomeText}>Bienvenido a Reusemos</Text>

          {/* OAuth Buttons */}
          <View style={styles.oauthContainer}>
            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.oauthButton, styles.appleButton]}
                onPress={() => handleOAuthLogin('apple')}
              >
                <Ionicons name="logo-apple" size={20} color={COLORS.white} />
                <Text style={[styles.oauthText, styles.appleText]}>
                  Continuar con Apple
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.oauthButton, styles.googleButton]}
              onPress={() => handleOAuthLogin('google')}
            >
              <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
              <Text style={styles.oauthText}>Continuar con Google</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor={COLORS.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Contraseña</Text>
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

            {isLogin && (
              <TouchableOpacity style={styles.forgotButton} onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}>
                <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
              </TouchableOpacity>
            )}

            <Button
              title={isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
              onPress={handleEmailAuth}
              loading={loading}
              fullWidth
              size="lg"
            />
          </View>

          {/* Switch Login/Register */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </Text>
            <TouchableOpacity onPress={() => {
              if (isLogin) {
                navigation.navigate(ROUTES.REGISTER);
              } else {
                setIsLogin(true);
              }
            }}>
              <Text style={styles.switchLink}>
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Terms */}
          <Text style={styles.termsText}>
            Al continuar aceptas los{' '}
            <Text style={styles.termsLink}>Términos</Text> y{' '}
            <Text style={styles.termsLink}>Política de Privacidad</Text>
          </Text>
        </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.base,
    paddingTop: SPACING['2xl'],
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  logoText: {
    fontSize: 40,
    fontWeight: '700',
    color: COLORS.white,
  },
  brandName: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.primary,
  },
  welcomeText: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  oauthContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  googleButton: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  oauthText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  appleText: {
    color: COLORS.white,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: SPACING.base,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  form: {
    gap: SPACING.base,
  },
  inputContainer: {
    gap: SPACING.xs,
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
  forgotButton: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.xs,
  },
  switchText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  switchLink: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
  termsText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'center',
    marginTop: SPACING.xl,
    lineHeight: 18,
  },
  termsLink: {
    color: COLORS.primary,
  },
});
