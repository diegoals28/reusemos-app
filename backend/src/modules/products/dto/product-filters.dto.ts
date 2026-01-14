import { IsString, IsNumber, IsBoolean, IsEnum, IsOptional, IsArray, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ProductCondition, DeliveryOption } from './create-product.dto';

export class ProductFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ type: [String], enum: ProductCondition })
  @IsOptional()
  @IsArray()
  @IsEnum(ProductCondition, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',') : value))
  condition?: ProductCondition[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  priceMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  priceMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  acceptsTrade?: boolean;

  @ApiPropertyOptional({ enum: DeliveryOption })
  @IsOptional()
  @IsEnum(DeliveryOption)
  deliveryOption?: DeliveryOption;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ enum: ['recent', 'price_asc', 'price_desc', 'distance'] })
  @IsOptional()
  @IsString()
  sortBy?: 'recent' | 'price_asc' | 'price_desc' | 'distance';
}
