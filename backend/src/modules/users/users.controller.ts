// ============================================
// REUSA - Users Controller
// ============================================

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { UpdateInterestsDto } from './dto/update-interests.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ============================================
  // Current User Endpoints
  // ============================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update avatar' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const base64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    const result = await this.cloudinaryService.uploadAvatar(base64, userId);

    return this.usersService.updateAvatar(userId, result.secureUrl);
  }

  @Patch('me/location')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update location' })
  async updateLocation(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.usersService.updateLocation(userId, dto);
  }

  @Patch('me/interests')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update interests' })
  async updateInterests(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateInterestsDto,
  ) {
    return this.usersService.updateInterests(userId, dto.interests);
  }

  @Post('me/devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register device for push notifications' })
  async registerDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.usersService.registerDevice(
      userId,
      dto.token,
      dto.deviceType,
      dto.deviceModel,
      dto.appVersion,
    );
  }

  @Get('me/stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user stats' })
  async getMyStats(@CurrentUser('id') userId: string) {
    return this.usersService.getUserStats(userId);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete current user account' })
  async deleteAccount(@CurrentUser('id') userId: string) {
    return this.usersService.deleteAccount(userId);
  }

  // ============================================
  // Public User Endpoints
  // ============================================

  @Get(':id')
  @ApiOperation({ summary: 'Get user public profile' })
  async getUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getPublicProfile(id);
  }

  @Get(':id/products')
  @ApiOperation({ summary: 'Get user products' })
  async getUserProducts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getUserProducts(id, page, limit, 'ACTIVE');
  }

  @Get(':id/reviews')
  @ApiOperation({ summary: 'Get user reviews' })
  async getUserReviews(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.getUserReviews(id, page, limit);
  }
}
