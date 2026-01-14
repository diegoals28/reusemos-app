// ============================================
// REUSA - App Module
// ============================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Core Modules
import { DatabaseModule } from './database/database.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BadgesModule } from './modules/badges/badges.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { ShippingModule } from './modules/shipping/shipping.module';

// WebSocket Gateways
import { GatewaysModule } from './gateways/gateways.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get('THROTTLE_TTL', 60000),
          limit: config.get('THROTTLE_LIMIT', 100),
        },
      ],
    }),

    // Database
    DatabaseModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    ConversationsModule,
    MessagesModule,
    TransactionsModule,
    ReviewsModule,
    NotificationsModule,
    ReportsModule,
    BadgesModule,
    UploadsModule,
    ShippingModule,

    // WebSocket Gateways
    GatewaysModule,
  ],
})
export class AppModule {}
