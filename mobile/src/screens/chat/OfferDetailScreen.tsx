// ============================================
// REUSA - Offer Detail Screen
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
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { offersApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { formatPrice, formatRelativeDate } from '@/utils/formatters';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendiente', color: COLORS.warning, icon: 'time' },
  accepted: { label: 'Aceptada', color: COLORS.success, icon: 'checkmark-circle' },
  rejected: { label: 'Rechazada', color: COLORS.error, icon: 'close-circle' },
  countered: { label: 'Contraoferta', color: COLORS.info, icon: 'swap-horizontal' },
  expired: { label: 'Expirada', color: COLORS.textTertiary, icon: 'hourglass' },
  cancelled: { label: 'Cancelada', color: COLORS.textTertiary, icon: 'ban' },
};

export default function OfferDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { offer, productPrice } = route.params;

  const [showCounterForm, setShowCounterForm] = useState(false);
  const [counterAmount, setCounterAmount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  const isSeller = offer.sellerId === user?.id;
  const isBuyer = offer.buyerId === user?.id;
  const isPending = offer.status === 'pending';

  const acceptMutation = useMutation({
    mutationFn: () => offersApi.acceptOffer(offer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      Alert.alert(
        'Oferta aceptada',
        'Has aceptado la oferta. Ahora pueden coordinar el pago y la entrega.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo aceptar la oferta');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => offersApi.rejectOffer(offer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      Alert.alert('Oferta rechazada', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo rechazar la oferta');
    },
  });

  const counterMutation = useMutation({
    mutationFn: () =>
      offersApi.counterOffer(offer.id, {
        amount: parseInt(counterAmount, 10),
        message: counterMessage.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      Alert.alert(
        'Contraoferta enviada',
        'Tu contraoferta ha sido enviada al comprador.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo enviar la contraoferta');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => offersApi.cancelOffer(offer.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      Alert.alert('Oferta cancelada', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo cancelar la oferta');
    },
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handleAccept = () => {
    Alert.alert(
      'Aceptar oferta',
      `¿Confirmas que quieres aceptar la oferta de ${formatPrice(offer.amount)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Aceptar', onPress: () => acceptMutation.mutate() },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'Rechazar oferta',
      '¿Estás seguro de que quieres rechazar esta oferta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Rechazar', style: 'destructive', onPress: () => rejectMutation.mutate() },
      ]
    );
  };

  const handleCounter = () => {
    const amount = parseInt(counterAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }
    if (amount <= offer.amount) {
      Alert.alert('Error', 'La contraoferta debe ser mayor que la oferta actual');
      return;
    }
    counterMutation.mutate();
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar oferta',
      '¿Estás seguro de que quieres cancelar tu oferta?',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelMutation.mutate() },
      ]
    );
  };

  const percentage = offer.amount && productPrice
    ? Math.round((offer.amount / productPrice) * 100)
    : 0;

  const statusConfig = STATUS_CONFIG[offer.status] || STATUS_CONFIG.pending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de oferta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <Ionicons name={statusConfig.icon as any} size={20} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>

          {/* Product Card */}
          <View style={styles.productCard}>
            <Image
              source={{ uri: offer.product?.images?.[0]?.url || offer.product?.images?.[0] }}
              style={styles.productImage}
            />
            <View style={styles.productInfo}>
              <Text style={styles.productTitle} numberOfLines={2}>
                {offer.product?.title}
              </Text>
              <Text style={styles.originalPrice}>
                Precio original: {formatPrice(productPrice || offer.product?.price)}
              </Text>
            </View>
          </View>

          {/* Offer Amount */}
          <View style={styles.offerCard}>
            <Text style={styles.offerLabel}>Monto ofrecido</Text>
            <Text style={styles.offerAmount}>{formatPrice(offer.amount)}</Text>
            <Text style={styles.offerPercentage}>{percentage}% del precio original</Text>
          </View>

          {/* From User */}
          <View style={styles.userCard}>
            <Text style={styles.userLabel}>
              {isBuyer ? 'Tu oferta' : 'Oferta de'}
            </Text>
            <View style={styles.userInfo}>
              <Avatar
                source={offer.buyer?.avatarUrl}
                name={offer.buyer?.displayName}
                size="md"
              />
              <Text style={styles.userName}>{offer.buyer?.displayName}</Text>
              {offer.buyer?.rating && (
                <View style={styles.ratingBadge}>
                  <Ionicons name="star" size={12} color={COLORS.warning} />
                  <Text style={styles.ratingText}>{offer.buyer.rating.toFixed(1)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Message */}
          {offer.message && (
            <View style={styles.messageCard}>
              <Text style={styles.messageLabel}>Mensaje</Text>
              <Text style={styles.messageText}>{offer.message}</Text>
            </View>
          )}

          {/* Timestamps */}
          <View style={styles.timestampsCard}>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Enviada</Text>
              <Text style={styles.timestampValue}>
                {formatRelativeDate(offer.createdAt)}
              </Text>
            </View>
            {offer.expiresAt && offer.status === 'pending' && (
              <View style={styles.timestampRow}>
                <Text style={styles.timestampLabel}>Expira en</Text>
                <Text style={[styles.timestampValue, { color: COLORS.warning }]}>
                  {formatRelativeDate(offer.expiresAt)}
                </Text>
              </View>
            )}
          </View>

          {/* Counter Offer Form */}
          {showCounterForm && isSeller && isPending && (
            <View style={styles.counterForm}>
              <Text style={styles.counterTitle}>Tu contraoferta</Text>
              <View style={styles.counterInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.counterInput}
                  value={counterAmount}
                  onChangeText={(text) => setCounterAmount(text.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="numeric"
                />
              </View>
              <TextInput
                style={styles.counterMessageInput}
                value={counterMessage}
                onChangeText={setCounterMessage}
                placeholder="Mensaje opcional..."
                placeholderTextColor={COLORS.textTertiary}
                multiline
                numberOfLines={2}
              />
              <View style={styles.counterButtons}>
                <Button
                  title="Cancelar"
                  variant="ghost"
                  onPress={() => setShowCounterForm(false)}
                  style={styles.counterButton}
                />
                <Button
                  title="Enviar"
                  onPress={handleCounter}
                  loading={counterMutation.isPending}
                  style={styles.counterButton}
                />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Actions */}
        {isPending && (
          <View style={styles.footer}>
            {isSeller && !showCounterForm && (
              <>
                <View style={styles.footerRow}>
                  <Button
                    title="Rechazar"
                    variant="secondary"
                    onPress={handleReject}
                    loading={rejectMutation.isPending}
                    style={styles.footerButton}
                  />
                  <Button
                    title="Aceptar"
                    onPress={handleAccept}
                    loading={acceptMutation.isPending}
                    style={styles.footerButton}
                  />
                </View>
                <TouchableOpacity
                  style={styles.counterLink}
                  onPress={() => setShowCounterForm(true)}
                >
                  <Ionicons name="swap-horizontal" size={18} color={COLORS.primary} />
                  <Text style={styles.counterLinkText}>Hacer contraoferta</Text>
                </TouchableOpacity>
              </>
            )}

            {isBuyer && (
              <Button
                title="Cancelar mi oferta"
                variant="ghost"
                onPress={handleCancel}
                loading={cancelMutation.isPending}
              />
            )}
          </View>
        )}
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
    padding: SPACING.base,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  statusText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
  },
  productCard: {
    flexDirection: 'row',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  productImage: {
    width: 64,
    height: 64,
    borderRadius: RADIUS.md,
  },
  productInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'center',
  },
  productTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  originalPrice: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  offerCard: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  offerLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  offerAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  offerPercentage: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  userCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  userLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: SPACING.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.warning + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  ratingText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.warning,
  },
  messageCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  messageLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
  },
  messageText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  timestampsCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  timestampLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  timestampValue: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  counterForm: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  counterTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  counterInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  counterInput: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    minWidth: 100,
    textAlign: 'center',
  },
  counterMessageInput: {
    height: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  counterButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  counterButton: {
    flex: 1,
  },
  footer: {
    padding: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  footerButton: {
    flex: 1,
  },
  counterLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  counterLinkText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
