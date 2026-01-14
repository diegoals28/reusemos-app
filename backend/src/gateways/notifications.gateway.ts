// ============================================
// REUSA - Notifications WebSocket Gateway
// ============================================

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { NotificationType as NotificationTypeEnum } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  createdAt: Date;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit() {
    this.logger.log('Notifications Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token ||
                    client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.userId = payload.sub;

      // Track user sockets
      if (!this.userSockets.has(payload.sub)) {
        this.userSockets.set(payload.sub, new Set());
      }
      this.userSockets.get(payload.sub)!.add(client.id);

      // Join user's personal room
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client ${client.id} connected to notifications (user ${payload.sub})`);

      // Send unread notifications count
      const unreadCount = await this.prisma.notification.count({
        where: { userId: payload.sub, readAt: null },
      });

      client.emit('notifications:unread_count', { count: unreadCount });

    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.userSockets.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.userSockets.delete(client.userId);
        }
      }
      this.logger.log(`Client ${client.id} disconnected from notifications`);
    }
  }

  // ============================================
  // Notification Methods
  // ============================================

  async sendNotification(userId: string, notification: NotificationPayload) {
    // Save to database
    const saved = await this.prisma.notification.create({
      data: {
        userId,
        type: notification.type as NotificationTypeEnum,
        title: notification.title,
        body: notification.body,
        referenceType: notification.data?.type || null,
        referenceId: notification.data?.conversationId || notification.data?.productId || notification.data?.transactionId || null,
      },
    });

    // Emit via WebSocket
    this.server.to(`user:${userId}`).emit('notification:new', {
      ...notification,
      id: saved.id,
      createdAt: saved.createdAt,
    });

    // Update unread count
    const unreadCount = await this.prisma.notification.count({
      where: { userId, readAt: null },
    });

    this.server.to(`user:${userId}`).emit('notifications:unread_count', {
      count: unreadCount,
    });

    return saved;
  }

  async sendMessageNotification(
    userId: string,
    senderId: string,
    senderName: string,
    message: string,
    conversationId: string,
    productId?: string,
  ) {
    await this.sendNotification(userId, {
      id: '', // Will be set by sendNotification
      type: 'message',
      title: `Nuevo mensaje de ${senderName}`,
      body: message.length > 50 ? `${message.substring(0, 50)}...` : message,
      data: {
        conversationId,
        senderId,
        productId,
      },
      createdAt: new Date(),
    });
  }

  async sendPurchaseNotification(
    sellerId: string,
    buyerName: string,
    productTitle: string,
    transactionId: string,
    productId: string,
  ) {
    await this.sendNotification(sellerId, {
      id: '',
      type: 'purchase',
      title: 'Nueva venta',
      body: `${buyerName} compró "${productTitle}"`,
      data: {
        transactionId,
        productId,
      },
      createdAt: new Date(),
    });
  }

  async sendOfferNotification(
    sellerId: string,
    buyerName: string,
    productTitle: string,
    offerAmount: number,
    conversationId: string,
    productId: string,
  ) {
    await this.sendNotification(sellerId, {
      id: '',
      type: 'offer',
      title: 'Nueva oferta',
      body: `${buyerName} te ofreció $${offerAmount.toLocaleString()} por "${productTitle}"`,
      data: {
        conversationId,
        productId,
        offerAmount,
      },
      createdAt: new Date(),
    });
  }

  async sendTradeProposalNotification(
    sellerId: string,
    buyerName: string,
    productTitle: string,
    offeredProductTitle: string,
    conversationId: string,
    productId: string,
  ) {
    await this.sendNotification(sellerId, {
      id: '',
      type: 'trade_proposal',
      title: 'Propuesta de cambio',
      body: `${buyerName} quiere cambiar "${offeredProductTitle}" por tu "${productTitle}"`,
      data: {
        conversationId,
        productId,
      },
      createdAt: new Date(),
    });
  }

  async sendReviewNotification(
    userId: string,
    reviewerName: string,
    rating: number,
    transactionId: string,
  ) {
    await this.sendNotification(userId, {
      id: '',
      type: 'review',
      title: 'Nueva reseña',
      body: `${reviewerName} te dejó una reseña de ${rating} estrellas`,
      data: {
        transactionId,
        rating,
      },
      createdAt: new Date(),
    });
  }

  async sendFavoriteNotification(
    sellerId: string,
    productTitle: string,
    productId: string,
  ) {
    await this.sendNotification(sellerId, {
      id: '',
      type: 'favorite',
      title: 'Nuevo favorito',
      body: `Alguien guardó "${productTitle}" en favoritos`,
      data: {
        productId,
      },
      createdAt: new Date(),
    });
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Simple emit to user without saving notification
  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Alias for backward compatibility
  emitToUser(userId: string, event: string, data: any) {
    this.sendToUser(userId, event, data);
  }
}
