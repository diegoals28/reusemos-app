// ============================================
// REUSA - Transactions List Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { transactionsApi } from '@/services/api';
import { formatPrice, formatRelativeDate } from '@/utils/formatters';
import { EmptyState } from '@/components/common/EmptyState';
import { Loading } from '@/components/common/Loading';

type TabType = 'purchases' | 'sales';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: 'Pendiente', color: COLORS.warning, icon: 'time' },
  paid: { label: 'Pagado', color: COLORS.info, icon: 'card' },
  shipped: { label: 'Enviado', color: COLORS.primary, icon: 'paper-plane' },
  delivered: { label: 'Entregado', color: COLORS.success, icon: 'checkmark-done' },
  completed: { label: 'Completado', color: COLORS.success, icon: 'checkmark-circle' },
  cancelled: { label: 'Cancelado', color: COLORS.error, icon: 'close-circle' },
  disputed: { label: 'En disputa', color: COLORS.error, icon: 'alert-circle' },
};

export default function TransactionsListScreen() {
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabType>('purchases');

  const {
    data: transactions,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['transactions', activeTab],
    queryFn: () =>
      activeTab === 'purchases'
        ? transactionsApi.getMyPurchases()
        : transactionsApi.getMySales(),
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handleTransactionPress = (transactionId: string) => {
    navigation.navigate('TransactionDetail', { transactionId });
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
    const otherUser = activeTab === 'purchases' ? item.seller : item.buyer;

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={() => handleTransactionPress(item.id)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.product?.images?.[0] }}
          style={styles.productImage}
        />

        <View style={styles.transactionInfo}>
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.product?.title}
          </Text>

          <View style={styles.userRow}>
            <Text style={styles.userLabel}>
              {activeTab === 'purchases' ? 'Vendedor:' : 'Comprador:'}
            </Text>
            <Text style={styles.userName}>{otherUser?.displayName}</Text>
          </View>

          <View style={styles.bottomRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
              <Ionicons
                name={statusConfig.icon as any}
                size={12}
                color={statusConfig.color}
              />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={styles.dateText}>
              {formatRelativeDate(item.createdAt)}
            </Text>
          </View>
        </View>

        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>{formatPrice(item.amount)}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <EmptyState
      icon="receipt-outline"
      title={activeTab === 'purchases' ? 'Sin compras' : 'Sin ventas'}
      description={
        activeTab === 'purchases'
          ? 'Todavía no realizaste ninguna compra'
          : 'Todavía no vendiste ningún producto'
      }
      actionLabel={activeTab === 'purchases' ? 'Explorar productos' : 'Publicar producto'}
      onAction={() =>
        navigation.navigate('MainTabs', {
          screen: activeTab === 'purchases' ? 'Home' : 'Create',
        })
      }
    />
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis transacciones</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'purchases' && styles.tabActive]}
          onPress={() => setActiveTab('purchases')}
        >
          <Ionicons
            name="bag"
            size={20}
            color={activeTab === 'purchases' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[styles.tabText, activeTab === 'purchases' && styles.tabTextActive]}
          >
            Compras
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.tabActive]}
          onPress={() => setActiveTab('sales')}
        >
          <Ionicons
            name="pricetag"
            size={20}
            color={activeTab === 'sales' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text
            style={[styles.tabText, activeTab === 'sales' && styles.tabTextActive]}
          >
            Ventas
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={transactions || []}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />
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
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
  },
  tabActive: {
    backgroundColor: COLORS.primary + '15',
  },
  tabText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: SPACING.base,
    flexGrow: 1,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
  },
  transactionInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  productTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  userLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    marginRight: 4,
  },
  userName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
  },
  dateText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  priceContainer: {
    alignItems: 'flex-end',
    marginLeft: SPACING.sm,
  },
  priceAmount: {
    fontSize: FONT_SIZES.base,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  separator: {
    height: SPACING.sm,
  },
});
