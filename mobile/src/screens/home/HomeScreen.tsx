// ============================================
// Reusemos - Home Screen
// ============================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { productsApi, categoriesApi } from '@/services/api';
import { ProductCard } from '@/components/product/ProductCard';
import { useAuthStore } from '@/stores/authStore';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.base * 3) / 2;

const categories = [
  { id: 'all', name: 'Todo', icon: 'grid-outline' },
  { id: 'ropa', name: 'Ropa', icon: 'shirt-outline' },
  { id: 'tech', name: 'Tech', icon: 'phone-portrait-outline' },
  { id: 'hogar', name: 'Hogar', icon: 'home-outline' },
  { id: 'libros', name: 'Libros', icon: 'book-outline' },
];

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch recent products
  const { data: recentProducts, refetch: refetchRecent, isLoading } = useQuery({
    queryKey: ['products', 'recent'],
    queryFn: () => productsApi.getRecentProducts(1, 10),
  });

  // Fetch nearby products
  const { data: nearbyProducts, refetch: refetchNearby } = useQuery({
    queryKey: ['products', 'nearby'],
    queryFn: () => productsApi.getNearbyProducts(-34.6037, -58.3816, 25, 1, 10),
    enabled: true, // Would use user's location
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchRecent(), refetchNearby()]);
    setRefreshing(false);
  }, []);

  const handleProductPress = (productId: string) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId });
  };

  const handleSearch = () => {
    navigation.navigate(ROUTES.SEARCH_TAB);
  };

  const renderCategoryItem = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        selectedCategory === item.id && styles.categoryChipActive,
      ]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Ionicons
        name={item.icon as any}
        size={18}
        color={selectedCategory === item.id ? COLORS.white : COLORS.textSecondary}
      />
      <Text
        style={[
          styles.categoryChipText,
          selectedCategory === item.id && styles.categoryChipTextActive,
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: any }) => (
    <ProductCard
      product={item}
      onPress={() => handleProductPress(item.id)}
      width={CARD_WIDTH}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="location" size={18} color={COLORS.primary} />
          <Text style={styles.locationText}>
            {user?.city || 'Buenos Aires'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.textPrimary} />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <TouchableOpacity style={styles.searchBar} onPress={handleSearch}>
        <Ionicons name="search" size={20} color={COLORS.textTertiary} />
        <Text style={styles.searchPlaceholder}>Buscar en Reusemos...</Text>
      </TouchableOpacity>

      {/* Categories */}
      <FlatList
        horizontal
        data={categories}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      />

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Nearby Section */}
        {nearbyProducts?.data && nearbyProducts.data.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cerca de ti</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Ver más</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={nearbyProducts.data}
              renderItem={renderProductItem}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* Impact Banner */}
        <TouchableOpacity style={styles.impactBanner}>
          <View style={styles.impactIcon}>
            <Ionicons name="leaf" size={24} color={COLORS.white} />
          </View>
          <View style={styles.impactContent}>
            <Text style={styles.impactTitle}>
              Juntos hemos evitado 12,847 kg de CO₂
            </Text>
            <Text style={styles.impactSubtitle}>este mes</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Recent Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recién publicados</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>Ver más</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.productsGrid}>
            {recentProducts?.data?.map((product: any) => (
              <ProductCard
                key={product.id}
                product={product}
                onPress={() => handleProductPress(product.id)}
                width={CARD_WIDTH}
              />
            ))}
          </View>
        </View>
      </ScrollView>
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
    paddingVertical: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: SPACING.sm,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  searchPlaceholder: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textTertiary,
  },
  categoriesContainer: {
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.full,
    marginRight: SPACING.sm,
    gap: SPACING.xs,
  },
  categoryChipActive: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING['2xl'],
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.base,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  horizontalList: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.md,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.base,
    gap: SPACING.md,
  },
  impactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.base,
    marginBottom: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  impactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  impactContent: {
    flex: 1,
  },
  impactTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  impactSubtitle: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
});
