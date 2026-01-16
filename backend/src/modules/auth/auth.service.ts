// ============================================
// REUSA - Auth Service
// ============================================

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { OAuth2Client } from 'google-auth-library';
import * as jwt from 'jsonwebtoken';

import { PrismaService } from '@/database/prisma.service';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  private googleClient = new OAuth2Client(
    this.configService.get('GOOGLE_CLIENT_ID'),
  );

  // ============================================
  // Registration
  // ============================================

  async register(dto: RegisterDto) {
    // Check if email exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Check if username exists
    const existingUsername = await this.prisma.user.findUnique({
      where: { username: dto.username.toLowerCase() },
    });

    if (existingUsername) {
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username.toLowerCase(),
        displayName: dto.displayName,
        passwordHash,
        emailVerified: false,
      },
    });

    // Create email verification token
    const verificationToken = uuidv4();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email (async, don't wait)
    this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.displayName,
    ).catch(err => console.error('Failed to send verification email:', err));

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      ...tokens,
    };
  }

  // ============================================
  // Login
  // ============================================

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        badges: {
          include: { badge: true },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    // Remove sensitive data
    const { passwordHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      ...tokens,
    };
  }

  // ============================================
  // OAuth Login
  // ============================================

  async validateOAuthLogin(
    provider: string,
    providerId: string,
    email: string,
    displayName?: string,
    avatarUrl?: string,
  ) {
    // Check if OAuth account exists
    let authProvider = await this.prisma.authProvider.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: { user: true },
    });

    let user;

    if (authProvider) {
      // Existing OAuth user
      user = authProvider.user;
    } else {
      // Check if email exists
      user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (user) {
        // Link OAuth to existing account
        await this.prisma.authProvider.create({
          data: {
            userId: user.id,
            provider,
            providerId,
          },
        });
      } else {
        // Create new user
        const username = await this.generateUniqueUsername(email);

        user = await this.prisma.user.create({
          data: {
            email: email.toLowerCase(),
            username,
            displayName: displayName || username,
            avatarUrl,
            emailVerified: true,
            emailVerifiedAt: new Date(),
            authProviders: {
              create: {
                provider,
                providerId,
              },
            },
          },
        });
      }
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id);

    const { passwordHash: _, ...safeUser } = user;

    return {
      user: safeUser,
      ...tokens,
    };
  }

  // ============================================
  // Google OAuth
  // ============================================

  async loginWithGoogle(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.configService.get('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      return this.validateOAuthLogin(
        'google',
        payload.sub,
        payload.email,
        payload.name,
        payload.picture,
      );
    } catch (error) {
      throw new UnauthorizedException('Failed to verify Google token');
    }
  }

  // ============================================
  // Apple OAuth
  // ============================================

  async loginWithApple(
    identityToken: string,
    fullName?: { givenName?: string; familyName?: string },
  ) {
    try {
      // Decode the Apple identity token (JWT)
      const decoded = jwt.decode(identityToken, { complete: true }) as any;
      
      if (!decoded || !decoded.payload) {
        throw new UnauthorizedException('Invalid Apple token');
      }

      const { sub, email } = decoded.payload;
      
      if (!email) {
        throw new UnauthorizedException('Email not provided by Apple');
      }

      const displayName = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
        : undefined;

      return this.validateOAuthLogin(
        'apple',
        sub,
        email,
        displayName,
      );
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Failed to verify Apple token');
    }
  }

  // ============================================
  // Token Management
  // ============================================

  async generateTokens(userId: string) {
    const payload = { sub: userId };

    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { token, refreshToken };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken);
      const userId = payload.sub;

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid token');
      }

      return this.generateTokens(userId);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async validateToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      return this.usersService.findById(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async logout(userId: string, deviceToken?: string) {
    if (deviceToken) {
      // Logout from specific device
      await this.prisma.userDevice.updateMany({
        where: { userId, deviceToken },
        data: { isActive: false },
      });
    } else {
      // Logout from all devices
      await this.prisma.userDevice.updateMany({
        where: { userId },
        data: { isActive: false },
      });
    }

    return { message: 'Logged out successfully' };
  }

  // ============================================
  // Password Reset
  // ============================================

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { message: 'If the email exists, a reset link will be sent' };
    }

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token: resetToken, expiresAt },
    });

    console.log(`Password reset token for ${email}: ${resetToken}`);

    return {
      message: 'If the email exists, a reset link will be sent',
      ...(process.env.NODE_ENV !== 'production' && { token: resetToken }),
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Password has been reset successfully' };
  }

  // ============================================
  // Email Verification
  // ============================================

  async verifyEmail(token: string) {
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      throw new BadRequestException('Invalid verification token');
    }

    if (verificationToken.usedAt) {
      throw new BadRequestException('Token has already been used');
    }

    if (verificationToken.expiresAt < new Date()) {
      throw new BadRequestException('Verification token has expired');
    }

    if (verificationToken.user.emailVerified) {
      return { message: 'Email is already verified' };
    }

    // Update user and mark token as used
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Send welcome email (async)
    this.emailService.sendWelcomeEmail(
      verificationToken.user.email,
      verificationToken.user.displayName,
    ).catch(err => console.error('Failed to send welcome email:', err));

    return { message: 'Email verified successfully' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Invalidate existing tokens
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    // Create new token
    const verificationToken = uuidv4();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.displayName,
    );

    return { message: 'Verification email sent' };
  }

  // ============================================
  // Helpers
  // ============================================

  private async generateUniqueUsername(email: string): Promise<string> {
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let username = baseUsername;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }
}
