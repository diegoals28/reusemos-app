// ============================================
// REUSA - Payment Screen
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { paymentsApi } from '@/services/api';
import { Button } from '@/components/common/Button';
import { formatPrice } from '@/utils/formatters';

type PaymentStatus = 'pending' | 'processing' | 'success' | 'failure' | 'timeout';

const POLLING_INTERVAL = 3000; // 3 seconds
const PAYMENT_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export default function PaymentScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { transactionId, amount, productTitle, paymentMethod } = route.params;

  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(PAYMENT_TIMEOUT);

  const pollingStartTime = useRef<number | null>(null);
  const appState = useRef(AppState.currentState);

  const createPaymentMutation = useMutation({
    mutationFn: () => paymentsApi.createPayment(transactionId),
    onSuccess: (data) => {
      setPaymentUrl(data.initPoint);
      setPreferenceId(data.preferenceId);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No pudimos crear el pago');
      setStatus('failure');
    },
  });

  const checkPaymentMutation = useMutation({
    mutationFn: () => paymentsApi.checkPaymentStatus(transactionId),
    onSuccess: (data) => {
      if (data.status === 'approved') {
        setStatus('success');
        setTimeout(() => {
          navigation.replace('PurchaseSuccess', {
            transactionId,
            productTitle,
          });
        }, 1500);
      } else if (data.status === 'rejected' || data.status === 'cancelled') {
        setStatus('failure');
      }
    },
  });

  useEffect(() => {
    if (paymentMethod === 'mercadopago') {
      createPaymentMutation.mutate();
    }
  }, []);

  // Handle app state changes (user returning from MercadoPago)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        status === 'processing'
      ) {
        // User returned to the app, check payment status immediately
        checkPaymentMutation.mutate();
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [status]);

  // Check payment status periodically when processing with timeout
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let timeoutTimer: NodeJS.Timeout;
    let countdownTimer: NodeJS.Timeout;

    if (status === 'processing' && preferenceId) {
      // Start polling timer
      pollingStartTime.current = Date.now();

      interval = setInterval(() => {
        checkPaymentMutation.mutate();
      }, POLLING_INTERVAL);

      // Update countdown every second
      countdownTimer = setInterval(() => {
        if (pollingStartTime.current) {
          const elapsed = Date.now() - pollingStartTime.current;
          const remaining = Math.max(0, PAYMENT_TIMEOUT - elapsed);
          setTimeRemaining(remaining);
        }
      }, 1000);

      // Set timeout
      timeoutTimer = setTimeout(() => {
        setStatus('timeout');
      }, PAYMENT_TIMEOUT);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (countdownTimer) clearInterval(countdownTimer);
    };
  }, [status, preferenceId]);

  const formatTimeRemaining = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  const handleOpenPayment = async () => {
    if (!paymentUrl) return;

    setStatus('processing');

    const canOpen = await Linking.canOpenURL(paymentUrl);
    if (canOpen) {
      await Linking.openURL(paymentUrl);
    } else {
      Alert.alert('Error', 'No se pudo abrir el enlace de pago');
      setStatus('pending');
    }
  };

  const handleTransferPayment = () => {
    setStatus('processing');
    // For transfers, we mark as processing and the seller confirms receipt
    navigation.replace('TransferInstructions', {
      transactionId,
      amount,
      productTitle,
    });
  };

  const handleCashPayment = () => {
    // For cash, coordinate in chat
    navigation.replace('PurchaseSuccess', {
      transactionId,
      productTitle,
      paymentPending: true,
    });
  };

  const handleRetry = () => {
    setStatus('pending');
    createPaymentMutation.mutate();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar pago',
      '¿Estás seguro de que quieres cancelar esta compra?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const renderPaymentContent = () => {
    if (paymentMethod === 'transfer') {
      return (
        <View style={styles.methodContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="swap-horizontal" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.methodTitle}>Transferencia bancaria</Text>
          <Text style={styles.methodDescription}>
            Te mostraremos los datos bancarios del vendedor para que puedas realizar la transferencia.
          </Text>
          <Button
            title="Ver datos de transferencia"
            onPress={handleTransferPayment}
            style={styles.actionButton}
          />
        </View>
      );
    }

    if (paymentMethod === 'cash') {
      return (
        <View style={styles.methodContent}>
          <View style={styles.iconContainer}>
            <Ionicons name="cash" size={48} color={COLORS.success} />
          </View>
          <Text style={styles.methodTitle}>Pago en efectivo</Text>
          <Text style={styles.methodDescription}>
            Coordinarás el pago directamente con el vendedor al momento de la entrega.
          </Text>
          <Button
            title="Continuar"
            onPress={handleCashPayment}
            style={styles.actionButton}
          />
        </View>
      );
    }

    // MercadoPago
    if (status === 'pending') {
      return (
        <View style={styles.methodContent}>
          <View style={[styles.iconContainer, { backgroundColor: '#009ee3' + '20' }]}>
            <Text style={styles.mpLogo}>MP</Text>
          </View>
          <Text style={styles.methodTitle}>MercadoPago</Text>
          <Text style={styles.methodDescription}>
            Serás redirigido a MercadoPago para completar tu pago de forma segura.
          </Text>

          {createPaymentMutation.isPending ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Preparando pago...</Text>
            </View>
          ) : paymentUrl ? (
            <Button
              title="Pagar con MercadoPago"
              onPress={handleOpenPayment}
              style={StyleSheet.flatten([styles.actionButton, { backgroundColor: '#009ee3' }])}
            />
          ) : null}
        </View>
      );
    }

    if (status === 'processing') {
      return (
        <View style={styles.methodContent}>
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.processingTitle}>Procesando pago...</Text>
            <Text style={styles.processingDescription}>
              Estamos verificando tu pago. Por favor, no cierres esta pantalla.
            </Text>
            <Text style={styles.timeRemaining}>
              Tiempo restante: {formatTimeRemaining(timeRemaining)}
            </Text>
            <TouchableOpacity
              style={styles.checkAgainButton}
              onPress={() => checkPaymentMutation.mutate()}
            >
              <Text style={styles.checkAgainText}>Verificar estado</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (status === 'timeout') {
      return (
        <View style={styles.methodContent}>
          <View style={[styles.iconContainer, { backgroundColor: COLORS.warning + '20' }]}>
            <Ionicons name="time" size={64} color={COLORS.warning} />
          </View>
          <Text style={[styles.methodTitle, { color: COLORS.warning }]}>
            Tiempo agotado
          </Text>
          <Text style={styles.methodDescription}>
            No pudimos confirmar tu pago. Si ya realizaste el pago, puede tardar unos minutos en procesarse.
          </Text>
          <Button
            title="Verificar nuevamente"
            onPress={() => {
              setStatus('processing');
              setTimeRemaining(PAYMENT_TIMEOUT);
              pollingStartTime.current = Date.now();
              checkPaymentMutation.mutate();
            }}
            style={styles.actionButton}
          />
          <TouchableOpacity style={styles.cancelLink} onPress={() => navigation.navigate('TransactionDetail', { transactionId })}>
            <Text style={styles.cancelLinkText}>Ver estado de la transacción</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (status === 'success') {
      return (
        <View style={styles.methodContent}>
          <View style={[styles.iconContainer, { backgroundColor: COLORS.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          </View>
          <Text style={[styles.methodTitle, { color: COLORS.success }]}>
            ¡Pago exitoso!
          </Text>
          <Text style={styles.methodDescription}>
            Tu pago ha sido procesado correctamente.
          </Text>
        </View>
      );
    }

    if (status === 'failure') {
      return (
        <View style={styles.methodContent}>
          <View style={[styles.iconContainer, { backgroundColor: COLORS.error + '20' }]}>
            <Ionicons name="close-circle" size={64} color={COLORS.error} />
          </View>
          <Text style={[styles.methodTitle, { color: COLORS.error }]}>
            Pago no completado
          </Text>
          <Text style={styles.methodDescription}>
            Hubo un problema con tu pago. Puedes intentarlo nuevamente.
          </Text>
          <Button
            title="Reintentar"
            onPress={handleRetry}
            style={styles.actionButton}
          />
          <TouchableOpacity style={styles.cancelLink} onPress={handleCancel}>
            <Text style={styles.cancelLinkText}>Cancelar compra</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          disabled={status === 'processing'}
        >
          <Ionicons
            name="close"
            size={24}
            color={status === 'processing' ? COLORS.textTertiary : COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pago</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Order Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total a pagar</Text>
          <Text style={styles.summaryAmount}>{formatPrice(amount)}</Text>
          <Text style={styles.summaryProduct}>{productTitle}</Text>
        </View>

        {/* Payment Method Content */}
        {renderPaymentContent()}

        {/* Security Info */}
        <View style={styles.securityInfo}>
          <Ionicons name="shield-checkmark" size={20} color={COLORS.success} />
          <Text style={styles.securityText}>
            Todas las transacciones están protegidas y son seguras
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.base,
  },
  summaryCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  summaryLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  summaryProduct: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  methodContent: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  mpLogo: {
    fontSize: 32,
    fontWeight: '700',
    color: '#009ee3',
  },
  methodTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  methodDescription: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    minWidth: 250,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  processingTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  processingDescription: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
  },
  timeRemaining: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: SPACING.lg,
  },
  checkAgainButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  checkAgainText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '500',
  },
  cancelLink: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
  },
  cancelLinkText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  securityText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
});
