// ============================================
// REUSA - Favorites Screen
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, ROUTES } from '@/constants';
import { productsApi } from '@/services/api';
import { ProductCard } from '@/components/product/ProductCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Loading } from '@/components/common/Loading';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.base * 3) / 2;

export default function FavoritesScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const {
    data: favorites,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => productsApi.getFavorites(),
  });

  const unfavoriteMutation = useMutation({
    mutationFn: (productId: string) => productsApi.toggleFavorite(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId });
  };

  const handleUnfavorite = (productId: string) => {
    unfavoriteMutation.mutate(productId);
  };

  const handleExplore = () => {
    navigation.navigate(ROUTES.SEARCH_TAB);
  };

  const renderProduct = ({ item }: { item: any }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item.id)}
      onFavoritePress={() => handleUnfavorite(item.id)}
      width={CARD_WIDTH}
    />
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Loading fullScreen message="Cargando favoritos..." />
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
        <Text style={styles.headerTitle}>Favoritos</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      {favorites?.data && favorites.data.length > 0 ? (
        <FlatList
          data={favorites.data}
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
          ListHeaderComponent={
            <Text style={styles.countText}>
              {favorites.meta?.total || favorites.data.length} productos guardados
            </Text>
          }
        />
      ) : (
        <EmptyState
          icon="heart-outline"
          title="Sin favoritos aún"
          description="Guarda los productos que te gusten para encontrarlos fácilmente"
          actionLabel="Explorar productos"
          onAction={handleExplore}
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
  headerSpacer: {
    width: 32,
  },
  listContent: {
    padding: SPACING.base,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  countText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
});
