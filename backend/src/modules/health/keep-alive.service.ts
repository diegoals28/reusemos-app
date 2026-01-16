// ============================================
// REUSA - Keep Alive Service
// ============================================
// Prevents Railway from putting the server to sleep

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeepAliveService implements OnModuleInit {
  private readonly logger = new Logger(KeepAliveService.name);
  private intervalId: NodeJS.Timeout;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    // Only run in production
    if (this.configService.get('NODE_ENV') !== 'production') {
      return;
    }

    const apiUrl = this.configService.get('API_URL');
    if (!apiUrl) {
      this.logger.warn('API_URL not configured, keep-alive disabled');
      return;
    }

    // Ping every 4 minutes (Railway sleeps after 5 min of inactivity)
    const interval = 4 * 60 * 1000;

    this.intervalId = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}/api/health/live`);
        if (response.ok) {
          this.logger.debug('Keep-alive ping successful');
        }
      } catch (error) {
        this.logger.warn('Keep-alive ping failed');
      }
    }, interval);

    this.logger.log(`Keep-alive service started (interval: ${interval / 1000}s)`);
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
