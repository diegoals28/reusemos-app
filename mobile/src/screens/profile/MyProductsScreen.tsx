// ============================================
// REUSA - My Products Screen
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { productsApi } from '@/services/api';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Loading } from '@/components/common/Loading';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.base * 3) / 2;

type FilterType = 'all' | 'active' | 'sold' | 'paused';

const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Activas' },
  { id: 'sold', label: 'Vendidas' },
  { id: 'paused', label: 'Pausadas' },
];

export default function MyProductsScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  const {
    data: products,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['products', 'my', filter],
    queryFn: () => productsApi.getMyProducts(filter === 'all' ? undefined : filter, 1, 50),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => productsApi.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', 'my'] });
      Alert.alert('Eliminado', 'El producto ha sido eliminado');
    },
    onError: () => {
      Alert.alert('Error', 'No pudimos eliminar el producto');
    },
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId });
  };

  const handleCreateProduct = () => {
    navigation.navigate(ROUTES.CREATE_PRODUCT);
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert(
      'Eliminar producto',
      '¿Estás seguro de que quieres eliminar esta publicación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(productId),
        },
      ]
    );
  };

  // Filter products based on status
  const filteredProducts = products?.data?.filter((product: any) => {
    if (filter === 'all') return true;
    if (filter === 'active') return product.status === 'active';
    if (filter === 'sold') return product.status === 'sold';
    if (filter === 'paused') return product.status === 'paused';
    return true;
  });

  const renderProduct = ({ item }: { item: any }) => (
    <View style={styles.productWrapper}>
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item.id)}
        width={CARD_WIDTH}
        showSeller={false}
      />
      {/* Status Badge */}
      {item.status !== 'active' && (
        <View
          style={[
            styles.statusBadge,
            item.status === 'sold' && styles.soldBadge,
            item.status === 'paused' && styles.pausedBadge,
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === 'sold' ? 'Vendido' : 'Pausado'}
          </Text>
        </View>
      )}
      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteProduct(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {FILTERS.map((f) => (
        <TouchableOpacity
          key={f.id}
          style={[styles.filterChip, filter === f.id && styles.filterChipActive]}
          onPress={() => setFilter(f.id)}
        >
          <Text
            style={[
              styles.filterText,
              filter === f.id && styles.filterTextActive,
            ]}
          >
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading fullScreen message="Cargando publicaciones..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis publicaciones</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateProduct}>
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {renderFilters()}

      {/* Content */}
      {filteredProducts && filteredProducts.length > 0 ? (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={COLORS.primary}
            />
          }
        />
      ) : (
        <EmptyState
          icon="pricetag-outline"
          title={filter === 'all' ? 'Sin publicaciones' : `Sin productos ${FILTERS.find(f => f.id === filter)?.label.toLowerCase()}`}
          description={filter === 'all' ? 'Comienza a vender publicando tu primer producto' : 'No tienes productos en este estado'}
          actionLabel={filter === 'all' ? 'Publicar ahora' : undefined}
          onAction={filter === 'all' ? handleCreateProduct : undefined}
        />
      )}
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
  addButton: {
    padding: SPACING.xs,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  listContent: {
    padding: SPACING.base,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  productWrapper: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    zIndex: 10,
  },
  soldBadge: {
    backgroundColor: COLORS.success,
  },
  pausedBadge: {
    backgroundColor: COLORS.textSecondary,
  },
  statusText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  quickActions: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    zIndex: 10,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
