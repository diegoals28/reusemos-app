// ============================================
// Reusemos - Purchase Success Screen
// ============================================

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { Button } from '@/components/common/Button';

export default function PurchaseSuccessScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { transactionId, productTitle, paymentPending } = route.params;

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    // Animate success icon
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleViewTransaction = () => {
    navigation.replace('TransactionDetail', { transactionId });
  };

  const handleChatWithSeller = () => {
    navigation.replace('MainTabs', { screen: 'Chats' });
  };

  const handleContinueShopping = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Acabo de comprar "${productTitle}" en Reusemos! Comprando de segunda mano ayudamos al planeta.`,
      });
    } catch (error) {
      // Ignore share errors
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Success Animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Ionicons
            name={paymentPending ? 'time' : 'checkmark-circle'}
            size={80}
            color={paymentPending ? COLORS.warning : COLORS.success}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.textContainer,
            {
              opacity: opacityAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.title}>
            {paymentPending ? '¡Compra reservada!' : '¡Compra exitosa!'}
          </Text>

          <Text style={styles.subtitle}>
            {paymentPending
              ? 'Coordina el pago con el vendedor a través del chat.'
              : 'Tu compra ha sido procesada correctamente.'}
          </Text>

          <Text style={styles.productName}>{productTitle}</Text>

          {/* Environmental Impact */}
          <View style={styles.impactCard}>
            <View style={styles.impactHeader}>
              <Ionicons name="leaf" size={24} color={COLORS.success} />
              <Text style={styles.impactTitle}>Tu impacto ambiental</Text>
            </View>
            <Text style={styles.impactDescription}>
              Al comprar de segunda mano estás ayudando a reducir el consumo de recursos naturales y la generación de residuos.
            </Text>
            <View style={styles.impactStats}>
              <View style={styles.impactStat}>
                <Text style={styles.impactValue}>~5kg</Text>
                <Text style={styles.impactLabel}>CO₂ ahorrado</Text>
              </View>
              <View style={styles.impactDivider} />
              <View style={styles.impactStat}>
                <Text style={styles.impactValue}>~2000L</Text>
                <Text style={styles.impactLabel}>Agua ahorrada</Text>
              </View>
            </View>
          </View>

          {/* Next Steps */}
          <View style={styles.stepsCard}>
            <Text style={styles.stepsTitle}>Próximos pasos</Text>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {paymentPending ? 'Coordinar pago' : 'Coordinar entrega'}
                </Text>
                <Text style={styles.stepDescription}>
                  {paymentPending
                    ? 'Habla con el vendedor para acordar el método de pago.'
                    : 'Acuerda con el vendedor el lugar y hora de entrega.'}
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Recibir producto</Text>
                <Text style={styles.stepDescription}>
                  Verifica el producto al recibirlo.
                </Text>
              </View>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Calificar</Text>
                <Text style={styles.stepDescription}>
                  Deja una reseña para ayudar a otros compradores.
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Actions */}
      <View style={styles.footer}>
        <Button
          title="Ver detalles de la compra"
          onPress={handleViewTransaction}
          style={styles.primaryButton}
        />

        <Button
          title="Chatear con vendedor"
          variant="secondary"
          onPress={handleChatWithSeller}
          style={styles.secondaryButton}
        />

        <Button
          title="Seguir comprando"
          variant="ghost"
          onPress={handleContinueShopping}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingTop: SPACING.xxl,
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  textContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: FONT_SIZES.xxl,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  productName: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  impactCard: {
    width: '100%',
    backgroundColor: COLORS.success + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  impactTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.success,
  },
  impactDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  impactStat: {
    flex: 1,
    alignItems: 'center',
  },
  impactValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.success,
  },
  impactLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  impactDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.success + '30',
  },
  stepsCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
  },
  stepsTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  step: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepNumberText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.white,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stepDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  primaryButton: {
    marginBottom: 0,
  },
  secondaryButton: {
    marginBottom: 0,
  },
});
