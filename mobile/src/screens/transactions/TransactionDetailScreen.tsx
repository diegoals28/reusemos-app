// ============================================
// REUSA - Transaction Detail Screen
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
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { transactionsApi, shippingApi, ShippingLabelRequest } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/common/Button';
import { Avatar } from '@/components/common/Avatar';
import { Loading } from '@/components/common/Loading';
import { formatPrice, formatDate, formatRelativeDate } from '@/utils/formatters';

const STATUS_TIMELINE = [
  { key: 'pending', label: 'Pendiente', icon: 'time' },
  { key: 'paid', label: 'Pagado', icon: 'card' },
  { key: 'shipped', label: 'Enviado', icon: 'paper-plane' },
  { key: 'delivered', label: 'Entregado', icon: 'checkmark-done' },
  { key: 'completed', label: 'Completado', icon: 'checkmark-circle' },
];

export default function TransactionDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { transactionId } = route.params;

  // Shipping label modal state
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [shippingForm, setShippingForm] = useState({
    originAddress: '', // Nombre de calle
    originStreetNumber: '',
    originCountyCode: 'STGO', // Código comuna Chilexpress
    originSupplement: '', // Depto, oficina
    senderName: user?.displayName || '',
    senderPhone: user?.phoneNumber || '',
    senderEmail: user?.email || '',
    packageWeight: '1',
    packageHeight: '20',
    packageWidth: '20',
    packageLength: '20',
    packageContent: '',
  });

  const {
    data: transaction,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionsApi.getTransactionById(transactionId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: (status: string) =>
      transactionsApi.updateTransactionStatus(transactionId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      Alert.alert('Error', error.response?.data?.message || 'No se pudo actualizar');
    },
  });

  // Shipping label query
  const {
    data: shippingLabel,
    isLoading: isLoadingLabel,
    refetch: refetchLabel,
  } = useQuery({
    queryKey: ['shippingLabel', transactionId],
    queryFn: () => shippingApi.getLabel(transactionId),
    enabled: !!transaction?.deliveryMethod && transaction.deliveryMethod === 'shipping',
    retry: false,
  });

  // Generate shipping label mutation
  const generateLabelMutation = useMutation({
    mutationFn: (data: ShippingLabelRequest) => shippingApi.generateLabel(data),
    onSuccess: (data) => {
      setShowShippingModal(false);
      refetchLabel();
      queryClient.invalidateQueries({ queryKey: ['transaction', transactionId] });
      Alert.alert(
        'Etiqueta generada',
        `Tu número de orden es: ${data.transportOrderNumber}\n\nPuedes ver y descargar la etiqueta desde esta pantalla.`,
        [{ text: 'OK' }]
      );
    },
    onError: (error: any) => {
      Alert.alert(
        'Error',
        error.response?.data?.message || 'No se pudo generar la etiqueta de envío'
      );
    },
  });

  const isBuyer = transaction?.buyerId === user?.id;
  const isSeller = transaction?.sellerId === user?.id;
  const otherUser = isBuyer ? transaction?.seller : transaction?.buyer;

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChat = () => {
    navigation.navigate('ChatDetail', {
      conversationId: transaction?.conversationId,
      otherUser,
      productId: transaction?.productId,
    });
  };

  const handleConfirmPayment = () => {
    Alert.alert(
      'Confirmar pago recibido',
      '¿Confirmas que recibiste el pago de esta transacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => updateStatusMutation.mutate('paid'),
        },
      ]
    );
  };

  const handleMarkShipped = () => {
    Alert.alert(
      'Marcar como enviado',
      '¿Confirmas que ya enviaste el producto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => updateStatusMutation.mutate('shipped'),
        },
      ]
    );
  };

  const handleConfirmDelivery = () => {
    Alert.alert(
      'Confirmar recepción',
      '¿Confirmas que recibiste el producto en buen estado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => updateStatusMutation.mutate('delivered'),
        },
      ]
    );
  };

  const handleLeaveReview = () => {
    navigation.navigate('LeaveReview', {
      transactionId,
      userId: otherUser?.id,
      userName: otherUser?.displayName,
    });
  };

  const handleReportProblem = () => {
    Alert.alert(
      'Reportar problema',
      '¿Qué tipo de problema tienes con esta transacción?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Producto diferente', onPress: () => {} },
        { text: 'No recibí el producto', onPress: () => {} },
        { text: 'Otro problema', onPress: () => {} },
      ]
    );
  };

  const handleGenerateLabel = () => {
    setShippingForm({
      ...shippingForm,
      packageContent: transaction?.product?.title || '',
    });
    setShowShippingModal(true);
  };

  const handleSubmitLabel = () => {
    if (!shippingForm.originAddress || !shippingForm.originStreetNumber || !shippingForm.senderName || !shippingForm.senderPhone) {
      Alert.alert('Error', 'Por favor completa todos los campos requeridos (dirección, número, nombre y teléfono)');
      return;
    }

    const labelRequest: ShippingLabelRequest = {
      transactionId,
      originAddress: shippingForm.originAddress,
      originStreetNumber: parseInt(shippingForm.originStreetNumber) || 0,
      originCountyCode: shippingForm.originCountyCode,
      originSupplement: shippingForm.originSupplement || undefined,
      senderName: shippingForm.senderName,
      senderPhone: shippingForm.senderPhone,
      senderEmail: shippingForm.senderEmail,
      packageWeight: parseFloat(shippingForm.packageWeight) || 1,
      packageHeight: parseFloat(shippingForm.packageHeight) || 20,
      packageWidth: parseFloat(shippingForm.packageWidth) || 20,
      packageLength: parseFloat(shippingForm.packageLength) || 20,
      packageContent: shippingForm.packageContent,
      declaredValue: transaction?.amount || 0,
    };

    generateLabelMutation.mutate(labelRequest);
  };

  const handleTrackShipment = () => {
    if (shippingLabel?.trackingUrl) {
      Linking.openURL(shippingLabel.trackingUrl);
    }
  };

  const getStatusIndex = (status: string | undefined) => {
    if (!status) return 0;
    const index = STATUS_TIMELINE.findIndex((s) => s.key === status.toLowerCase());
    return index >= 0 ? index : 0;
  };

  const renderTimeline = () => {
    if (transaction?.status === 'cancelled') {
      return (
        <View style={styles.cancelledContainer}>
          <Ionicons name="close-circle" size={48} color={COLORS.error} />
          <Text style={styles.cancelledTitle}>Transacción cancelada</Text>
          <Text style={styles.cancelledDescription}>
            Esta transacción fue cancelada
          </Text>
        </View>
      );
    }

    const currentIndex = getStatusIndex(transaction?.status);

    return (
      <View style={styles.timeline}>
        {STATUS_TIMELINE.map((step, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <View key={step.key} style={styles.timelineStep}>
              <View style={styles.timelineIconContainer}>
                <View
                  style={[
                    styles.timelineIcon,
                    isCompleted && styles.timelineIconCompleted,
                    isCurrent && styles.timelineIconCurrent,
                  ]}
                >
                  <Ionicons
                    name={step.icon as any}
                    size={16}
                    color={isCompleted ? COLORS.white : COLORS.textTertiary}
                  />
                </View>
                {index < STATUS_TIMELINE.length - 1 && (
                  <View
                    style={[
                      styles.timelineLine,
                      index < currentIndex && styles.timelineLineCompleted,
                    ]}
                  />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text
                  style={[
                    styles.timelineLabel,
                    isCompleted && styles.timelineLabelCompleted,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderActions = () => {
    const status = transaction?.status;

    if (status === 'cancelled' || status === 'completed') {
      return null;
    }

    if (isSeller) {
      if (status === 'pending') {
        return (
          <Button
            title="Confirmar pago recibido"
            onPress={handleConfirmPayment}
            loading={updateStatusMutation.isPending}
          />
        );
      }
      if (status === 'paid') {
        return (
          <Button
            title="Marcar como enviado"
            onPress={handleMarkShipped}
            loading={updateStatusMutation.isPending}
          />
        );
      }
    }

    if (isBuyer) {
      if (status === 'shipped' || status === 'delivered') {
        return (
          <Button
            title="Confirmar recepción"
            onPress={handleConfirmDelivery}
            loading={updateStatusMutation.isPending}
          />
        );
      }
    }

    return null;
  };

  if (isLoading || !transaction) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de transacción</Text>
        <TouchableOpacity style={styles.moreButton} onPress={handleReportProblem}>
          <Ionicons name="ellipsis-horizontal" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Product Card */}
        <View style={styles.productCard}>
          <Image
            source={{ uri: transaction.product?.images?.[0] }}
            style={styles.productImage}
          />
          <View style={styles.productInfo}>
            <Text style={styles.productTitle} numberOfLines={2}>
              {transaction.product?.title}
            </Text>
            <Text style={styles.productPrice}>
              {formatPrice(transaction.amount || transaction.totalAmount || 0)}
            </Text>
            <Text style={styles.transactionDate}>
              {formatDate(transaction.createdAt)}
            </Text>
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Estado de la transacción</Text>
          {renderTimeline()}
        </View>

        {/* Other User */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {isBuyer ? 'Vendedor' : 'Comprador'}
          </Text>
          <TouchableOpacity style={styles.userCard} onPress={handleChat}>
            <Avatar
              source={otherUser?.avatarUrl}
              name={otherUser?.displayName}
              size="md"
            />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{otherUser?.displayName}</Text>
              {(otherUser?.ratingAvg ?? 0) > 0 && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color={COLORS.warning} />
                  <Text style={styles.ratingText}>
                    {(otherUser?.ratingAvg ?? 0).toFixed(1)}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.chatButton}>
              <Ionicons name="chatbubble" size={20} color={COLORS.primary} />
              <Text style={styles.chatButtonText}>Chat</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Delivery Details */}
        {transaction.deliveryMethod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Entrega</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Ionicons
                  name={transaction.deliveryMethod === 'shipping' ? 'car' : 'location'}
                  size={20}
                  color={COLORS.textSecondary}
                />
                <Text style={styles.detailText}>
                  {transaction.deliveryMethod === 'shipping'
                    ? 'Envío a domicilio'
                    : 'Retiro en persona'}
                </Text>
              </View>
              {transaction.shippingAddress && (
                <Text style={styles.addressText}>
                  {transaction.shippingAddress}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Shipping Label Section (for shipping orders) */}
        {transaction.deliveryMethod === 'shipping' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Etiqueta de envío</Text>
            {isLoadingLabel ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Cargando etiqueta...</Text>
              </View>
            ) : shippingLabel?.success && shippingLabel?.transportOrderNumber ? (
              <View style={styles.shippingLabelCard}>
                <View style={styles.shippingLabelHeader}>
                  <Ionicons name="document-text" size={24} color={COLORS.primary} />
                  <View style={styles.shippingLabelInfo}>
                    <Text style={styles.shippingLabelTitle}>Chilexpress</Text>
                    <Text style={styles.shippingOrderNumber}>
                      OT: {shippingLabel.transportOrderNumber}
                    </Text>
                  </View>
                </View>
                {shippingLabel.barcode && (
                  <View style={styles.barcodeContainer}>
                    <Text style={styles.barcodeText}>{shippingLabel.barcode}</Text>
                  </View>
                )}
                <View style={styles.shippingActions}>
                  <TouchableOpacity
                    style={styles.shippingActionButton}
                    onPress={handleTrackShipment}
                  >
                    <Ionicons name="navigate" size={20} color={COLORS.primary} />
                    <Text style={styles.shippingActionText}>Rastrear envío</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.shippingInstructions}>
                  Imprime esta etiqueta y pégala en el paquete. Luego llévalo a una sucursal Chilexpress.
                </Text>
              </View>
            ) : isSeller && (transaction.status === 'paid' || transaction.status === 'pending') ? (
              <TouchableOpacity
                style={styles.generateLabelCard}
                onPress={handleGenerateLabel}
              >
                <Ionicons name="add-circle" size={32} color={COLORS.primary} />
                <View style={styles.generateLabelContent}>
                  <Text style={styles.generateLabelTitle}>Generar etiqueta</Text>
                  <Text style={styles.generateLabelDescription}>
                    Genera una etiqueta de Chilexpress para enviar este producto
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.noLabelCard}>
                <Ionicons name="time" size={24} color={COLORS.textTertiary} />
                <Text style={styles.noLabelText}>
                  {isBuyer
                    ? 'El vendedor aún no ha generado la etiqueta de envío'
                    : 'Genera la etiqueta de envío cuando recibas el pago'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pago</Text>
          <View style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Ionicons
                name={
                  transaction.paymentMethod === 'mercadopago'
                    ? 'card'
                    : transaction.paymentMethod === 'transfer'
                    ? 'swap-horizontal'
                    : 'cash'
                }
                size={20}
                color={COLORS.textSecondary}
              />
              <Text style={styles.detailText}>
                {transaction.paymentMethod === 'mercadopago'
                  ? 'MercadoPago'
                  : transaction.paymentMethod === 'transfer'
                  ? 'Transferencia bancaria'
                  : 'Efectivo'}
              </Text>
            </View>
          </View>
        </View>

        {/* Review Section */}
        {transaction.status === 'completed' && !transaction.review && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calificación</Text>
            <TouchableOpacity style={styles.reviewCard} onPress={handleLeaveReview}>
              <Ionicons name="star-outline" size={24} color={COLORS.warning} />
              <View style={styles.reviewContent}>
                <Text style={styles.reviewTitle}>Deja tu opinión</Text>
                <Text style={styles.reviewDescription}>
                  Ayuda a otros usuarios compartiendo tu experiencia
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Existing Review */}
        {transaction.review && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tu calificación</Text>
            <View style={styles.existingReview}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons
                    key={star}
                    name={star <= (transaction.review?.rating ?? 0) ? 'star' : 'star-outline'}
                    size={20}
                    color={COLORS.warning}
                  />
                ))}
              </View>
              {transaction.review?.comment && (
                <Text style={styles.reviewComment}>{transaction.review.comment}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      {renderActions() && (
        <View style={styles.footer}>
          {renderActions()}
        </View>
      )}

      {/* Shipping Label Generation Modal */}
      <Modal
        visible={showShippingModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShippingModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowShippingModal(false)}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Generar etiqueta</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>Dirección de origen (remitente)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre de calle *"
              value={shippingForm.originAddress}
              onChangeText={(text) =>
                setShippingForm({ ...shippingForm, originAddress: text })
              }
              placeholderTextColor={COLORS.textTertiary}
            />
            <View style={styles.dimensionsRow}>
              <TextInput
                style={[styles.input, styles.dimensionInput]}
                placeholder="Número *"
                value={shippingForm.originStreetNumber}
                onChangeText={(text) =>
                  setShippingForm({ ...shippingForm, originStreetNumber: text })
                }
                keyboardType="number-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.dimensionInput]}
                placeholder="Depto/Oficina"
                value={shippingForm.originSupplement}
                onChangeText={(text) =>
                  setShippingForm({ ...shippingForm, originSupplement: text })
                }
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Código comuna (ej: STGO, PROV, LASC) *"
              value={shippingForm.originCountyCode}
              onChangeText={(text) =>
                setShippingForm({ ...shippingForm, originCountyCode: text.toUpperCase() })
              }
              autoCapitalize="characters"
              placeholderTextColor={COLORS.textTertiary}
            />

            <Text style={styles.modalSectionTitle}>Datos del remitente</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre completo *"
              value={shippingForm.senderName}
              onChangeText={(text) =>
                setShippingForm({ ...shippingForm, senderName: text })
              }
              placeholderTextColor={COLORS.textTertiary}
            />
            <TextInput
              style={styles.input}
              placeholder="Teléfono *"
              value={shippingForm.senderPhone}
              onChangeText={(text) =>
                setShippingForm({ ...shippingForm, senderPhone: text })
              }
              keyboardType="phone-pad"
              placeholderTextColor={COLORS.textTertiary}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={shippingForm.senderEmail}
              onChangeText={(text) =>
                setShippingForm({ ...shippingForm, senderEmail: text })
              }
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={COLORS.textTertiary}
            />

            <Text style={styles.modalSectionTitle}>Datos del paquete</Text>
            <View style={styles.dimensionsRow}>
              <TextInput
                style={[styles.input, styles.dimensionInput]}
                placeholder="Peso (kg)"
                value={shippingForm.packageWeight}
                onChangeText={(text) =>
                  setShippingForm({ ...shippingForm, packageWeight: text })
                }
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.dimensionInput]}
                placeholder="Alto (cm)"
                value={shippingForm.packageHeight}
                onChangeText={(text) =>
                  setShippingForm({ ...shippingForm, packageHeight: text })
                }
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <View style={styles.dimensionsRow}>
              <TextInput
                style={[styles.input, styles.dimensionInput]}
                placeholder="Ancho (cm)"
                value={shippingForm.packageWidth}
                onChangeText={(text) =>
                  setShippingForm({ ...shippingForm, packageWidth: text })
                }
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.dimensionInput]}
                placeholder="Largo (cm)"
                value={shippingForm.packageLength}
                onChangeText={(text) =>
                  setShippingForm({ ...shippingForm, packageLength: text })
                }
                keyboardType="decimal-pad"
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Contenido del paquete"
              value={shippingForm.packageContent}
              onChangeText={(text) =>
                setShippingForm({ ...shippingForm, packageContent: text })
              }
              multiline
              placeholderTextColor={COLORS.textTertiary}
            />

            <View style={styles.destinationInfo}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <View style={styles.destinationContent}>
                <Text style={styles.destinationLabel}>Destino</Text>
                <Text style={styles.destinationAddress}>
                  {transaction?.shippingAddress || 'Sin dirección'}
                </Text>
                <Text style={styles.destinationCity}>
                  {transaction?.shippingCity || ''}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              title="Generar etiqueta Chilexpress"
              onPress={handleSubmitLabel}
              loading={generateLabelMutation.isPending}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  moreButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  productCard: {
    flexDirection: 'row',
    padding: SPACING.base,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.sm,
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  productInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  productTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  section: {
    backgroundColor: COLORS.white,
    padding: SPACING.base,
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  timeline: {
    paddingLeft: SPACING.sm,
  },
  timelineStep: {
    flexDirection: 'row',
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  timelineIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: COLORS.success,
  },
  timelineIconCurrent: {
    backgroundColor: COLORS.primary,
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: COLORS.border,
    marginVertical: 4,
  },
  timelineLineCompleted: {
    backgroundColor: COLORS.success,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 6,
    paddingBottom: SPACING.lg,
  },
  timelineLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textTertiary,
  },
  timelineLabelCompleted: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  cancelledContainer: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  cancelledTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.error,
    marginTop: SPACING.md,
  },
  cancelledDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
  },
  userInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  userName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
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
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  chatButtonText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  detailCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  addressText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginLeft: 28,
  },
  reviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.warning + '10',
    borderRadius: RADIUS.lg,
  },
  reviewContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  reviewTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  existingReview: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: SPACING.sm,
  },
  reviewComment: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  footer: {
    padding: SPACING.base,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  // Shipping Label Styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  shippingLabelCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
  },
  shippingLabelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  shippingLabelInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  shippingLabelTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  shippingOrderNumber: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  barcodeContainer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  barcodeText: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  shippingActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  shippingActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  shippingActionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  shippingInstructions: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  generateLabelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.primary + '50',
  },
  generateLabelContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  generateLabelTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  generateLabelDescription: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  noLabelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    gap: SPACING.md,
  },
  noLabelText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.base,
  },
  modalSectionTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  dimensionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  dimensionInput: {
    flex: 1,
  },
  destinationInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.lg,
  },
  destinationContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  destinationLabel: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  destinationAddress: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  destinationCity: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  modalFooter: {
    padding: SPACING.base,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
