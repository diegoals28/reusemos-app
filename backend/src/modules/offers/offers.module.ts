// ============================================
// REUSA - Offers Module
// ============================================

import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { OffersService } from './offers.service';
import { PrismaService } from '../../database/prisma.service';
import { GatewaysModule } from '../../gateways/gateways.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GatewaysModule, NotificationsModule],
  controllers: [OffersController],
  providers: [OffersService, PrismaService],
  exports: [OffersService],
})
export class OffersModule {}
