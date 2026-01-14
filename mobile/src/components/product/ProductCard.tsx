// ============================================
// REUSA - Product Card Component
// ============================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { Product } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DEFAULT_CARD_WIDTH = (SCREEN_WIDTH - SPACING.base * 3) / 2;

interface ProductCardProps {
  product: Product;
  onPress: () => void;
  onFavoritePress?: () => void;
  width?: number;
  showSeller?: boolean;
}

export function ProductCard({
  product,
  onPress,
  onFavoritePress,
  width = DEFAULT_CARD_WIDTH,
  showSeller = true,
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isFavorited, setIsFavorited] = useState(product.isFavorite || false);

  const handleFavoritePress = () => {
    setIsFavorited(!isFavorited);
    onFavoritePress?.();
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

  const getConditionColor = (condition: string): string => {
    const colors: Record<string, string> = {
      new: COLORS.success,
      like_new: COLORS.primary,
      good: COLORS.secondary,
      fair: COLORS.textSecondary,
    };
    return colors[condition] || COLORS.textSecondary;
  };

  const imageSource = product.images?.[0]?.url
    ? { uri: product.images[0].url }
    : null;

  return (
    <TouchableOpacity
      style={[styles.container, { width }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Image Container */}
      <View style={[styles.imageContainer, { width, height: width * 1.2 }]}>
        {imageSource && !imageError ? (
          <Image
            source={imageSource}
            style={styles.image}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={40} color={COLORS.textTertiary} />
          </View>
        )}

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavorited ? 'heart' : 'heart-outline'}
            size={22}
            color={isFavorited ? COLORS.accent : COLORS.white}
          />
        </TouchableOpacity>

        {/* Condition Badge */}
        <View
          style={[
            styles.conditionBadge,
            { backgroundColor: getConditionColor(product.condition) },
          ]}
        >
          <Text style={styles.conditionText}>
            {getConditionLabel(product.condition)}
          </Text>
        </View>

        {/* Trade Badge */}
        {product.acceptsTrade && (
          <View style={styles.tradeBadge}>
            <Ionicons name="swap-horizontal" size={12} color={COLORS.white} />
            <Text style={styles.tradeText}>Acepta cambios</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Price */}
        <Text style={styles.price} numberOfLines={1}>
          {formatPrice(product.price || 0)}
        </Text>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {product.title}
        </Text>

        {/* Location */}
        {product.location && (
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.textTertiary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {product.location.city}
            </Text>
          </View>
        )}

        {/* Seller Info */}
        {showSeller && product.user && (
          <View style={styles.sellerRow}>
            {product.user.avatarUrl ? (
              <Image
                source={{ uri: product.user.avatarUrl }}
                style={styles.sellerAvatar}
              />
            ) : (
              <View style={styles.sellerAvatarPlaceholder}>
                <Ionicons name="person" size={10} color={COLORS.textTertiary} />
              </View>
            )}
            <Text style={styles.sellerName} numberOfLines={1}>
              {product.user.displayName}
            </Text>
            {(product.user.ratingAvg ?? 0) > 0 && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={10} color={COLORS.warning} />
                <Text style={styles.ratingText}>
                  {(product.user.ratingAvg ?? 0).toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Environmental Impact */}
        {product.impact && (
          <View style={styles.impactRow}>
            <Ionicons name="leaf" size={12} color={COLORS.primary} />
            <Text style={styles.impactText}>
              -{product.impact.co2.toFixed(1)} kg CO₂
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: COLORS.background,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  favoriteButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  conditionBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  conditionText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '600',
    color: COLORS.white,
  },
  tradeBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.secondary,
    gap: 4,
  },
  tradeText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.white,
  },
  content: {
    padding: SPACING.sm,
    gap: 4,
  },
  price: {
    fontSize: FONT_SIZES.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  title: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '500',
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    flex: 1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  sellerAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  sellerAvatarPlaceholder: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerName: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  impactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  impactText: {
    fontSize: FONT_SIZES.xs,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
