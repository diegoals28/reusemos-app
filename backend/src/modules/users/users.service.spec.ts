import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@/database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    userDevice: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
    product: {
      updateMany: jest.fn(),
    },
    favorite: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    paginate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return user without passwordHash', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'secret-hash',
        badges: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById('user-id');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', 'user-id');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent-id')).rejects.toThrow('User not found');
    });
  });

  describe('findByEmail', () => {
    it('should return user by email (lowercase)', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail('TEST@EXAMPLE.COM');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('findByUsername', () => {
    it('should return user by username (lowercase)', async () => {
      const mockUser = { id: 'user-id', username: 'testuser' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByUsername('TestUser');

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
      expect(result).toEqual(mockUser);
    });
  });

  describe('getProfile', () => {
    it('should return user profile with stats and badges', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'secret',
        badges: [{ badge: { id: 'badge-1', name: 'First Sale' } }],
        _count: {
          products: 5,
          favorites: 10,
          reviewsReceived: 3,
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile('user-id');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('badges');
      expect(result.badges).toEqual([{ id: 'badge-1', name: 'First Sale' }]);
      expect(result).toHaveProperty('stats');
      expect(result.stats).toEqual({
        activeProducts: 5,
        favorites: 10,
        reviews: 3,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPublicProfile', () => {
    it('should return public profile with impact data', async () => {
      const mockUser = {
        id: 'user-id',
        username: 'testuser',
        displayName: 'Test User',
        impactCO2Saved: 100,
        impactWaterSaved: 500,
        impactItemsReused: 10,
        badges: [{ badge: { id: 'badge-1', name: 'Eco Warrior' } }],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getPublicProfile('user-id');

      expect(result).toHaveProperty('impact');
      expect(result.impact).toEqual({
        co2Saved: 100,
        waterSaved: 500,
        itemsReused: 10,
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getPublicProfile('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateDto = { displayName: 'New Name', bio: 'New bio' };
      const mockUpdatedUser = {
        id: 'user-id',
        displayName: 'New Name',
        bio: 'New bio',
        passwordHash: 'secret',
        badges: [],
      };

      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.updateProfile('user-id', updateDto);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('displayName', 'New Name');
    });

    it('should throw ConflictException if username is taken', async () => {
      const updateDto = { username: 'existinguser' };

      mockPrismaService.user.findFirst.mockResolvedValue({ id: 'other-user-id' });

      await expect(service.updateProfile('user-id', updateDto)).rejects.toThrow(ConflictException);
      await expect(service.updateProfile('user-id', updateDto)).rejects.toThrow('Username already taken');
    });

    it('should allow updating to same username (own username)', async () => {
      const updateDto = { username: 'myusername' };
      const mockUpdatedUser = {
        id: 'user-id',
        username: 'myusername',
        passwordHash: 'secret',
        badges: [],
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.updateProfile('user-id', updateDto);

      expect(result).toHaveProperty('username', 'myusername');
    });
  });

  describe('updateAvatar', () => {
    it('should update user avatar', async () => {
      mockPrismaService.user.update.mockResolvedValue({ avatarUrl: 'https://cdn.example.com/avatar.jpg' });

      const result = await service.updateAvatar('user-id', 'https://cdn.example.com/avatar.jpg');

      expect(result).toEqual({ avatarUrl: 'https://cdn.example.com/avatar.jpg' });
    });
  });

  describe('updateLocation', () => {
    it('should update user location', async () => {
      const location = {
        lat: -34.6037,
        lng: -58.3816,
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
      };

      mockPrismaService.user.update.mockResolvedValue({
        locationLat: -34.6037,
        locationLng: -58.3816,
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
      });

      const result = await service.updateLocation('user-id', location);

      expect(result.location).toEqual({
        lat: -34.6037,
        lng: -58.3816,
        city: 'Buenos Aires',
        state: 'CABA',
        country: 'Argentina',
      });
    });
  });

  describe('updateInterests', () => {
    it('should update user interests', async () => {
      const interests = ['electronics', 'fashion', 'sports'];
      mockPrismaService.user.update.mockResolvedValue({ interests });

      const result = await service.updateInterests('user-id', interests);

      expect(result).toEqual({ interests });
    });
  });

  describe('registerDevice', () => {
    it('should register a new device', async () => {
      mockPrismaService.userDevice.upsert.mockResolvedValue({
        userId: 'user-id',
        deviceToken: 'token-123',
        deviceType: 'ios',
      });

      const result = await service.registerDevice('user-id', 'token-123', 'ios', 'iPhone 15', '1.0.0');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.userDevice.upsert).toHaveBeenCalled();
    });
  });

  describe('removeDevice', () => {
    it('should deactivate device', async () => {
      mockPrismaService.userDevice.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.removeDevice('user-id', 'token-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.userDevice.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', deviceToken: 'token-123' },
        data: { isActive: false },
      });
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const mockUser = {
        salesCount: 10,
        purchasesCount: 5,
        tradesCount: 3,
        ratingAvg: 4.5,
        ratingCount: 15,
        impactCO2Saved: 200,
        impactWaterSaved: 1000,
        impactItemsReused: 18,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserStats('user-id');

      expect(result).toEqual({
        transactions: {
          sales: 10,
          purchases: 5,
          trades: 3,
          total: 18,
        },
        rating: {
          average: 4.5,
          count: 15,
        },
        impact: {
          co2Saved: 200,
          waterSaved: 1000,
          itemsReused: 18,
        },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserStats('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete user account and anonymize data', async () => {
      const mockUser = { id: 'user-id' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.product.updateMany.mockResolvedValue({ count: 5 });
      mockPrismaService.userDevice.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteAccount('user-id');

      expect(result).toEqual({ message: 'Account deleted successfully' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: expect.objectContaining({
          status: 'DELETED',
          email: expect.stringContaining('deleted_'),
          username: expect.stringContaining('deleted_'),
          displayName: 'Usuario eliminado',
        }),
      });
      expect(mockPrismaService.product.updateMany).toHaveBeenCalled();
      expect(mockPrismaService.userDevice.updateMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteAccount('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
