// ============================================
// REUSA - Checkout Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { productsApi, transactionsApi } from '@/services/api';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';
import { formatPrice } from '@/utils/formatters';

type DeliveryMethod = 'pickup' | 'shipping';
type PaymentMethod = 'mercadopago' | 'cash' | 'transfer';

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuthStore();

  const { productId, offerId, amount } = route.params;

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('pickup');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mercadopago');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getProductById(productId),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data: any) => transactionsApi.createTransaction(data),
    onSuccess: (transaction) => {
      if (paymentMethod === 'mercadopago') {
        // Navigate to MercadoPago payment
        navigation.navigate(ROUTES.PAYMENT, {
          transactionId: transaction.id,
          paymentUrl: transaction.paymentUrl,
        });
      } else {
        // For cash/transfer, go to success
        navigation.replace(ROUTES.PURCHASE_SUCCESS, {
          transactionId: transaction.id,
        });
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No pudimos procesar tu compra');
    },
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handleConfirm = async () => {
    setIsProcessing(true);

    try {
      await createTransactionMutation.mutateAsync({
        productId,
        offerId,
        amount: amount || product?.price,
        deliveryMethod,
        paymentMethod,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const finalPrice = amount || product.price || 0;
  const shippingCost = deliveryMethod === 'shipping' ? 500 : 0; // Example shipping cost
  const serviceFee = Math.round(finalPrice * 0.05); // 5% service fee
  const total = finalPrice + shippingCost + serviceFee;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirmar compra</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Product Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Producto</Text>
          <View style={styles.productCard}>
            <Image
              source={{ uri: typeof product.images?.[0] === 'string' ? product.images[0] : product.images?.[0]?.url }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {product.title}
              </Text>
              <Text style={styles.productPrice}>{formatPrice(finalPrice)}</Text>
              {amount && amount !== product.price && product.price && (
                <Text style={styles.originalPrice}>
                  Precio original: {formatPrice(product.price)}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Seller Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vendedor</Text>
          <View style={styles.sellerCard}>
            {product.user?.avatarUrl ? (
              <Image
                source={{ uri: product.user.avatarUrl }}
                style={styles.sellerAvatar}
              />
            ) : (
              <View style={styles.sellerAvatarPlaceholder}>
                <Ionicons name="person" size={20} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{product.user?.displayName}</Text>
              {(product.user?.ratingAvg ?? 0) > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={COLORS.warning} />
                  <Text style={styles.ratingText}>
                    {(product.user?.ratingAvg ?? 0).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Delivery Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Entrega</Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              deliveryMethod === 'pickup' && styles.optionCardSelected,
            ]}
            onPress={() => setDeliveryMethod('pickup')}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="location-outline"
                size={24}
                color={deliveryMethod === 'pickup' ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Retiro en persona</Text>
              <Text style={styles.optionSubtitle}>
                Coordina con el vendedor un punto de encuentro
              </Text>
            </View>
            <Text style={styles.optionPrice}>Gratis</Text>
            {deliveryMethod === 'pickup' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              deliveryMethod === 'shipping' && styles.optionCardSelected,
            ]}
            onPress={() => setDeliveryMethod('shipping')}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="cube-outline"
                size={24}
                color={deliveryMethod === 'shipping' ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Envío a domicilio</Text>
              <Text style={styles.optionSubtitle}>
                Recibe el producto en tu dirección
              </Text>
            </View>
            <Text style={styles.optionPrice}>{formatPrice(shippingCost)}</Text>
            {deliveryMethod === 'shipping' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pago</Text>

          <TouchableOpacity
            style={[
              styles.optionCard,
              paymentMethod === 'mercadopago' && styles.optionCardSelected,
            ]}
            onPress={() => setPaymentMethod('mercadopago')}
          >
            <View style={[styles.optionIcon, { backgroundColor: '#00B1EA20' }]}>
              <Text style={styles.mpIcon}>MP</Text>
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Mercado Pago</Text>
              <Text style={styles.optionSubtitle}>
                Tarjeta, débito o saldo MP
              </Text>
            </View>
            {paymentMethod === 'mercadopago' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              paymentMethod === 'transfer' && styles.optionCardSelected,
            ]}
            onPress={() => setPaymentMethod('transfer')}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="swap-horizontal-outline"
                size={24}
                color={paymentMethod === 'transfer' ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Transferencia</Text>
              <Text style={styles.optionSubtitle}>
                Coordina el pago con el vendedor
              </Text>
            </View>
            {paymentMethod === 'transfer' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionCard,
              paymentMethod === 'cash' && styles.optionCardSelected,
            ]}
            onPress={() => setPaymentMethod('cash')}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="cash-outline"
                size={24}
                color={paymentMethod === 'cash' ? COLORS.primary : COLORS.textSecondary}
              />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Efectivo</Text>
              <Text style={styles.optionSubtitle}>
                Paga al retirar el producto
              </Text>
            </View>
            {paymentMethod === 'cash' && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Producto</Text>
              <Text style={styles.summaryValue}>{formatPrice(finalPrice)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Envío</Text>
              <Text style={styles.summaryValue}>
                {shippingCost > 0 ? formatPrice(shippingCost) : 'Gratis'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Comisión de servicio</Text>
              <Text style={styles.summaryValue}>{formatPrice(serviceFee)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(total)}</Text>
            </View>
          </View>
        </View>

        {/* Environmental Impact */}
        <View style={styles.impactBanner}>
          <Ionicons name="leaf" size={20} color={COLORS.primary} />
          <Text style={styles.impactText}>
            Con esta compra evitarás {product.impact?.co2?.toFixed(1) || 5} kg de CO₂
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.footerContent}>
          <View style={styles.footerTotal}>
            <Text style={styles.footerTotalLabel}>Total a pagar</Text>
            <Text style={styles.footerTotalValue}>{formatPrice(total)}</Text>
          </View>
          <Button
            title="Confirmar compra"
            onPress={handleConfirm}
            loading={isProcessing}
            style={styles.confirmButton}
          />
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
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
    paddingBottom: SPACING.xl,
  },
  section: {
    backgroundColor: COLORS.white,
    marginTop: SPACING.md,
    padding: SPACING.base,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  productCard: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  productPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  originalPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerInfo: {
    flex: 1,
  },
  sellerName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.sm,
    gap: SPACING.md,
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.secondaryLight,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mpIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B1EA',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  optionSubtitle: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  optionPrice: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  summaryCard: {
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  impactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.base,
    padding: SPACING.md,
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  impactText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  footerTotal: {
    flex: 1,
  },
  footerTotalLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  footerTotalValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  confirmButton: {
    flex: 1,
  },
});
