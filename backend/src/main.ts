// ============================================
// Reusemos - Main Entry Point
// ============================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { SocketIoAdapter } from './adapters/socket-io.adapter';
import { GlobalExceptionFilter } from './filters/http-exception.filter';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());

  // CORS configuration - parse comma-separated origins
  const corsOrigin = configService.get('CORS_ORIGIN', '');
  const allowedOrigins = corsOrigin
    ? corsOrigin.split(',').map((o: string) => o.trim()).filter(Boolean)
    : [];

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // WebSocket adapter with CORS
  app.useWebSocketAdapter(new SocketIoAdapter(app));

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  // Global prefix
  app.setGlobalPrefix('api');

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger Documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Reusemos API')
      .setDescription('API documentation for Reusemos marketplace')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('products', 'Product management')
      .addTag('categories', 'Categories')
      .addTag('conversations', 'Chat and messaging')
      .addTag('transactions', 'Purchases and trades')
      .addTag('reviews', 'User reviews')
      .addTag('notifications', 'Push notifications')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  // Enable shutdown hooks
  app.enableShutdownHooks();

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  logger.log(`
    ╔═══════════════════════════════════════════╗
    ║           Reusemos API SERVER                ║
    ╠═══════════════════════════════════════════╣
    ║  Running on: http://localhost:${port}         ║
    ║  Docs:       http://localhost:${port}/docs    ║
    ║  Environment: ${configService.get('NODE_ENV', 'development').padEnd(24)}║
    ╚═══════════════════════════════════════════╝
  `);

  // Graceful shutdown handlers
  const shutdown = async (signal: string) => {
    logger.warn(`Received ${signal}, starting graceful shutdown...`);
    try {
      await app.close();
      logger.log('Application closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start application', error);
  process.exit(1);
});
