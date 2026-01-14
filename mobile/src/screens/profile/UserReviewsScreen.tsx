// ============================================
// REUSA - User Reviews Screen
// ============================================

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, FONT_SIZES, RADIUS } from '@/constants';
import { reviewsApi } from '@/services/api';
import { Avatar } from '@/components/common/Avatar';
import { Loading } from '@/components/common/Loading';
import { EmptyState } from '@/components/common/EmptyState';
import { formatRelativeDate } from '@/utils/formatters';

const TAG_LABELS: Record<string, string> = {
  fast_shipping: 'Envío rápido',
  good_communication: 'Buena comunicación',
  as_described: 'Tal como se describe',
  well_packaged: 'Bien embalado',
  friendly: 'Amable',
  punctual: 'Puntual',
};

export default function UserReviewsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const { userId, userName } = route.params;

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['userRatingSummary', userId],
    queryFn: () => reviewsApi.getUserRatingSummary(userId),
  });

  const {
    data: reviewsData,
    isLoading: loadingReviews,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['userReviews', userId],
    queryFn: () => reviewsApi.getUserReviews(userId),
  });

  const handleBack = () => {
    navigation.goBack();
  };

  const renderRatingBar = (stars: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;

    return (
      <View style={styles.ratingBarRow}>
        <Text style={styles.ratingBarStars}>{stars}</Text>
        <Ionicons name="star" size={12} color={COLORS.warning} />
        <View style={styles.ratingBarTrack}>
          <View style={[styles.ratingBarFill, { width: `${percentage}%` }]} />
        </View>
        <Text style={styles.ratingBarCount}>{count}</Text>
      </View>
    );
  };

  const renderReview = ({ item }: { item: any }) => (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar
          source={item.reviewer?.avatarUrl}
          name={item.reviewer?.displayName}
          size="md"
        />
        <View style={styles.reviewerInfo}>
          <Text style={styles.reviewerName}>{item.reviewer?.displayName}</Text>
          <Text style={styles.reviewDate}>
            {formatRelativeDate(item.createdAt)}
          </Text>
        </View>
        <View style={styles.reviewRating}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating ? 'star' : 'star-outline'}
              size={14}
              color={COLORS.warning}
            />
          ))}
        </View>
      </View>

      {item.comment && (
        <Text style={styles.reviewComment}>{item.comment}</Text>
      )}

      {item.tags && item.tags.length > 0 && (
        <View style={styles.reviewTags}>
          {item.tags.map((tag: string) => (
            <View key={tag} style={styles.reviewTag}>
              <Text style={styles.reviewTagText}>
                {TAG_LABELS[tag] || tag}
              </Text>
            </View>
          ))}
        </View>
      )}

      {item.transaction?.product && (
        <TouchableOpacity
          style={styles.productInfo}
          onPress={() => navigation.navigate('ProductDetail', { productId: item.transaction.product.id })}
        >
          <Ionicons name="cube-outline" size={14} color={COLORS.textTertiary} />
          <Text style={styles.productTitle} numberOfLines={1}>
            {item.transaction.product.title}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHeader = () => (
    <View style={styles.summaryContainer}>
      {/* Overall Rating */}
      <View style={styles.overallRating}>
        <Text style={styles.overallScore}>
          {summary?.averageRating?.toFixed(1) || '0.0'}
        </Text>
        <View style={styles.overallStars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= Math.round(summary?.averageRating || 0) ? 'star' : 'star-outline'}
              size={20}
              color={COLORS.warning}
            />
          ))}
        </View>
        <Text style={styles.totalReviews}>
          {summary?.totalReviews || 0} opiniones
        </Text>
      </View>

      {/* Rating Distribution */}
      <View style={styles.ratingDistribution}>
        {[5, 4, 3, 2, 1].map((stars) =>
          renderRatingBar(
            stars,
            summary?.ratingDistribution?.[stars] || 0,
            summary?.totalReviews || 0
          )
        )}
      </View>

      {/* Top Tags */}
      {summary?.topTags && summary.topTags.length > 0 && (
        <View style={styles.topTags}>
          <Text style={styles.topTagsTitle}>Destacado por compradores</Text>
          <View style={styles.topTagsList}>
            {summary.topTags.slice(0, 3).map((item: { tag: string; count: number }) => (
              <View key={item.tag} style={styles.topTag}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                <Text style={styles.topTagText}>
                  {TAG_LABELS[item.tag] || item.tag}
                </Text>
                <Text style={styles.topTagCount}>({item.count})</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.divider} />
      <Text style={styles.reviewsListTitle}>Todas las opiniones</Text>
    </View>
  );

  if (loadingSummary || loadingReviews) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Opiniones de {userName}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={reviewsData?.reviews || []}
        keyExtractor={(item) => item.id}
        renderItem={renderReview}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            icon="chatbubbles-outline"
            title="Sin opiniones"
            description="Este usuario aún no tiene opiniones"
          />
        }
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
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  listContent: {
    padding: SPACING.base,
  },
  summaryContainer: {
    marginBottom: SPACING.lg,
  },
  overallRating: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  overallScore: {
    fontSize: 48,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  overallStars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: SPACING.xs,
  },
  totalReviews: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  ratingDistribution: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  ratingBarStars: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    width: 12,
    textAlign: 'center',
  },
  ratingBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    backgroundColor: COLORS.warning,
    borderRadius: 4,
  },
  ratingBarCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
    width: 24,
    textAlign: 'right',
  },
  topTags: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.success + '10',
    borderRadius: RADIUS.lg,
  },
  topTagsTitle: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.success,
    marginBottom: SPACING.sm,
  },
  topTagsList: {
    gap: SPACING.xs,
  },
  topTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  topTagText: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textPrimary,
  },
  topTagCount: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  reviewsListTitle: {
    fontSize: FONT_SIZES.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewCard: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.lg,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  reviewerName: {
    fontSize: FONT_SIZES.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  reviewDate: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  reviewRating: {
    flexDirection: 'row',
  },
  reviewComment: {
    fontSize: FONT_SIZES.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: SPACING.md,
  },
  reviewTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  reviewTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
  },
  reviewTagText: {
    fontSize: FONT_SIZES.xs,
    color: COLORS.textSecondary,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  productTitle: {
    flex: 1,
    fontSize: FONT_SIZES.xs,
    color: COLORS.textTertiary,
  },
  separator: {
    height: SPACING.sm,
  },
});
