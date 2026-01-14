// ============================================
// REUSA - Badges Service
// ============================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';

interface BadgeRequirements {
  minSales?: number;
  minPurchases?: number;
  minTrades?: number;
  minRating?: number;
  minRatingCount?: number;
  minCO2Saved?: number;
  minItemsRescued?: number;
}

// Predefined badge definitions
const BADGE_DEFINITIONS = [
  {
    code: 'first_sale',
    name: 'Primera Venta',
    description: 'Completaste tu primera venta',
    icon: 'trophy',
    color: '#FFD700',
    requirements: { minSales: 1 },
  },
  {
    code: 'first_purchase',
    name: 'Primera Compra',
    description: 'Realizaste tu primera compra',
    icon: 'cart',
    color: '#4CAF50',
    requirements: { minPurchases: 1 },
  },
  {
    code: 'first_trade',
    name: 'Primer Trueque',
    description: 'Completaste tu primer trueque',
    icon: 'swap-horizontal',
    color: '#2196F3',
    requirements: { minTrades: 1 },
  },
  {
    code: 'super_seller',
    name: 'Super Vendedor',
    description: 'Has vendido 10 o mas productos',
    icon: 'star',
    color: '#FF9800',
    requirements: { minSales: 10 },
  },
  {
    code: 'trusted_seller',
    name: 'Vendedor Confiable',
    description: 'Tienes una calificacion promedio de 4.5 o mas',
    icon: 'shield-checkmark',
    color: '#9C27B0',
    requirements: { minRating: 4.5, minRatingCount: 5 },
  },
  {
    code: 'eco_warrior',
    name: 'Guerrero Ecologico',
    description: 'Has rescatado 10 o mas items',
    icon: 'leaf',
    color: '#4CAF50',
    requirements: { minItemsRescued: 10 },
  },
  {
    code: 'climate_hero',
    name: 'Heroe del Clima',
    description: 'Has ahorrado 50kg de CO2',
    icon: 'earth',
    color: '#00BCD4',
    requirements: { minCO2Saved: 50 },
  },
  {
    code: 'active_trader',
    name: 'Trader Activo',
    description: 'Has completado 5 o mas trueques',
    icon: 'repeat',
    color: '#673AB7',
    requirements: { minTrades: 5 },
  },
];

@Injectable()
export class BadgesService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Get Badges
  // ============================================

  async getAllBadges() {
    const badges = await this.prisma.badge.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });

    return badges;
  }

  async getBadge(badgeId: string) {
    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      throw new NotFoundException('Badge not found');
    }

    return badge;
  }

  async getUserBadges(userId: string) {
    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    });

    return userBadges.map((ub) => ({
      ...ub.badge,
      earnedAt: ub.earnedAt,
    }));
  }

  // ============================================
  // Badge Checking & Awarding
  // ============================================

  async checkAndAwardBadges(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        salesCount: true,
        purchasesCount: true,
        tradesCount: true,
        ratingAvg: true,
        ratingCount: true,
        impactCO2Saved: true,
        impactItemsReused: true,
      },
    });

    if (!user) return [];

    // Get all active badges
    const allBadges = await this.prisma.badge.findMany({
      where: { isActive: true },
    });

    // Get user's existing badges
    const existingBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true },
    });
    const existingBadgeIds = new Set(existingBadges.map((b) => b.badgeId));

    const newBadges: string[] = [];

    for (const badge of allBadges) {
      // Skip if user already has this badge
      if (existingBadgeIds.has(badge.id)) continue;

      const requirements = badge.requirements as BadgeRequirements;
      let earned = true;

      // Check each requirement
      if (requirements.minSales !== undefined && user.salesCount < requirements.minSales) {
        earned = false;
      }
      if (requirements.minPurchases !== undefined && user.purchasesCount < requirements.minPurchases) {
        earned = false;
      }
      if (requirements.minTrades !== undefined && user.tradesCount < requirements.minTrades) {
        earned = false;
      }
      if (requirements.minRating !== undefined && user.ratingAvg < requirements.minRating) {
        earned = false;
      }
      if (requirements.minRatingCount !== undefined && user.ratingCount < requirements.minRatingCount) {
        earned = false;
      }
      if (requirements.minCO2Saved !== undefined && user.impactCO2Saved < requirements.minCO2Saved) {
        earned = false;
      }
      if (requirements.minItemsRescued !== undefined && user.impactItemsReused < requirements.minItemsRescued) {
        earned = false;
      }

      if (earned) {
        await this.prisma.userBadge.create({
          data: {
            userId,
            badgeId: badge.id,
          },
        });
        newBadges.push(badge.id);
      }
    }

    // Return newly awarded badges
    if (newBadges.length > 0) {
      return this.prisma.badge.findMany({
        where: { id: { in: newBadges } },
      });
    }

    return [];
  }

  // ============================================
  // Seed Default Badges
  // ============================================

  async seedDefaultBadges() {
    const results = [];

    for (const badge of BADGE_DEFINITIONS) {
      const existing = await this.prisma.badge.findUnique({
        where: { code: badge.code },
      });

      if (!existing) {
        const created = await this.prisma.badge.create({
          data: badge,
        });
        results.push(created);
      }
    }

    return results;
  }

  // ============================================
  // Admin: Create/Update Badge
  // ============================================

  async createBadge(data: {
    code: string;
    name: string;
    description: string;
    icon: string;
    color?: string;
    requirements: BadgeRequirements;
  }) {
    return this.prisma.badge.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        requirements: data.requirements as Prisma.InputJsonValue,
      },
    });
  }

  async updateBadge(
    badgeId: string,
    data: Partial<{
      name: string;
      description: string;
      icon: string;
      color: string;
      requirements: BadgeRequirements;
      isActive: boolean;
    }>,
  ) {
    const updateData: Prisma.BadgeUpdateInput = {
      ...data,
      requirements: data.requirements
        ? (data.requirements as Prisma.InputJsonValue)
        : undefined,
    };

    return this.prisma.badge.update({
      where: { id: badgeId },
      data: updateData,
    });
  }
}
