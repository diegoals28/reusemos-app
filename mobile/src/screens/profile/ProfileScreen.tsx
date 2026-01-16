// ============================================
// REUSA - Profile Screen
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { usersApi, productsApi } from '@/services/api';
import { ProductCard } from '@/components/product/ProductCard';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.base * 3) / 2;

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated } = useAuthStore();

  const { data: profileData } = useQuery({
    queryKey: ['user', 'profile'],
    queryFn: () => usersApi.getMe(),
    enabled: isAuthenticated,
  });

  const { data: myProducts } = useQuery({
    queryKey: ['products', 'my'],
    queryFn: () => productsApi.getMyProducts(undefined, 1, 10),
    enabled: isAuthenticated,
  });

  const { data: favorites } = useQuery({
    queryKey: ['favorites'],
    queryFn: () => productsApi.getFavorites(),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.notLoggedIn}>
          <View style={styles.notLoggedInIcon}>
            <Ionicons name="person-outline" size={64} color={COLORS.textTertiary} />
          </View>
          <Text style={styles.notLoggedInTitle}>Inicia sesión</Text>
          <Text style={styles.notLoggedInText}>
            Para ver tu perfil, publicaciones y más
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate(ROUTES.LOGIN)}
          >
            <Text style={styles.loginButtonText}>Iniciar sesión</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const profile = profileData || user;

  const handleSettings = () => {
    navigation.navigate(ROUTES.SETTINGS);
  };

  const handleEditProfile = () => {
    navigation.navigate(ROUTES.EDIT_PROFILE);
  };

  const handlePublish = () => {
    navigation.navigate(ROUTES.CREATE_PRODUCT);
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, { productId });
  };

  const handleViewAllProducts = () => {
    navigation.navigate(ROUTES.MY_PRODUCTS);
  };

  const handleViewFavorites = () => {
    navigation.navigate(ROUTES.FAVORITES);
  };

  const stats = [
    {
      label: 'Publicaciones',
      value: myProducts?.meta?.total || profile?.productsCount || 0,
    },
    {
      label: 'Ventas',
      value: profile?.salesCount || 0,
    },
    {
      label: 'Intercambios',
      value: profile?.tradesCount || 0,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={handleSettings}>
          <Ionicons name="settings-outline" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            {profile?.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.textTertiary} />
              </View>
            )}
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{profile?.displayName}</Text>
              <Text style={styles.username}>@{profile?.username}</Text>
              {profile?.location?.city && (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
                  <Text style={styles.locationText}>{profile.location.city}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Ionicons name="pencil" size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Rating */}
          {profile?.rating && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={18} color={COLORS.warning} />
              <Text style={styles.ratingValue}>{profile.rating.toFixed(1)}</Text>
              <Text style={styles.ratingCount}>({profile.reviewCount} reseñas)</Text>
              {profile.isVerified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
                  <Text style={styles.verifiedText}>Verificado</Text>
                </View>
              )}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsContainer}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.statItem}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Bio */}
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.actionItem} onPress={handlePublish}>
            <View style={[styles.actionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="add-circle" size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.actionText}>Publicar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleViewFavorites}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="heart" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.actionText}>Favoritos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate(ROUTES.MY_PURCHASES)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="bag" size={24} color="#2196F3" />
            </View>
            <Text style={styles.actionText}>Compras</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate(ROUTES.MY_SALES)}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="cash" size={24} color={COLORS.secondary} />
            </View>
            <Text style={styles.actionText}>Ventas</Text>
          </TouchableOpacity>
        </View>

        {/* Environmental Impact */}
        <View style={styles.impactCard}>
          <View style={styles.impactHeader}>
            <Ionicons name="leaf" size={24} color={COLORS.primary} />
            <Text style={styles.impactTitle}>Tu impacto ambiental</Text>
          </View>
          <View style={styles.impactStats}>
            <View style={styles.impactStat}>
              <Text style={styles.impactValue}>
                {(profile?.environmentalImpact?.co2Saved || 0).toFixed(1)} kg
              </Text>
              <Text style={styles.impactLabel}>CO₂ evitado</Text>
            </View>
            <View style={styles.impactStat}>
              <Text style={styles.impactValue}>
                {(profile?.environmentalImpact?.waterSaved || 0).toFixed(0)} L
              </Text>
              <Text style={styles.impactLabel}>Agua ahorrada</Text>
            </View>
            <View style={styles.impactStat}>
              <Text style={styles.impactValue}>
                {profile?.environmentalImpact?.itemsReused || 0}
              </Text>
              <Text style={styles.impactLabel}>Items rescatados</Text>
            </View>
          </View>
          <Text style={styles.impactDescription}>
            Cada producto que reusas ayuda al planeta
          </Text>
        </View>

        {/* My Products */}
        {myProducts?.data && myProducts.data.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mis publicaciones</Text>
              <TouchableOpacity onPress={handleViewAllProducts}>
                <Text style={styles.seeAllText}>Ver todas</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {myProducts.data.slice(0, 5).map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => handleProductPress(product.id)}
                  width={CARD_WIDTH}
                  showSeller={false}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Favorites */}
        {favorites?.data && favorites.data.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Favoritos</Text>
              <TouchableOpacity onPress={handleViewFavorites}>
                <Text style={styles.seeAllText}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {favorites.data.slice(0, 5).map((product: any) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onPress={() => handleProductPress(product.id)}
                  width={CARD_WIDTH}
                />
              ))}
            </ScrollView>
          </View>
        )}
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsButton: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING['2xl'],
  },
  notLoggedIn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  notLoggedInIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  notLoggedInTitle: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  notLoggedInText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  loginButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
  },
  loginButtonText: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.white,
  },
  profileCard: {
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
    marginLeft: SPACING.md,
    gap: 4,
  },
  displayName: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  username: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
  },
  locationText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  ratingValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  ratingCount: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: SPACING.md,
  },
  verifiedText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.primary,
  },
  statsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bio: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: SPACING.base,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionItem: {
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  impactCard: {
    margin: SPACING.base,
    padding: SPACING.md,
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.lg,
  },
  impactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  impactTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.primary,
  },
  impactStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  impactStat: {
    alignItems: 'center',
  },
  impactValue: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.primary,
  },
  impactLabel: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  impactDescription: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontStyle: 'italic',
  },
  section: {
    marginTop: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '500',
    color: COLORS.primary,
  },
  horizontalList: {
    paddingHorizontal: SPACING.base,
    gap: SPACING.md,
  },
});
