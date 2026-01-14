// ============================================
// REUSA - Payment Result Screen (Deep Link Handler)
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, ROUTES } from '@/constants';
import { RootStackParamList } from '@/navigation';
import { paymentsApi, transactionsApi } from '@/services/api';

type PaymentResultRouteProp = RouteProp<RootStackParamList, typeof ROUTES.PAYMENT_RESULT>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function PaymentResultScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<PaymentResultRouteProp>();
  const { transactionId, status, payment_id } = route.params;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handlePaymentResult();
  }, []);

  const handlePaymentResult = async () => {
    try {
      setIsLoading(true);

      // Verify payment status with backend
      const paymentStatus = await paymentsApi.checkStatus(transactionId);
      const transaction = await transactionsApi.getById(transactionId);

      // Small delay for better UX
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (status === 'success' || paymentStatus.data?.status === 'approved') {
        // Payment successful - navigate to success screen
        navigation.reset({
          index: 0,
          routes: [
            { name: 'MainTabs' },
            {
              name: ROUTES.PURCHASE_SUCCESS,
              params: {
                transactionId,
                productTitle: transaction.data?.product?.title || 'Producto',
                paymentPending: false,
              },
            },
          ],
        });
      } else if (status === 'pending') {
        // Payment pending
        navigation.reset({
          index: 0,
          routes: [
            { name: 'MainTabs' },
            {
              name: ROUTES.PURCHASE_SUCCESS,
              params: {
                transactionId,
                productTitle: transaction.data?.product?.title || 'Producto',
                paymentPending: true,
              },
            },
          ],
        });
      } else {
        // Payment failed - show error and allow retry
        setError('El pago no pudo ser procesado. Por favor, intenta nuevamente.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error handling payment result:', err);
      setError('Ocurrió un error al verificar el pago.');
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    navigation.reset({
      index: 0,
      routes: [
        { name: 'MainTabs' },
        {
          name: ROUTES.TRANSACTION_DETAIL,
          params: { transactionId },
        },
      ],
    });
  };

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Verificando pago...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorIcon}>
          <Ionicons name="close-circle" size={80} color={COLORS.error} />
        </View>
        <Text style={styles.errorTitle}>Pago no completado</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <View style={styles.buttonContainer}>
          <Text style={styles.retryButton} onPress={handleRetry}>
            Reintentar pago
          </Text>
          <Text style={styles.homeButton} onPress={handleGoHome}>
            Volver al inicio
          </Text>
        </View>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: FONT_SIZES.lg,
    color: COLORS.textSecondary,
  },
  errorIcon: {
    marginBottom: SPACING.xl,
  },
  errorTitle: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  errorMessage: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    color: COLORS.white,
    textAlign: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 8,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    overflow: 'hidden',
  },
  homeButton: {
    color: COLORS.primary,
    textAlign: 'center',
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
  },
});
