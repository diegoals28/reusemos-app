// ============================================
// REUSA - Conversations Service
// ============================================

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { MessageType } from '@prisma/client';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Get Conversations
  // ============================================

  async getConversations(userId: string, page = 1, limit = 20) {
    return this.prisma.paginate(
      this.prisma.conversation,
      {
        where: {
          OR: [{ buyerId: userId }, { sellerId: userId }],
          isActive: true,
        },
        orderBy: { lastMessageAt: 'desc' },
        include: {
          product: {
            select: {
              id: true,
              title: true,
              price: true,
              status: true,
              images: { orderBy: { order: 'asc' }, take: 1 },
            },
          },
          buyer: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isOnline: true,
            },
          },
          seller: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isOnline: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              content: true,
              type: true,
              senderId: true,
              createdAt: true,
              readAt: true,
            },
          },
        },
      },
      page,
      limit,
    );
  }

  // ============================================
  // Get Single Conversation
  // ============================================

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            acceptsTrade: true,
            tradePreferences: true,
            images: { orderBy: { order: 'asc' } },
          },
        },
        buyer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
            ratingAvg: true,
            ratingCount: true,
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Get unread count for the current user
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
    });

    return {
      ...conversation,
      unreadCount,
    };
  }

  // ============================================
  // Create or Get Conversation
  // ============================================

  async getOrCreateConversation(productId: string, buyerId: string) {
    // Get product to find seller
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sellerId: true, status: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId === buyerId) {
      throw new BadRequestException('Cannot create conversation with yourself');
    }

    if (!['ACTIVE', 'RESERVED'].includes(product.status)) {
      throw new BadRequestException('Product is not available');
    }

    // Check if conversation already exists
    const existingConversation = await this.prisma.conversation.findUnique({
      where: {
        productId_buyerId: {
          productId,
          buyerId,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
        buyer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Create new conversation
    const conversation = await this.prisma.conversation.create({
      data: {
        productId,
        buyerId,
        sellerId: product.sellerId,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            price: true,
            status: true,
            images: { orderBy: { order: 'asc' }, take: 1 },
          },
        },
        buyer: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        seller: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return conversation;
  }

  // ============================================
  // Messages
  // ============================================

  async getMessages(conversationId: string, userId: string, page = 1, limit = 50) {
    // Verify user has access to conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return this.prisma.paginate(
      this.prisma.message,
      {
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
      page,
      limit,
    );
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    data: {
      type: MessageType;
      content?: string;
      imageUrl?: string;
      metadata?: any;
    },
  ) {
    // Verify user has access to conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: senderId }, { sellerId: senderId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Create message
    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        type: data.type,
        content: data.content,
        imageUrl: data.imageUrl,
        metadata: data.metadata,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update conversation
    const isBuyer = conversation.buyerId === senderId;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        // Increment unread count for the other user
        ...(isBuyer
          ? { sellerUnreadCount: { increment: 1 } }
          : { buyerUnreadCount: { increment: 1 } }),
      },
    });

    return message;
  }

  async markAsRead(conversationId: string, userId: string) {
    // Verify user has access to conversation
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Mark all messages from other user as read
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    // Reset unread count for current user
    const isBuyer = conversation.buyerId === userId;
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: isBuyer ? { buyerUnreadCount: 0 } : { sellerUnreadCount: 0 },
    });

    return { success: true };
  }

  // ============================================
  // Respond to Offer/Trade
  // ============================================

  async respondToMessage(messageId: string, userId: string, accept: boolean) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: { conversation: true },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is the recipient (not the sender)
    const conversation = message.conversation;
    const isRecipient =
      (conversation.buyerId === userId && message.senderId === conversation.sellerId) ||
      (conversation.sellerId === userId && message.senderId === conversation.buyerId);

    if (!isRecipient) {
      throw new ForbiddenException('Only the recipient can respond to this message');
    }

    // Only allow responding to offers and trade proposals
    if (!['OFFER', 'TRADE_PROPOSAL'].includes(message.type)) {
      throw new BadRequestException('Can only respond to offers and trade proposals');
    }

    // Update message metadata
    const currentMetadata = (message.metadata as any) || {};
    const updatedMetadata = {
      ...currentMetadata,
      status: accept ? 'accepted' : 'rejected',
      respondedAt: new Date().toISOString(),
    };

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: { metadata: updatedMetadata },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updatedMessage;
  }
}
