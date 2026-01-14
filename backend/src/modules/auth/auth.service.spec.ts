import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '../users/users.service';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let usersService: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    authProvider: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    userDevice: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        JWT_EXPIRES_IN: '7d',
        JWT_REFRESH_EXPIRES_IN: '30d',
        GOOGLE_CLIENT_ID: 'mock-google-client-id',
      };
      return config[key] || defaultValue;
    }),
  };

  const mockUsersService = {
    findById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto = {
      email: 'test@example.com',
      username: 'testuser',
      displayName: 'Test User',
      password: 'password123',
    };

    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: 'hashed-password',
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(null); // email check
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null); // username check
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'existing-user' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if username already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null); // email check
      mockPrismaService.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' }); // username check

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        username: 'testuser',
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
        badges: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: 'ACTIVE',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for suspended account', async () => {
      const mockUser = {
        id: 'user-id',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        status: 'SUSPENDED',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', async () => {
      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.generateTokens('user-id');

      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
      });
      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const mockUser = { id: 'user-id', status: 'ACTIVE' };

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshToken('old-refresh-token');

      expect(result).toEqual({
        token: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 'user-id', status: 'DELETED' });

      await expect(service.refreshToken('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should return user for valid token', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-id' });
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.validateToken('valid-token');

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid'));

      await expect(service.validateToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should logout from specific device', async () => {
      mockPrismaService.userDevice.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user-id', 'device-token');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockPrismaService.userDevice.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id', deviceToken: 'device-token' },
        data: { isActive: false },
      });
    });

    it('should logout from all devices', async () => {
      mockPrismaService.userDevice.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.logout('user-id');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(mockPrismaService.userDevice.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        data: { isActive: false },
      });
    });
  });

  describe('forgotPassword', () => {
    it('should create password reset token for existing user', async () => {
      const mockUser = { id: 'user-id', email: 'test@example.com' };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.passwordResetToken.create.mockResolvedValue({ token: 'reset-token' });

      const result = await service.forgotPassword('test@example.com');

      expect(result).toHaveProperty('message');
      expect(mockPrismaService.passwordResetToken.create).toHaveBeenCalled();
    });

    it('should return same message for non-existing user (security)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('nonexistent@example.com');

      expect(result).toHaveProperty('message', 'If the email exists, a reset link will be sent');
      expect(mockPrismaService.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const mockResetToken = {
        id: 'token-id',
        token: 'valid-token',
        userId: 'user-id',
        usedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.resetPassword('valid-token', 'newpassword123');

      expect(result).toEqual({ message: 'Password has been reset successfully' });
    });

    it('should throw BadRequestException for expired token', async () => {
      const mockResetToken = {
        id: 'token-id',
        token: 'expired-token',
        userId: 'user-id',
        usedAt: null,
        expiresAt: new Date(Date.now() - 3600000), // expired
      };

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);

      await expect(service.resetPassword('expired-token', 'newpassword123')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already used token', async () => {
      const mockResetToken = {
        id: 'token-id',
        token: 'used-token',
        userId: 'user-id',
        usedAt: new Date(), // already used
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(mockResetToken);

      await expect(service.resetPassword('used-token', 'newpassword123')).rejects.toThrow(BadRequestException);
    });
  });
});
