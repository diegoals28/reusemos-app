// ============================================
// REUSA - Search Screen
// ============================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { productsApi } from '@/services/api';
import { ProductCard } from '@/components/product/ProductCard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.base * 3) / 2;

const recentSearches = [
  'iPhone 13',
  'Zapatillas Nike',
  'Bicicleta',
  'Sofá',
  'PlayStation 5',
];

const popularCategories = [
  { id: 'ropa', name: 'Ropa', icon: 'shirt-outline' },
  { id: 'tech', name: 'Tech', icon: 'phone-portrait-outline' },
  { id: 'hogar', name: 'Hogar', icon: 'home-outline' },
  { id: 'libros', name: 'Libros', icon: 'book-outline' },
];

export default function SearchScreen() {
  const navigation = useNavigation<any>();
  const inputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['products', 'search', query],
    queryFn: () => productsApi.searchProducts(query, {}),
    enabled: query.length >= 2,
  });

  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      Keyboard.dismiss();
      setHasSearched(true);
      refetch();
    }
  }, [query, refetch]);

  const handleRecentSearch = (term: string) => {
    setQuery(term);
    setHasSearched(true);
  };

  const handleCategoryPress = (categoryId: string) => {
    navigation.navigate(ROUTES.SEARCH_RESULTS, { categoryId });
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId });
  };

  const handleFilterPress = () => {
    navigation.navigate(ROUTES.SEARCH_FILTERS);
  };

  const clearSearch = () => {
    setQuery('');
    setHasSearched(false);
    inputRef.current?.focus();
  };

  const renderProductItem = ({ item }: { item: any }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item.id)}
      width={CARD_WIDTH}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No encontramos resultados</Text>
      <Text style={styles.emptySubtitle}>
        Intenta con otras palabras clave o revisa los filtros
      </Text>
    </View>
  );

  const renderInitialState = () => (
    <View style={styles.initialState}>
      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Búsquedas recientes</Text>
            <TouchableOpacity>
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentList}>
            {recentSearches.map((term, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={() => handleRecentSearch(term)}
              >
                <Ionicons name="time-outline" size={18} color={COLORS.textTertiary} />
                <Text style={styles.recentText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Popular Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Categorías populares</Text>
        <View style={styles.categoriesGrid}>
          {popularCategories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleCategoryPress(category.id)}
            >
              <View style={styles.categoryIcon}>
                <Ionicons
                  name={category.icon as any}
                  size={28}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.categoryName}>{category.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Trending */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tendencias</Text>
        <View style={styles.trendingList}>
          {['Vintage', 'Sostenible', 'Handmade', 'Marcas premium'].map((trend, index) => (
            <TouchableOpacity
              key={index}
              style={styles.trendingChip}
              onPress={() => handleRecentSearch(trend)}
            >
              <Ionicons name="trending-up" size={14} color={COLORS.primary} />
              <Text style={styles.trendingText}>{trend}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search Header */}
      <View style={styles.header}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={COLORS.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="¿Qué estás buscando?"
            placeholderTextColor={COLORS.textTertiary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={handleFilterPress}>
          <Ionicons name="options-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {!hasSearched ? (
        renderInitialState()
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : searchResults?.data && searchResults.data.length > 0 ? (
        <FlatList
          data={searchResults.data}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.productRow}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {searchResults.meta?.total || searchResults.data.length} resultados
              </Text>
              <TouchableOpacity style={styles.sortButton}>
                <Text style={styles.sortText}>Ordenar</Text>
                <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        renderEmptyState()
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
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialState: {
    flex: 1,
    padding: SPACING.base,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clearText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  recentList: {
    gap: SPACING.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  recentText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  categoryCard: {
    width: (width - SPACING.base * 2 - SPACING.md * 3) / 4,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  trendingList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADIUS.full,
    gap: SPACING.xs,
  },
  trendingText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resultsCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sortText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  productList: {
    padding: SPACING.base,
  },
  productRow: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
