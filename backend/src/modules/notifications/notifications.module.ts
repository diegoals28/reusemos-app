import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PushService } from './push.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  imports: [ConfigModule],
  providers: [PushService, PrismaService],
  exports: [PushService],
})
export class NotificationsModule {}
