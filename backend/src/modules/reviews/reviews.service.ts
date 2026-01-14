// ============================================
// REUSA - Reviews Service
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TransactionStatus, ReportReason } from '@prisma/client';

interface CreateReviewDto {
  transactionId: string;
  reviewedUserId: string;
  rating: number;
  comment?: string;
  tags?: string[];
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a review after a transaction
   */
  async createReview(reviewerId: string, dto: CreateReviewDto) {
    // Verify transaction exists and user is part of it
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: dto.transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Verify user is part of the transaction
    const isParticipant =
      transaction.buyerId === reviewerId || transaction.sellerId === reviewerId;

    if (!isParticipant) {
      throw new ForbiddenException('You are not part of this transaction');
    }

    // Verify transaction is completed
    if (transaction.status !== TransactionStatus.COMPLETED && transaction.status !== TransactionStatus.DELIVERED) {
      throw new BadRequestException('Transaction must be completed to leave a review');
    }

    // Check that user is reviewing the other party
    const expectedReviewedUser =
      transaction.buyerId === reviewerId
        ? transaction.sellerId
        : transaction.buyerId;

    if (dto.reviewedUserId !== expectedReviewedUser) {
      throw new BadRequestException('Invalid reviewed user');
    }

    // Check for existing review
    const existingReview = await this.prisma.review.findFirst({
      where: {
        transactionId: dto.transactionId,
        reviewerId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this transaction');
    }

    // Validate rating
    if (dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    // Create review
    const review = await this.prisma.review.create({
      data: {
        transactionId: dto.transactionId,
        reviewerId,
        reviewedId: dto.reviewedUserId,
        reviewedUserId: dto.reviewedUserId,
        rating: dto.rating,
        comment: dto.comment,
        tags: dto.tags || [],
      },
      include: {
        reviewer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Update user's average rating
    await this.updateUserRating(dto.reviewedUserId);

    // If both parties have reviewed, mark transaction as fully completed
    const otherReview = await this.prisma.review.findFirst({
      where: {
        transactionId: dto.transactionId,
        reviewerId: dto.reviewedUserId,
      },
    });

    if (otherReview) {
      await this.prisma.transaction.update({
        where: { id: dto.transactionId },
        data: { status: TransactionStatus.COMPLETED },
      });
    }

    return review;
  }

  /**
   * Get reviews for a user
   */
  async getUserReviews(userId: string, limit = 20, offset = 0) {
    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { reviewedUserId: userId },
        include: {
          reviewer: {
            select: { id: true, displayName: true, avatarUrl: true },
          },
          transaction: {
            include: {
              product: {
                select: { id: true, title: true, images: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.review.count({
        where: { reviewedUserId: userId },
      }),
    ]);

    return { reviews, total };
  }

  /**
   * Get user's rating summary
   */
  async getUserRatingSummary(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { reviewedUserId: userId },
      select: { rating: true, tags: true },
    });

    if (reviews.length === 0) {
      return {
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        topTags: [],
      };
    }

    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const tagCounts: Record<string, number> = {};
    let totalRating = 0;

    reviews.forEach((review) => {
      totalRating += review.rating;
      ratingDistribution[review.rating as keyof typeof ratingDistribution]++;

      (review.tags as string[]).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const topTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count }));

    return {
      averageRating: totalRating / reviews.length,
      totalReviews: reviews.length,
      ratingDistribution,
      topTags,
    };
  }

  /**
   * Update user's average rating
   */
  private async updateUserRating(userId: string) {
    const result = await this.prisma.review.aggregate({
      where: { reviewedUserId: userId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        rating: result._avg.rating || 0,
        reviewCount: result._count.rating,
      },
    });
  }

  /**
   * Report a review
   */
  async reportReview(userId: string, reviewId: string, reason: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Create report
    await this.prisma.report.create({
      data: {
        targetType: 'review',
        targetId: reviewId,
        reporterId: userId,
        reason: reason as ReportReason,
      },
    });

    return { success: true };
  }

  /**
   * Get my given reviews
   */
  async getMyGivenReviews(userId: string) {
    return this.prisma.review.findMany({
      where: { reviewerId: userId },
      include: {
        reviewed: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        transaction: {
          include: {
            product: {
              select: { id: true, title: true, images: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
