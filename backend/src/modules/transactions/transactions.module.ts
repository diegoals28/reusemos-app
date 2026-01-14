// ============================================
// REUSA - Transactions Module
// ============================================

import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../database/prisma.service';
import { GatewaysModule } from '../../gateways/gateways.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GatewaysModule, NotificationsModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, PrismaService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
