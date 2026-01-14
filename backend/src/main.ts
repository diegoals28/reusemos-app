// ============================================
// Reusemos - Main Entry Point
// ============================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

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

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  console.log(`
    ╔═══════════════════════════════════════════╗
    ║           Reusemos API SERVER                ║
    ╠═══════════════════════════════════════════╣
    ║  Running on: http://localhost:${port}         ║
    ║  Docs:       http://localhost:${port}/docs    ║
    ║  Environment: ${configService.get('NODE_ENV', 'development').padEnd(24)}║
    ╚═══════════════════════════════════════════╝
  `);
}

bootstrap();
