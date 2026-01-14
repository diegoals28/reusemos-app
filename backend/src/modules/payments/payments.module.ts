// ============================================
// REUSA - Payments Module
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../database/prisma.service';
import { GatewaysModule } from '../../gateways/gateways.module';

@Module({
  imports: [ConfigModule, GatewaysModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
