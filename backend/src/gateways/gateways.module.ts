// ============================================
// REUSA - Gateways Module
// ============================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ChatGateway } from './chat.gateway';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../database/prisma.service';
import { NotificationsModule } from '../modules/notifications/notifications.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    NotificationsModule,
  ],
  providers: [
    ChatGateway,
    NotificationsGateway,
    PrismaService,
  ],
  exports: [
    ChatGateway,
    NotificationsGateway,
  ],
})
export class GatewaysModule {}
