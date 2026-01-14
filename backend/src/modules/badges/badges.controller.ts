// ============================================
// REUSA - Badges Controller
// ============================================

import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { BadgesService } from './badges.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('badges')
@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all available badges' })
  async getAllBadges() {
    return this.badgesService.getAllBadges();
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user badges' })
  async getMyBadges(@CurrentUser('id') userId: string) {
    return this.badgesService.getUserBadges(userId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user badges' })
  async getUserBadges(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.badgesService.getUserBadges(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get badge details' })
  async getBadge(@Param('id', ParseUUIDPipe) badgeId: string) {
    return this.badgesService.getBadge(badgeId);
  }

  @Post('check')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check and award new badges for current user' })
  async checkBadges(@CurrentUser('id') userId: string) {
    const newBadges = await this.badgesService.checkAndAwardBadges(userId);
    return {
      newBadges,
      message: newBadges.length > 0
        ? `Congratulations! You earned ${newBadges.length} new badge(s)`
        : 'No new badges earned',
    };
  }

  @Post('seed')
  @ApiOperation({ summary: 'Seed default badges (admin only)' })
  async seedBadges() {
    const seeded = await this.badgesService.seedDefaultBadges();
    return {
      seeded: seeded.length,
      badges: seeded,
    };
  }
}
