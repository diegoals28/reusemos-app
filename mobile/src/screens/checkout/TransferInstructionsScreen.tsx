// ============================================
// Reusemos - Transfer Instructions Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { transactionsApi } from '@/services/api';
import { Button } from '@/components/common/Button';
import { formatPrice } from '@/utils/formatters';

export default function TransferInstructionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { transactionId, amount, productTitle } = route.params;

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const { data: transaction } = useQuery({
    queryKey: ['transaction', transactionId],
    queryFn: () => transactionsApi.getTransactionById(transactionId),
  });

  const sellerBankDetails = transaction?.seller?.bankDetails;
  const bankDetails = {
    bankName: sellerBankDetails?.bank || 'Banco Ejemplo',
    accountType: sellerBankDetails?.accountType || 'Cuenta Corriente',
    cbu: sellerBankDetails?.cbu || '0000000000000000000000',
    alias: sellerBankDetails?.alias || 'ALIAS.VENDEDOR',
    accountHolder: 'Nombre del Vendedor',
    cuit: '00-00000000-0',
  };

  const handleCopy = async (text: string, field: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTransferCompleted = () => {
    Alert.alert(
      'Confirmar transferencia',
      '¿Ya realizaste la transferencia? El vendedor deberá confirmar la recepción del pago.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, ya transferí',
          onPress: () => {
            navigation.replace('PurchaseSuccess', {
              transactionId,
              productTitle,
              paymentPending: true,
            });
          },
        },
      ]
    );
  };

  const renderCopyableField = (label: string, value: string, fieldName: string) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.copyableValue}
        onPress={() => handleCopy(value, fieldName)}
        activeOpacity={0.7}
      >
        <Text style={styles.fieldValue}>{value}</Text>
        <Ionicons
          name={copiedField === fieldName ? 'checkmark' : 'copy-outline'}
          size={20}
          color={copiedField === fieldName ? COLORS.success : COLORS.primary}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Datos para transferencia</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>Monto a transferir</Text>
          <Text style={styles.amountValue}>{formatPrice(amount)}</Text>
          <TouchableOpacity
            style={styles.copyAmount}
            onPress={() => handleCopy(amount.toString(), 'amount')}
          >
            <Text style={styles.copyAmountText}>
              {copiedField === 'amount' ? 'Copiado' : 'Copiar monto'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bank Details */}
        <View style={styles.bankCard}>
          <Text style={styles.sectionTitle}>Datos bancarios del vendedor</Text>

          {renderCopyableField('Banco', bankDetails.bankName, 'bank')}
          {renderCopyableField('Tipo de cuenta', bankDetails.accountType, 'type')}
          {renderCopyableField('CBU', bankDetails.cbu, 'cbu')}
          {renderCopyableField('Alias', bankDetails.alias, 'alias')}
          {renderCopyableField('Titular', bankDetails.accountHolder, 'holder')}
          {renderCopyableField('CUIT/CUIL', bankDetails.cuit, 'cuit')}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <View style={styles.instructionHeader}>
            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
            <Text style={styles.instructionTitle}>Instrucciones</Text>
          </View>

          <View style={styles.instruction}>
            <Text style={styles.instructionNumber}>1.</Text>
            <Text style={styles.instructionText}>
              Abre tu app de banco o homebanking
            </Text>
          </View>

          <View style={styles.instruction}>
            <Text style={styles.instructionNumber}>2.</Text>
            <Text style={styles.instructionText}>
              Realiza una transferencia por el monto exacto usando el CBU o Alias
            </Text>
          </View>

          <View style={styles.instruction}>
            <Text style={styles.instructionNumber}>3.</Text>
            <Text style={styles.instructionText}>
              Guarda el comprobante de la transferencia
            </Text>
          </View>

          <View style={styles.instruction}>
            <Text style={styles.instructionNumber}>4.</Text>
            <Text style={styles.instructionText}>
              Envía el comprobante al vendedor por el chat
            </Text>
          </View>
        </View>

        {/* Warning */}
        <View style={styles.warningCard}>
          <Ionicons name="warning" size={20} color={COLORS.warning} />
          <Text style={styles.warningText}>
            Verifica los datos antes de transferir. Reusemos no se hace responsable por transferencias realizadas a cuentas incorrectas.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Ya realicé la transferencia"
          onPress={handleTransferCompleted}
        />
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('MainTabs', { screen: 'Chats' })}
        >
          <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
          <Text style={styles.chatButtonText}>Enviar comprobante al vendedor</Text>
        </TouchableOpacity>
      </View>
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
  amountCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.base,
  },
  amountLabel: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white + 'CC',
  },
  amountValue: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.white,
    marginTop: SPACING.xs,
  },
  copyAmount: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.white + '20',
    borderRadius: RADIUS.full,
  },
  copyAmountText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.white,
  },
  bankCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.base,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  field: {
    marginBottom: SPACING.md,
  },
  fieldLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  copyableValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  fieldValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  instructionsCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    padding: SPACING.base,
    marginBottom: SPACING.base,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  instructionTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  instruction: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  instructionNumber: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
    width: 24,
  },
  instructionText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    backgroundColor: COLORS.warning + '10',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.base,
  },
  warningText: {
    flex: 1,
    fontSize: FONT_SIZES.sm,
    color: COLORS.warning,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  chatButtonText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.primary,
    fontWeight: '500',
  },
});
