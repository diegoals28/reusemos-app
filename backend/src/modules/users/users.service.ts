// ============================================
// REUSA - Users Service
// ============================================

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Find Methods
  // ============================================

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        badges: {
          include: { badge: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({
      where: { username: username.toLowerCase() },
    });
  }

  // ============================================
  // Profile Methods
  // ============================================

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        badges: {
          include: { badge: true },
        },
        _count: {
          select: {
            products: { where: { status: 'ACTIVE' } },
            favorites: true,
            reviewsReceived: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...safeUser } = user;

    return {
      ...safeUser,
      badges: user.badges.map((ub) => ub.badge),
      stats: {
        activeProducts: user._count.products,
        favorites: user._count.favorites,
        reviews: user._count.reviewsReceived,
      },
    };
  }

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, status: 'ACTIVE' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bio: true,
        city: true,
        country: true,
        ratingAvg: true,
        ratingCount: true,
        salesCount: true,
        tradesCount: true,
        impactCO2Saved: true,
        impactWaterSaved: true,
        impactItemsReused: true,
        verificationStatus: true,
        createdAt: true,
        badges: {
          include: { badge: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      badges: user.badges.map((ub) => ub.badge),
      impact: {
        co2Saved: user.impactCO2Saved,
        waterSaved: user.impactWaterSaved,
        itemsReused: user.impactItemsReused,
      },
    };
  }

  // ============================================
  // Update Methods
  // ============================================

  async updateProfile(userId: string, dto: UpdateUserDto) {
    // Check username uniqueness if changing
    if (dto.username) {
      const existing = await this.prisma.user.findFirst({
        where: {
          username: dto.username.toLowerCase(),
          NOT: { id: userId },
        },
      });

      if (existing) {
        throw new ConflictException('Username already taken');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...dto,
        username: dto.username?.toLowerCase(),
      },
      include: {
        badges: {
          include: { badge: true },
        },
      },
    });

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });

    return { avatarUrl: user.avatarUrl };
  }

  async updateLocation(
    userId: string,
    location: {
      lat: number;
      lng: number;
      city?: string;
      state?: string;
      country?: string;
    },
  ) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        locationLat: location.lat,
        locationLng: location.lng,
        city: location.city,
        state: location.state,
        country: location.country,
      },
    });

    return {
      location: {
        lat: user.locationLat,
        lng: user.locationLng,
        city: user.city,
        state: user.state,
        country: user.country,
      },
    };
  }

  async updateInterests(userId: string, interests: string[]) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { interests },
    });

    return { interests: user.interests };
  }

  // ============================================
  // Device Management
  // ============================================

  async registerDevice(
    userId: string,
    deviceToken: string,
    deviceType: 'ios' | 'android',
    deviceModel?: string,
    appVersion?: string,
  ) {
    // Upsert device - update if token exists, create if not
    await this.prisma.userDevice.upsert({
      where: { userId_deviceToken: { userId, deviceToken } },
      update: {
        deviceType,
        deviceModel,
        appVersion,
        isActive: true,
        lastActiveAt: new Date(),
      },
      create: {
        userId,
        deviceToken,
        deviceType,
        deviceModel,
        appVersion,
      },
    });

    return { success: true };
  }

  async removeDevice(userId: string, deviceToken: string) {
    await this.prisma.userDevice.updateMany({
      where: { userId, deviceToken },
      data: { isActive: false },
    });

    return { success: true };
  }

  // ============================================
  // User Products
  // ============================================

  async getUserProducts(userId: string, page = 1, limit = 20, status?: string) {
    const where: any = { userId };

    if (status) {
      where.status = status;
    } else {
      where.status = { in: ['ACTIVE', 'RESERVED', 'SOLD'] };
    }

    return this.prisma.paginate(
      this.prisma.product,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: true,
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // User Reviews
  // ============================================

  async getUserReviews(userId: string, page = 1, limit = 20) {
    return this.prisma.paginate(
      this.prisma.review,
      {
        where: { reviewedId: userId, isPublic: true },
        orderBy: { createdAt: 'desc' },
        include: {
          reviewer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          transaction: {
            include: {
              product: {
                select: { id: true, title: true },
              },
            },
          },
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // Stats & Impact
  // ============================================

  async getUserStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        salesCount: true,
        purchasesCount: true,
        tradesCount: true,
        ratingAvg: true,
        ratingCount: true,
        impactCO2Saved: true,
        impactWaterSaved: true,
        impactItemsReused: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      transactions: {
        sales: user.salesCount,
        purchases: user.purchasesCount,
        trades: user.tradesCount,
        total: user.salesCount + user.purchasesCount + user.tradesCount,
      },
      rating: {
        average: user.ratingAvg,
        count: user.ratingCount,
      },
      impact: {
        co2Saved: user.impactCO2Saved,
        waterSaved: user.impactWaterSaved,
        itemsReused: user.impactItemsReused,
      },
    };
  }

  // ============================================
  // Account Deletion
  // ============================================

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete: mark as deleted instead of hard delete
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
        // Anonymize personal data
        email: `deleted_${userId}@deleted.reusemos.app`,
        username: `deleted_${userId}`,
        displayName: 'Usuario eliminado',
        bio: null,
        avatarUrl: null,
        phoneNumber: null,
        locationLat: null,
        locationLng: null,
        city: null,
        state: null,
        country: null,
      },
    });

    // Deactivate all products
    await this.prisma.product.updateMany({
      where: { sellerId: userId },
      data: { status: 'DELETED' },
    });

    // Deactivate all devices
    await this.prisma.userDevice.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    return { message: 'Account deleted successfully' };
  }
}
