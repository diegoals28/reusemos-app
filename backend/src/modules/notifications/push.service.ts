// ============================================
// REUSA - Push Notifications Service (Expo Push)
// ============================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
  badge?: number;
  channelId?: string;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private readonly EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Register a device token for a user (Expo Push Token)
   */
  async registerDevice(userId: string, token: string, platform: 'ios' | 'android'): Promise<void> {
    // Validate Expo push token format
    if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
      this.logger.warn(`Invalid Expo push token format: ${token.substring(0, 20)}...`);
      return;
    }

    await this.prisma.userDevice.upsert({
      where: {
        userId_deviceToken: { userId, deviceToken: token },
      },
      create: {
        userId,
        deviceToken: token,
        token,
        deviceType: platform,
        platform,
        isActive: true,
      },
      update: {
        deviceType: platform,
        platform,
        isActive: true,
        updatedAt: new Date(),
      },
    });

    this.logger.log(`Expo push token registered for user ${userId}`);
  }

  /**
   * Unregister a device token
   */
  async unregisterDevice(userId: string, token: string): Promise<void> {
    await this.prisma.userDevice.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }

  /**
   * Send push notification to a specific user via Expo Push
   */
  async sendToUser(userId: string, payload: PushNotificationPayload): Promise<SendResult[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      return [{ success: false, error: 'No registered devices' }];
    }

    const results: SendResult[] = [];

    // Filter valid Expo tokens
    const validTokens = devices
      .map(d => d.deviceToken)
      .filter(token => token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken['));

    if (validTokens.length === 0) {
      return [{ success: false, error: 'No valid Expo push tokens' }];
    }

    try {
      const messages = validTokens.map(token => ({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data,
        sound: 'default' as const,
        badge: payload.badge,
        channelId: payload.channelId || 'default',
      }));

      const response = await fetch(this.EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const data = await response.json();
      const tickets: ExpoPushTicket[] = data.data || [];

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        if (ticket.status === 'ok') {
          results.push({ success: true, messageId: ticket.id });
        } else {
          results.push({ success: false, error: ticket.message || ticket.details?.error });

          // Handle invalid tokens
          if (ticket.details?.error === 'DeviceNotRegistered') {
            const token = validTokens[i];
            const device = devices.find(d => d.deviceToken === token);
            if (device) {
              await this.prisma.userDevice.update({
                where: { id: device.id },
                data: { isActive: false },
              });
              this.logger.log(`Deactivated invalid token for device ${device.id}`);
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to send Expo push notification:', error.message);
      results.push({ success: false, error: error.message });
    }

    return results;
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(userIds: string[], payload: PushNotificationPayload): Promise<void> {
    for (const userId of userIds) {
      await this.sendToUser(userId, payload);
    }
  }

  /**
   * Send new message notification
   */
  async sendMessageNotification(
    recipientId: string,
    senderName: string,
    message: string,
    conversationId: string,
    productId?: string,
  ): Promise<void> {
    await this.sendToUser(recipientId, {
      title: `Mensaje de ${senderName}`,
      body: message.length > 100 ? `${message.substring(0, 100)}...` : message,
      data: {
        type: 'message',
        conversationId,
        productId: productId || '',
      },
      channelId: 'messages',
    });
  }

  /**
   * Send purchase notification to seller
   */
  async sendPurchaseNotification(
    sellerId: string,
    buyerName: string,
    productTitle: string,
    transactionId: string,
    amount: number,
  ): Promise<void> {
    await this.sendToUser(sellerId, {
      title: '¡Nueva venta!',
      body: `${buyerName} compró "${productTitle}" por $${amount.toLocaleString()}`,
      data: {
        type: 'purchase',
        transactionId,
      },
      channelId: 'transactions',
    });
  }

  /**
   * Send offer notification
   */
  async sendOfferNotification(
    sellerId: string,
    buyerName: string,
    productTitle: string,
    offerAmount: number,
    conversationId: string,
  ): Promise<void> {
    await this.sendToUser(sellerId, {
      title: 'Nueva oferta',
      body: `${buyerName} ofrece $${offerAmount.toLocaleString()} por "${productTitle}"`,
      data: {
        type: 'offer',
        conversationId,
      },
      channelId: 'default',
    });
  }

  /**
   * Send trade proposal notification
   */
  async sendTradeProposalNotification(
    sellerId: string,
    buyerName: string,
    productTitle: string,
    offeredProductTitle: string,
    conversationId: string,
  ): Promise<void> {
    await this.sendToUser(sellerId, {
      title: 'Propuesta de cambio',
      body: `${buyerName} quiere cambiar "${offeredProductTitle}" por tu "${productTitle}"`,
      data: {
        type: 'trade_proposal',
        conversationId,
      },
      channelId: 'default',
    });
  }

  /**
   * Send review notification
   */
  async sendReviewNotification(
    userId: string,
    reviewerName: string,
    rating: number,
  ): Promise<void> {
    const stars = '⭐'.repeat(rating);
    await this.sendToUser(userId, {
      title: 'Nueva reseña',
      body: `${reviewerName} te dejó una reseña ${stars}`,
      data: {
        type: 'review',
        rating: rating.toString(),
      },
      channelId: 'default',
    });
  }

  /**
   * Send price drop notification for favorited items
   */
  async sendPriceDropNotification(
    userId: string,
    productTitle: string,
    oldPrice: number,
    newPrice: number,
    productId: string,
  ): Promise<void> {
    const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
    await this.sendToUser(userId, {
      title: '¡Bajó de precio!',
      body: `"${productTitle}" ahora está ${discount}% más barato`,
      data: {
        type: 'price_drop',
        productId,
      },
      channelId: 'default',
    });
  }
}
