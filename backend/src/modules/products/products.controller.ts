// ============================================
// REUSA - Products Controller
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';

import { ProductsService } from './products.service';
import { CloudinaryService } from '../uploads/cloudinary.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { OptionalAuthGuard } from '@/common/guards/optional-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';
import { ReportProductDto } from './dto/report-product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // ============================================
  // List & Search
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get products with filters' })
  async findAll(
    @Query() filters: ProductFiltersDto,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.findAll(filters, +page, +limit);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search products' })
  async search(
    @Query('q') query: string,
    @Query() filters: ProductFiltersDto,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.search(query, filters, +page, +limit);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby products' })
  async findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius = 25,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.findNearby(+lat, +lng, +radius, +page, +limit);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent products' })
  async getRecent(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.getRecent(+page, +limit);
  }

  // ============================================
  // Current User Products
  // ============================================

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my products' })
  async getMyProducts(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.getMyProducts(userId, status, +page, +limit);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my favorites' })
  async getFavorites(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.productsService.getFavorites(userId, +page, +limit);
  }

  // ============================================
  // CRUD
  // ============================================

  @Get(':id')
  @UseGuards(OptionalAuthGuard)
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.productsService.findOne(id, userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 8))
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let imageUrls: string[] = [];

    if (files && files.length > 0) {
      const sources = files.map(
        (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
      );
      const tempProductId = `temp_${Date.now()}`;
      const results = await this.cloudinaryService.uploadProductImages(sources, tempProductId);
      imageUrls = results.map((r) => r.secureUrl);
    }

    return this.productsService.create(userId, dto, imageUrls);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.remove(id, userId);
  }

  // ============================================
  // Actions
  // ============================================

  @Post(':id/favorite')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle favorite' })
  async toggleFavorite(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.toggleFavorite(id, userId);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report product' })
  async report(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportProductDto,
  ) {
    return this.productsService.report(id, userId, dto.reason, dto.description);
  }
}
