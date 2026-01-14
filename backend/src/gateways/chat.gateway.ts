// ============================================
// REUSA - Chat WebSocket Gateway
// ============================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../database/prisma.service';
import { PushService } from '../modules/notifications/push.service';
import { MessageType } from '@prisma/client';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: any;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  private userSockets: Map<string, Set<string>> = new Map();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token ||
                    client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, username: true, displayName: true },
      });

      if (!user) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.user = user;

      // Track user sockets
      if (!this.userSockets.has(user.id)) {
        this.userSockets.set(user.id, new Set());
      }
      this.userSockets.get(user.id)!.add(client.id);

      // Update user online status
      await this.prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeenAt: new Date() },
      });

      // Join user's personal room
      client.join(`user:${user.id}`);

      // Load and join user's conversation rooms
      const conversations = await this.prisma.conversation.findMany({
        where: {
          OR: [{ buyerId: user.id }, { sellerId: user.id }],
        },
        select: { id: true },
      });

      conversations.forEach((conv) => {
        client.join(`conversation:${conv.id}`);
      });

      this.logger.log(`Client ${client.id} connected as user ${user.id}`);

      // Notify others that user is online
      this.server.emit('user:online', { userId: user.id });

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

        // If no more sockets for this user, mark as offline
        if (userSockets.size === 0) {
          this.userSockets.delete(client.userId);

          await this.prisma.user.update({
            where: { id: client.userId },
            data: { isOnline: false, lastSeenAt: new Date() },
          });

          // Notify others that user is offline
          this.server.emit('user:offline', { userId: client.userId });
        }
      }

      this.logger.log(`Client ${client.id} disconnected (user ${client.userId})`);
    }
  }

  // ============================================
  // Message Events
  // ============================================

  @SubscribeMessage('message:send')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; type?: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const { conversationId, content, type = 'text' } = data;

      // Verify user is part of conversation
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: conversationId,
          OR: [{ buyerId: client.userId }, { sellerId: client.userId }],
        },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
        },
      });

      if (!conversation) {
        return { error: 'Conversation not found' };
      }

      // Create message
      const message = await this.prisma.message.create({
        data: {
          conversationId,
          senderId: client.userId,
          content,
          type: MessageType.TEXT,
        },
        include: {
          sender: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
        },
      });

      // Update conversation
      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: new Date(),
        },
      });

      // Emit to conversation room
      this.server.to(`conversation:${conversationId}`).emit('message:new', {
        message,
        conversationId,
      });

      // Send push notification to other participant
      const otherUserId = conversation.buyerId === client.userId
        ? conversation.sellerId
        : conversation.buyerId;

      // Check if user is online - if not, send push notification
      if (!this.userSockets.has(otherUserId)) {
        const senderName = client.user?.displayName || client.user?.username || 'Usuario';
        this.pushService.sendMessageNotification(
          otherUserId,
          senderName,
          content,
          conversationId,
        ).catch(err => this.logger.error(`Push notification failed: ${err.message}`));
      }

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { error: 'Failed to send message' };
    }
  }

  @SubscribeMessage('message:read')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; messageIds?: string[] },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const { conversationId, messageIds } = data;

      // Mark messages as read
      const where: any = {
        conversationId,
        senderId: { not: client.userId },
        readAt: null,
      };

      if (messageIds?.length) {
        where.id = { in: messageIds };
      }

      await this.prisma.message.updateMany({
        where,
        data: { readAt: new Date() },
      });

      // Notify sender that messages were read
      this.server.to(`conversation:${conversationId}`).emit('message:read', {
        conversationId,
        readBy: client.userId,
        readAt: new Date(),
      });

      return { success: true };
    } catch (error) {
      this.logger.error(`Error marking as read: ${error.message}`);
      return { error: 'Failed to mark as read' };
    }
  }

  @SubscribeMessage('typing:start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    this.server.to(`conversation:${data.conversationId}`).emit('typing:start', {
      conversationId: data.conversationId,
      userId: client.userId,
      user: client.user,
    });
  }

  @SubscribeMessage('typing:stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) return;

    this.server.to(`conversation:${data.conversationId}`).emit('typing:stop', {
      conversationId: data.conversationId,
      userId: client.userId,
    });
  }

  // ============================================
  // Conversation Events
  // ============================================

  @SubscribeMessage('conversation:join')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    // Verify user is part of conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: data.conversationId,
        OR: [{ buyerId: client.userId }, { sellerId: client.userId }],
      },
    });

    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    client.join(`conversation:${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('conversation:leave')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { success: true };
  }

  // ============================================
  // Utility Methods
  // ============================================

  // Emit event to specific user
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // Emit event to conversation
  emitToConversation(conversationId: string, event: string, data: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }
}
