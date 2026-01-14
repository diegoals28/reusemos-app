// ============================================
// REUSA - Products Service
// ============================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Create Product
  // ============================================

  async create(userId: string, dto: CreateProductDto, imageUrls: string[]) {
    if (imageUrls.length === 0) {
      throw new BadRequestException('At least one image is required');
    }

    // Get user location if not provided
    let location = {};
    if (!dto.city) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { locationLat: true, locationLng: true, city: true, state: true, country: true },
      });
      location = {
        locationLat: user?.locationLat,
        locationLng: user?.locationLng,
        city: user?.city,
        state: user?.state,
        country: user?.country,
      };
    }

    // Get category for impact calculation
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new BadRequestException('Invalid category');
    }

    // Calculate environmental impact
    const estimatedWeight = dto.estimatedWeightKg || category.avgWeightKg;
    const impactCO2 = estimatedWeight * Number(category.co2FactorPerKg);
    const impactWater = estimatedWeight * Number(category.waterFactorPerKg);

    // Create product with images
    const product = await this.prisma.product.create({
      data: {
        sellerId: userId,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        condition: dto.condition,
        price: dto.price,
        acceptsTrade: dto.acceptsTrade || false,
        tradePreferences: dto.tradePreferences,
        deliveryOption: dto.deliveryOption || 'BOTH',
        attributes: dto.attributes,
        estimatedWeightKg: estimatedWeight,
        impactCO2,
        impactWater,
        status: 'ACTIVE',
        publishedAt: new Date(),
        ...location,
        images: {
          create: imageUrls.map((url, index) => ({
            url,
            thumbnailUrl: url.replace('/upload/', '/upload/w_400,h_300,c_fill/'),
            order: index,
          })),
        },
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            ratingAvg: true,
            ratingCount: true,
            city: true,
            country: true,
          },
        },
      },
    });

    return product;
  }

  // ============================================
  // Get Products (with filters)
  // ============================================

  async findAll(filters: ProductFiltersDto, page = 1, limit = 20) {
    const where: any = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    // Category filter
    if (filters.categoryId) {
      where.categoryId = filters.categoryId;
    }

    // Condition filter
    if (filters.condition && filters.condition.length > 0) {
      where.condition = { in: filters.condition };
    }

    // Price range
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) where.price.gte = filters.priceMin;
      if (filters.priceMax !== undefined) where.price.lte = filters.priceMax;
    }

    // Trade filter
    if (filters.acceptsTrade !== undefined) {
      where.acceptsTrade = filters.acceptsTrade;
    }

    // Delivery filter
    if (filters.deliveryOption) {
      where.deliveryOption = { in: [filters.deliveryOption, 'BOTH'] };
    }

    // Location filter (city/country)
    if (filters.city) {
      where.city = filters.city;
    }
    if (filters.country) {
      where.country = filters.country;
    }

    // Sort order
    let orderBy: any = { createdAt: 'desc' };
    switch (filters.sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'recent':
      default:
        orderBy = { createdAt: 'desc' };
    }

    return this.prisma.paginate(
      this.prisma.product,
      {
        where,
        orderBy,
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              ratingAvg: true,
              city: true,
            },
          },
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // Search Products
  // ============================================

  async search(query: string, filters: ProductFiltersDto, page = 1, limit = 20) {
    const where: any = {
      status: 'ACTIVE',
      deletedAt: null,
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ],
    };

    // Apply same filters as findAll
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.acceptsTrade !== undefined) where.acceptsTrade = filters.acceptsTrade;
    if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
      where.price = {};
      if (filters.priceMin !== undefined) where.price.gte = filters.priceMin;
      if (filters.priceMax !== undefined) where.price.lte = filters.priceMax;
    }

    return this.prisma.paginate(
      this.prisma.product,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              ratingAvg: true,
              city: true,
            },
          },
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // Nearby Products
  // ============================================

  async findNearby(lat: number, lng: number, radius = 25, page = 1, limit = 20) {
    // Simple bounding box calculation for nearby products
    // For production, use PostGIS or similar for accurate geospatial queries
    const kmPerDegree = 111; // approximate km per degree of latitude
    const latDelta = radius / kmPerDegree;
    const lngDelta = radius / (kmPerDegree * Math.cos((lat * Math.PI) / 180));

    const where = {
      status: 'ACTIVE' as const,
      deletedAt: null,
      locationLat: {
        gte: lat - latDelta,
        lte: lat + latDelta,
      },
      locationLng: {
        gte: lng - lngDelta,
        lte: lng + lngDelta,
      },
    };

    return this.prisma.paginate(
      this.prisma.product,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              ratingAvg: true,
              city: true,
            },
          },
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // Get Single Product
  // ============================================

  async findOne(id: string, viewerId?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            ratingAvg: true,
            ratingCount: true,
            salesCount: true,
            city: true,
            country: true,
            verificationStatus: true,
            createdAt: true,
            badges: {
              include: { badge: true },
              take: 3,
            },
          },
        },
      },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    // Increment view count
    await this.prisma.product.update({
      where: { id },
      data: { viewsCount: { increment: 1 } },
    });

    // Check if viewer has favorited
    let isFavorite = false;
    if (viewerId) {
      const favorite = await this.prisma.favorite.findUnique({
        where: {
          userId_productId: {
            userId: viewerId,
            productId: id,
          },
        },
      });
      isFavorite = !!favorite;
    }

    return {
      ...product,
      isFavorite,
      seller: {
        ...product.seller,
        badges: product.seller.badges.map((ub: any) => ub.badge),
      },
      impact: {
        co2: product.impactCO2,
        water: product.impactWater,
      },
    };
  }

  // ============================================
  // Update Product
  // ============================================

  async update(id: string, userId: string, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only edit your own products');
    }

    if (product.status === 'SOLD' || product.status === 'TRADED') {
      throw new BadRequestException('Cannot edit sold or traded products');
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: {
        images: { orderBy: { order: 'asc' } },
        category: true,
      },
    });
  }

  // ============================================
  // Delete Product
  // ============================================

  async remove(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own products');
    }

    // Soft delete
    await this.prisma.product.update({
      where: { id },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  // ============================================
  // Favorites
  // ============================================

  async toggleFavorite(productId: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    // Check existing favorite
    const existing = await this.prisma.favorite.findUnique({
      where: {
        userId_productId: { userId, productId },
      },
    });

    if (existing) {
      // Remove favorite
      await this.prisma.favorite.delete({
        where: { id: existing.id },
      });
      return { isFavorite: false };
    } else {
      // Add favorite
      await this.prisma.favorite.create({
        data: { userId, productId },
      });
      return { isFavorite: true };
    }
  }

  async getFavorites(userId: string, page = 1, limit = 20) {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: {
          include: {
            images: { orderBy: { order: 'asc' }, take: 1 },
            category: { select: { id: true, name: true } },
            seller: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                ratingAvg: true,
                city: true,
              },
            },
          },
        },
      },
    });

    const total = await this.prisma.favorite.count({ where: { userId } });

    return {
      data: favorites.map((f) => ({ ...f.product, isFavorite: true })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // My Products
  // ============================================

  async getMyProducts(userId: string, status?: string, page = 1, limit = 20) {
    const where: any = { sellerId: userId, deletedAt: null };

    if (status) {
      where.status = status;
    }

    return this.prisma.paginate(
      this.prisma.product,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: { select: { id: true, name: true } },
          _count: {
            select: {
              favorites: true,
              conversations: true,
            },
          },
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // Recent Products
  // ============================================

  async getRecent(page = 1, limit = 20) {
    return this.prisma.paginate(
      this.prisma.product,
      {
        where: {
          status: 'ACTIVE',
          deletedAt: null,
        },
        orderBy: { publishedAt: 'desc' },
        include: {
          images: { orderBy: { order: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
              ratingAvg: true,
              city: true,
            },
          },
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // Report Product
  // ============================================

  async report(productId: string, userId: string, reason: string, description?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetType: 'product',
        targetProductId: productId,
        reason: reason as any,
        description,
      },
    });

    return { success: true, message: 'Report submitted successfully' };
  }
}
