// ============================================
// Reusemos - Product Detail Screen
// ============================================

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  Share,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS, ROUTES } from '@/constants';
import { productsApi, conversationsApi } from '@/services/api';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ProductDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const { productId } = route.params;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isFavorited, setIsFavorited] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => productsApi.getProductById(productId),
  });

  const favoriteMutation = useMutation({
    mutationFn: () => productsApi.toggleFavorite(productId),
    onSuccess: () => {
      setIsFavorited(!isFavorited);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `¡Mira este producto en Reusemos! ${product?.title}`,
        url: `https://Reusemos.app/product/${productId}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleFavorite = () => {
    if (!isAuthenticated) {
      navigation.navigate(ROUTES.LOGIN);
      return;
    }
    favoriteMutation.mutate();
  };

  const handleContact = async () => {
    if (!isAuthenticated) {
      navigation.navigate(ROUTES.LOGIN);
      return;
    }

    try {
      const conversation = await conversationsApi.getOrCreateConversation(productId);
      navigation.navigate(ROUTES.CHAT_DETAIL, {
        conversationId: conversation.id,
      });
    } catch (error) {
      Alert.alert('Error', 'No pudimos iniciar la conversación');
    }
  };

  const handleBuy = () => {
    if (!isAuthenticated) {
      navigation.navigate(ROUTES.LOGIN);
      return;
    }
    navigation.navigate(ROUTES.CHECKOUT, { productId });
  };

  const handleProposeTrade = () => {
    if (!isAuthenticated) {
      navigation.navigate(ROUTES.LOGIN);
      return;
    }
    navigation.navigate(ROUTES.PROPOSE_TRADE, { productId });
  };

  const handleSellerPress = () => {
    navigation.navigate(ROUTES.PUBLIC_PROFILE, {
      userId: product?.user?.id || product?.userId,
    });
  };

  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getConditionLabel = (condition: string): string => {
    const labels: Record<string, string> = {
      new: 'Nuevo',
      like_new: 'Como nuevo',
      good: 'Buen estado',
      fair: 'Aceptable',
    };
    return labels[condition] || condition;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'long',
    });
  };

  if (isLoading || !product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = user?.id === (product.user?.id || product.userId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleFavorite}>
              <Ionicons
                name={isFavorited ? 'heart' : 'heart-outline'}
                size={24}
                color={isFavorited ? COLORS.accent : COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <FlatList
            horizontal
            pagingEnabled
            data={product.images || []}
            keyExtractor={(_, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setCurrentImageIndex(index);
            }}
            renderItem={({ item }) => (
              <Image
                source={{ uri: typeof item === 'string' ? item : item.url }}
                style={styles.productImage}
                resizeMode="cover"
              />
            )}
          />
          {product.images && product.images.length > 1 && (
            <View style={styles.pagination}>
              {product.images.map((_, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === currentImageIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.content}>
          {/* Price & Condition */}
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatPrice(product.price || 0)}</Text>
            <View style={styles.conditionBadge}>
              <Text style={styles.conditionText}>
                {getConditionLabel(product.condition)}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>{product.title}</Text>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{product.viewsCount || 0} vistas</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{product.favoritesCount || 0} favoritos</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statText}>{formatDate(product.createdAt)}</Text>
            </View>
          </View>

          {/* Trade Badge */}
          {product.acceptsTrade && (
            <View style={styles.tradeBanner}>
              <Ionicons name="swap-horizontal" size={20} color={COLORS.secondary} />
              <Text style={styles.tradeBannerText}>
                Este vendedor acepta cambios
              </Text>
            </View>
          )}

          {/* Environmental Impact */}
          {product.impact && (
            <View style={styles.impactCard}>
              <View style={styles.impactHeader}>
                <Ionicons name="leaf" size={20} color={COLORS.primary} />
                <Text style={styles.impactTitle}>Impacto ambiental</Text>
              </View>
              <View style={styles.impactStats}>
                <View style={styles.impactStat}>
                  <Text style={styles.impactValue}>
                    -{product.impact.co2.toFixed(1)} kg
                  </Text>
                  <Text style={styles.impactLabel}>CO₂ evitado</Text>
                </View>
                <View style={styles.impactStat}>
                  <Text style={styles.impactValue}>
                    -{product.impact.water.toFixed(0)} L
                  </Text>
                  <Text style={styles.impactLabel}>Agua ahorrada</Text>
                </View>
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descripción</Text>
            <Text style={styles.description}>{product.description}</Text>
          </View>

          {/* Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Detalles</Text>
            <View style={styles.detailsList}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Categoría</Text>
                <Text style={styles.detailValue}>{product.category?.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Estado</Text>
                <Text style={styles.detailValue}>
                  {getConditionLabel(product.condition)}
                </Text>
              </View>
              {product.brand && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Marca</Text>
                  <Text style={styles.detailValue}>{product.brand}</Text>
                </View>
              )}
              {product.size && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Talla</Text>
                  <Text style={styles.detailValue}>{product.size}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          {product.location && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ubicación</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location" size={20} color={COLORS.primary} />
                <Text style={styles.locationText}>
                  {product.location.city}, {product.location.state}
                </Text>
              </View>
            </View>
          )}

          {/* Seller */}
          <TouchableOpacity style={styles.sellerCard} onPress={handleSellerPress}>
            <View style={styles.sellerInfo}>
              {product.user?.avatarUrl ? (
                <Image
                  source={{ uri: product.user.avatarUrl }}
                  style={styles.sellerAvatar}
                />
              ) : (
                <View style={styles.sellerAvatarPlaceholder}>
                  <Ionicons name="person" size={24} color={COLORS.textTertiary} />
                </View>
              )}
              <View style={styles.sellerDetails}>
                <Text style={styles.sellerName}>{product.user?.displayName}</Text>
                <View style={styles.sellerMeta}>
                  {(product.user?.ratingAvg ?? 0) > 0 && (
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={14} color={COLORS.warning} />
                      <Text style={styles.ratingText}>
                        {(product.user?.ratingAvg ?? 0).toFixed(1)} ({product.user?.ratingCount ?? 0})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Footer Actions */}
      {!isOwner && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <TouchableOpacity style={styles.chatButton} onPress={handleContact}>
            <Ionicons name="chatbubble-outline" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <View style={styles.footerButtons}>
            {product.acceptsTrade && (
              <Button
                title="Proponer cambio"
                onPress={handleProposeTrade}
                variant="secondary"
                style={styles.tradeButton}
              />
            )}
            <Button
              title="Comprar"
              onPress={handleBuy}
              style={styles.buyButton}
            />
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    position: 'relative',
  },
  productImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  pagination: {
    position: 'absolute',
    bottom: SPACING.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  paginationDotActive: {
    backgroundColor: COLORS.white,
  },
  content: {
    padding: SPACING.base,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  price: {
    fontSize: FONT_SIZES['2xl'],
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  conditionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.secondaryLight,
    borderRadius: RADIUS.sm,
  },
  conditionText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.primary,
  },
  title: {
    fontSize: FONT_SIZES.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  tradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#FFF3E0',
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  tradeBannerText: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.secondary,
  },
  impactCard: {
    padding: SPACING.md,
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
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
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  detailsList: {
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: FONT_SIZES.base,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationText: {
    fontSize: FONT_SIZES.base,
    color: COLORS.textPrimary,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  sellerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerDetails: {
    gap: 4,
  },
  sellerName: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sellerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.primary,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  chatButton: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerButtons: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tradeButton: {
    flex: 1,
  },
  buyButton: {
    flex: 1,
  },
});
