// ============================================
// REUSA - Make Offer Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { productsApi, offersApi } from '@/services/api';
import { Button } from '@/components/common/Button';
import { formatPrice } from '@/utils/formatters';

const QUICK_PERCENTAGES = [0.7, 0.8, 0.9]; // 70%, 80%, 90% of original price

export default function MakeOfferScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { productId, conversationId, productPrice } = route.params;

  const [offerAmount, setOfferAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: product } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getProductById(productId),
    enabled: !!productId,
  });

  const createOfferMutation = useMutation({
    mutationFn: (data: any) => offersApi.createOffer(data),
    onSuccess: () => {
      Alert.alert(
        'Oferta enviada',
        'El vendedor recibirá tu oferta y podrá aceptarla, rechazarla o hacerte una contraoferta.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No pudimos enviar tu oferta');
    },
  });

  const price = productPrice || product?.price || 0;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleQuickOffer = (percentage: number) => {
    const amount = Math.round(price * percentage);
    setOfferAmount(amount.toString());
  };

  const handleSubmit = async () => {
    const amount = parseInt(offerAmount, 10);

    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    if (amount >= price) {
      Alert.alert(
        'Oferta muy alta',
        'Tu oferta es igual o mayor al precio. ¿Por qué no compras directamente?',
        [{ text: 'OK' }]
      );
      return;
    }

    if (amount < price * 0.5) {
      Alert.alert(
        'Oferta muy baja',
        '¿Estás seguro de enviar una oferta menor al 50% del precio? Es posible que sea rechazada.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Enviar igual', onPress: submitOffer },
        ]
      );
      return;
    }

    submitOffer();
  };

  const submitOffer = async () => {
    setIsSubmitting(true);
    try {
      await createOfferMutation.mutateAsync({
        productId,
        conversationId,
        type: 'price',
        amount: parseInt(offerAmount, 10),
        message: message.trim() || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const percentage = offerAmount ? Math.round((parseInt(offerAmount, 10) / price) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hacer oferta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Product Info */}
          {product && (
            <View style={styles.productCard}>
              <Image
                source={{ uri: product.images?.[0]?.url }}
                style={styles.productImage}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {product.title}
                </Text>
                <Text style={styles.productPrice}>{formatPrice(price)}</Text>
              </View>
            </View>
          )}

          {/* Offer Amount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu oferta</Text>

            <View style={styles.amountContainer}>
              <Text style={styles.currencySymbol}>$</Text>
              <TextInput
                style={styles.amountInput}
                value={offerAmount}
                onChangeText={(text) => setOfferAmount(text.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="numeric"
              />
            </View>

            {offerAmount && (
              <View style={styles.percentageRow}>
                <Text style={styles.percentageText}>
                  {percentage}% del precio original
                </Text>
                {percentage < 70 && (
                  <Text style={styles.lowOfferWarning}>
                    Oferta baja
                  </Text>
                )}
              </View>
            )}

            {/* Quick Offers */}
            <View style={styles.quickOffers}>
              <Text style={styles.quickOffersLabel}>Sugerencias:</Text>
              <View style={styles.quickOffersRow}>
                {QUICK_PERCENTAGES.map((pct) => (
                  <TouchableOpacity
                    key={pct}
                    style={styles.quickOfferButton}
                    onPress={() => handleQuickOffer(pct)}
                  >
                    <Text style={styles.quickOfferPercent}>{pct * 100}%</Text>
                    <Text style={styles.quickOfferAmount}>
                      {formatPrice(Math.round(price * pct))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Message */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Mensaje (opcional)</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Explica por qué ofreces este precio..."
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{message.length}/200</Text>
          </View>

          {/* Tips */}
          <View style={styles.tipsCard}>
            <View style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={18} color={COLORS.warning} />
              <Text style={styles.tipText}>
                Ofertas entre 70-90% del precio tienen mayor probabilidad de ser aceptadas
              </Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="time-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.tipText}>
                El vendedor tiene 48 horas para responder
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer */}
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerSummary}>
              <Text style={styles.footerLabel}>Tu oferta</Text>
              <Text style={styles.footerValue}>
                {offerAmount ? formatPrice(parseInt(offerAmount, 10)) : '-'}
              </Text>
            </View>
            <Button
              title="Enviar oferta"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={!offerAmount}
              style={styles.submitButton}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  productCard: {
    flexDirection: 'row',
    padding: SPACING.base,
    backgroundColor: COLORS.background,
    gap: SPACING.md,
  },
  productImage: {
    width: 64,
    height: 64,
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
  },
  productPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  section: {
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
  },
  currencySymbol: {
    fontSize: 40,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  amountInput: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 150,
    textAlign: 'center',
  },
  percentageRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  percentageText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  lowOfferWarning: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    fontWeight: '500',
  },
  quickOffers: {
    marginTop: SPACING.xl,
  },
  quickOffersLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  quickOffersRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  quickOfferButton: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  quickOfferPercent: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  quickOfferAmount: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  messageInput: {
    height: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  tipsCard: {
    margin: SPACING.base,
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  tipText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
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
  footerSummary: {
    flex: 1,
  },
  footerLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  footerValue: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.primary,
  },
  submitButton: {
    flex: 1,
  },
});
