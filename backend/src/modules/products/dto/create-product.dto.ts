// ============================================
// REUSA - Create Product DTO
// ============================================

import {
  IsString,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsUUID,
  IsObject,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum ProductCondition {
  NEW_WITH_TAGS = 'NEW_WITH_TAGS',
  LIKE_NEW = 'LIKE_NEW',
  GOOD = 'GOOD',
  ACCEPTABLE = 'ACCEPTABLE',
}

export enum DeliveryOption {
  PICKUP = 'PICKUP',
  SHIPPING = 'SHIPPING',
  BOTH = 'BOTH',
}

export class CreateProductDto {
  @ApiProperty({ example: 'Campera de cuero vintage' })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title: string;

  @ApiProperty({ example: 'Campera de cuero real, en excelente estado...' })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ example: 'uuid-categoria' })
  @IsUUID()
  categoryId: string;

  @ApiProperty({ enum: ProductCondition })
  @IsEnum(ProductCondition)
  condition: ProductCondition;

  @ApiPropertyOptional({ example: 2500 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000000)
  @Transform(({ value }) => (value ? Number(value) : undefined))
  price?: number;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  acceptsTrade?: boolean;

  @ApiPropertyOptional({ example: 'Ropa talle M, zapatillas 38' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  tradePreferences?: string;

  @ApiPropertyOptional({ enum: DeliveryOption, default: 'BOTH' })
  @IsOptional()
  @IsEnum(DeliveryOption)
  deliveryOption?: DeliveryOption;

  @ApiPropertyOptional({ example: { size: 'M', color: 'Negro', brand: 'Zara' } })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, string>;

  @ApiPropertyOptional({ example: 0.5 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Max(1000)
  @Transform(({ value }) => (value ? Number(value) : undefined))
  estimatedWeightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;
}
