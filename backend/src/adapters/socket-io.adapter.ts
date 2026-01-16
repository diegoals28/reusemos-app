// ============================================
// REUSA - Custom Socket.io Adapter with CORS
// ============================================

import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class SocketIoAdapter extends IoAdapter {
  private configService: ConfigService;

  constructor(app: INestApplication) {
    super(app);
    this.configService = app.get(ConfigService);
  }

  createIOServer(port: number, options?: Partial<ServerOptions>): any {
    const corsOrigin = this.configService.get<string>('CORS_ORIGIN', '');
    const allowedOrigins = corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
      : [];

    const corsOptions = {
      origin: allowedOrigins.length > 0 ? allowedOrigins : false,
      methods: ['GET', 'POST'],
      credentials: true,
    };

    const serverOptions: Partial<ServerOptions> = {
      ...options,
      cors: corsOptions,
    };

    return super.createIOServer(port, serverOptions);
  }
}
