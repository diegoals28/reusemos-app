// ============================================
// REUSA - Shipping Module
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ShippingController } from './shipping.controller';
import { ShippingService } from './shipping.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [ConfigModule],
  controllers: [ShippingController],
  providers: [ShippingService, PrismaService],
  exports: [ShippingService],
})
export class ShippingModule {}
