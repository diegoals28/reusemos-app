import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '@/database/prisma.service';
import { ProductCondition } from './dto/create-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
    },
    favorite: {
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    report: {
      create: jest.fn(),
    },
    paginate: jest.fn(),
  };

  const mockCategory = {
    id: 'category-id',
    name: 'Electronics',
    avgWeightKg: 1.5,
    co2FactorPerKg: 2.5,
    waterFactorPerKg: 100,
  };

  const mockUser = {
    id: 'user-id',
    locationLat: -34.6037,
    locationLng: -58.3816,
    city: 'Buenos Aires',
    state: 'CABA',
    country: 'Argentina',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createDto = {
      title: 'iPhone 12',
      description: 'Great condition iPhone, barely used, comes with original box',
      categoryId: 'category-id',
      condition: ProductCondition.LIKE_NEW,
      price: 500,
      acceptsTrade: true,
    };
    const imageUrls = ['https://cdn.example.com/image1.jpg'];

    it('should create a product successfully', async () => {
      const mockProduct = {
        id: 'product-id',
        ...createDto,
        sellerId: 'user-id',
        images: [{ url: imageUrls[0] }],
        category: mockCategory,
        seller: mockUser,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.product.create.mockResolvedValue(mockProduct);

      const result = await service.create('user-id', createDto, imageUrls);

      expect(result).toHaveProperty('id', 'product-id');
      expect(mockPrismaService.product.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no images provided', async () => {
      await expect(service.create('user-id', createDto, [])).rejects.toThrow(BadRequestException);
      await expect(service.create('user-id', createDto, [])).rejects.toThrow('At least one image is required');
    });

    it('should throw BadRequestException if category is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.category.findUnique.mockResolvedValue(null);

      await expect(service.create('user-id', createDto, imageUrls)).rejects.toThrow(BadRequestException);
      await expect(service.create('user-id', createDto, imageUrls)).rejects.toThrow('Invalid category');
    });

    it('should calculate environmental impact correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.category.findUnique.mockResolvedValue(mockCategory);
      mockPrismaService.product.create.mockImplementation((args) => Promise.resolve(args.data));

      await service.create('user-id', createDto, imageUrls);

      expect(mockPrismaService.product.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            impactCO2: 1.5 * 2.5, // weight * co2Factor
            impactWater: 1.5 * 100, // weight * waterFactor
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return product with viewer favorite status', async () => {
      const mockProduct = {
        id: 'product-id',
        title: 'Test Product',
        impactCO2: 3.75,
        impactWater: 150,
        deletedAt: null,
        seller: {
          id: 'seller-id',
          username: 'seller',
          badges: [{ badge: { id: 'badge-1', name: 'Top Seller' } }],
        },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(mockProduct);
      mockPrismaService.favorite.findUnique.mockResolvedValue({ id: 'fav-id' });

      const result = await service.findOne('product-id', 'viewer-id');

      expect(result).toHaveProperty('isFavorite', true);
      expect(result).toHaveProperty('impact');
      expect(result.impact).toEqual({ co2: 3.75, water: 150 });
    });

    it('should increment view count', async () => {
      const mockProduct = {
        id: 'product-id',
        deletedAt: null,
        seller: { badges: [] },
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue(mockProduct);

      await service.findOne('product-id');

      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { viewsCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if product is deleted', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-id',
        deletedAt: new Date(),
      });

      await expect(service.findOne('product-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateDto = { title: 'Updated Title', price: 450 };

    it('should update product successfully', async () => {
      const mockProduct = {
        id: 'product-id',
        sellerId: 'user-id',
        status: 'ACTIVE',
        deletedAt: null,
      };

      mockPrismaService.product.findUnique.mockResolvedValue(mockProduct);
      mockPrismaService.product.update.mockResolvedValue({ ...mockProduct, ...updateDto });

      const result = await service.update('product-id', 'user-id', updateDto);

      expect(result).toHaveProperty('title', 'Updated Title');
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', 'user-id', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-id',
        sellerId: 'other-user-id',
        deletedAt: null,
      });

      await expect(service.update('product-id', 'user-id', updateDto)).rejects.toThrow(ForbiddenException);
      await expect(service.update('product-id', 'user-id', updateDto)).rejects.toThrow('You can only edit your own products');
    });

    it('should throw BadRequestException if product is sold', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-id',
        sellerId: 'user-id',
        status: 'SOLD',
        deletedAt: null,
      });

      await expect(service.update('product-id', 'user-id', updateDto)).rejects.toThrow(BadRequestException);
      await expect(service.update('product-id', 'user-id', updateDto)).rejects.toThrow('Cannot edit sold or traded products');
    });
  });

  describe('remove', () => {
    it('should soft delete product successfully', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-id',
        sellerId: 'user-id',
      });
      mockPrismaService.product.update.mockResolvedValue({});

      const result = await service.remove('product-id', 'user-id');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: {
          status: 'DELETED',
          deletedAt: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id', 'user-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the seller', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-id',
        sellerId: 'other-user-id',
      });

      await expect(service.remove('product-id', 'user-id')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('toggleFavorite', () => {
    it('should add favorite if not exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-id',
        deletedAt: null,
      });
      mockPrismaService.favorite.findUnique.mockResolvedValue(null);
      mockPrismaService.favorite.create.mockResolvedValue({});

      const result = await service.toggleFavorite('product-id', 'user-id');

      expect(result).toEqual({ isFavorite: true });
      expect(mockPrismaService.favorite.create).toHaveBeenCalled();
    });

    it('should remove favorite if exists', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'product-id',
        deletedAt: null,
      });
      mockPrismaService.favorite.findUnique.mockResolvedValue({ id: 'fav-id' });
      mockPrismaService.favorite.delete.mockResolvedValue({});

      const result = await service.toggleFavorite('product-id', 'user-id');

      expect(result).toEqual({ isFavorite: false });
      expect(mockPrismaService.favorite.delete).toHaveBeenCalledWith({
        where: { id: 'fav-id' },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.toggleFavorite('nonexistent-id', 'user-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFavorites', () => {
    it('should return paginated favorites', async () => {
      const mockFavorites = [
        {
          product: {
            id: 'product-1',
            title: 'Product 1',
            images: [],
            category: {},
            seller: {},
          },
        },
      ];

      mockPrismaService.favorite.findMany.mockResolvedValue(mockFavorites);
      mockPrismaService.favorite.count.mockResolvedValue(1);

      const result = await service.getFavorites('user-id', 1, 20);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data[0]).toHaveProperty('isFavorite', true);
    });
  });

  describe('findAll', () => {
    it('should return paginated products with filters', async () => {
      const mockResult = {
        data: [{ id: 'product-1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockPrismaService.paginate.mockResolvedValue(mockResult);

      const filters = {
        categoryId: 'category-id',
        priceMin: 100,
        priceMax: 500,
        acceptsTrade: true,
      };

      const result = await service.findAll(filters, 1, 20);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.paginate).toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search products by query', async () => {
      const mockResult = {
        data: [{ id: 'product-1', title: 'iPhone 12' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockPrismaService.paginate.mockResolvedValue(mockResult);

      const result = await service.search('iPhone', {}, 1, 20);

      expect(result).toEqual(mockResult);
    });
  });

  describe('findNearby', () => {
    it('should return nearby products within radius', async () => {
      const mockResult = {
        data: [{ id: 'product-1' }],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
      };

      mockPrismaService.paginate.mockResolvedValue(mockResult);

      const result = await service.findNearby(-34.6037, -58.3816, 25, 1, 20);

      expect(result).toEqual(mockResult);
      expect(mockPrismaService.paginate).toHaveBeenCalled();
    });
  });

  describe('report', () => {
    it('should create a product report', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue({ id: 'product-id' });
      mockPrismaService.report.create.mockResolvedValue({});

      const result = await service.report('product-id', 'user-id', 'INAPPROPRIATE', 'Offensive content');

      expect(result).toEqual({ success: true, message: 'Report submitted successfully' });
      expect(mockPrismaService.report.create).toHaveBeenCalledWith({
        data: {
          reporterId: 'user-id',
          targetType: 'product',
          targetProductId: 'product-id',
          reason: 'INAPPROPRIATE',
          description: 'Offensive content',
        },
      });
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.report('nonexistent-id', 'user-id', 'SPAM')).rejects.toThrow(NotFoundException);
    });
  });
});
