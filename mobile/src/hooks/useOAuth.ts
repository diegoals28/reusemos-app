// ============================================
// REUSA - OAuth Hook
// ============================================

import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AppleAuthentication from 'expo-apple-authentication';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';

WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs - Native
const GOOGLE_CLIENT_ID_IOS = '927170595512-2g9j8lqtrqo40mfe7nar8c2huco3ulab.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_ANDROID = '927170595512-6c9tksdmenehdujundc16q4sd3v3edsv.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB = '927170595512-fpfm9s1ufejmrsrnt3mdc2g3ea80bfan.apps.googleusercontent.com';

export function useOAuth() {
  const { setUser, setTokens, setOnboardingComplete } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Google Auth Setup - Will work in development builds, not Expo Go
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    webClientId: GOOGLE_CLIENT_ID_WEB,
  });

  // Handle Google Response
  useEffect(() => {
    if (response?.type === 'success') {
      // Get the ID token from authentication
      const idToken = response.authentication?.idToken;
      console.log('Google auth success, idToken:', idToken ? 'received' : 'missing');
      handleGoogleSuccess(idToken);
    } else if (response?.type === 'error') {
      console.log('Google Auth Error:', response.error);
      Alert.alert('Error', response.error?.message || 'Error de autenticación');
    }
  }, [response]);

  const handleGoogleSuccess = async (idToken: string | undefined) => {
    if (!idToken) {
      Alert.alert('Error', 'No se pudo obtener el token de Google');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.loginWithGoogle(idToken);
      setUser(result.user);
      setTokens(result.token, result.refreshToken);
      setOnboardingComplete(!result.user.isNew);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    if (!request) {
      Alert.alert(
        'No disponible',
        'Google Sign-In no está configurado correctamente. Por favor usa email y contraseña.',
        [{ text: 'Entendido' }]
      );
      return;
    }

    try {
      await promptAsync();
    } catch (error: any) {
      console.log('Google Sign-In error:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión con Google');
    }
  };

  const signInWithApple = async () => {
    setLoading(true);
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(
          'No disponible',
          'Apple Sign-In no está disponible en este dispositivo.',
          [{ text: 'Entendido' }]
        );
        return;
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received');
      }

      const result = await authApi.loginWithApple(
        credential.identityToken,
        credential.fullName ? {
          givenName: credential.fullName.givenName || undefined,
          familyName: credential.fullName.familyName || undefined,
        } : undefined
      );

      setUser(result.user);
      setTokens(result.token, result.refreshToken);
      setOnboardingComplete(!result.user.isNew);
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled, do nothing
        return;
      }
      Alert.alert('Error', error.response?.data?.message || 'Error al iniciar sesión con Apple');
    } finally {
      setLoading(false);
    }
  };

  return {
    signInWithGoogle,
    signInWithApple,
    loading,
    googleReady: !!request,
  };
}
