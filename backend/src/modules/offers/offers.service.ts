// ============================================
// REUSA - Offers Service
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../../gateways/notifications.gateway';
import { PushService } from '../notifications/push.service';
import { OfferStatus, OfferType, ProductStatus, TransactionType, TransactionStatus, MessageType, PaymentMethod } from '@prisma/client';

export { OfferStatus, OfferType };

interface CreateOfferDto {
  productId: string;
  conversationId: string;
  type: OfferType;
  amount?: number; // For price offers
  tradeProductIds?: string[]; // For trade offers
  cashDifference?: number; // For mixed offers
  message?: string;
}

interface CounterOfferDto {
  amount?: number;
  tradeProductIds?: string[];
  cashDifference?: number;
  message?: string;
}

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushService: PushService,
  ) {}

  /**
   * Create a new offer
   */
  async createOffer(buyerId: string, dto: CreateOfferDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId === buyerId) {
      throw new BadRequestException('Cannot make offer on your own product');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available');
    }

    // Validate offer type
    if (dto.type === OfferType.PRICE && !dto.amount) {
      throw new BadRequestException('Amount is required for price offers');
    }

    if (dto.type === OfferType.TRADE && (!dto.tradeProductIds || dto.tradeProductIds.length === 0)) {
      throw new BadRequestException('Trade products are required for trade offers');
    }

    if (!product.acceptsTrade && (dto.type === OfferType.TRADE || dto.type === OfferType.MIXED)) {
      throw new BadRequestException('This product does not accept trades');
    }

    // Validate trade products belong to buyer
    if (dto.tradeProductIds?.length) {
      const tradeProducts = await this.prisma.product.findMany({
        where: {
          id: { in: dto.tradeProductIds },
          sellerId: buyerId,
          status: ProductStatus.ACTIVE,
        },
      });

      if (tradeProducts.length !== dto.tradeProductIds.length) {
        throw new BadRequestException('Invalid trade products');
      }
    }

    // Check for existing pending offer
    const existingOffer = await this.prisma.offer.findFirst({
      where: {
        productId: dto.productId,
        buyerId,
        status: OfferStatus.PENDING,
      },
    });

    if (existingOffer) {
      throw new BadRequestException('You already have a pending offer for this product');
    }

    // Create the offer
    const offer = await this.prisma.offer.create({
      data: {
        productId: dto.productId,
        buyerId,
        sellerId: product.sellerId,
        conversationId: dto.conversationId,
        type: dto.type,
        amount: dto.amount,
        tradeProductIds: dto.tradeProductIds || [],
        cashDifference: dto.cashDifference,
        message: dto.message,
        status: OfferStatus.PENDING,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      },
      include: {
        product: true,
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        tradeProducts: true,
      },
    });

    // Create message in conversation
    await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: buyerId,
        type: MessageType.OFFER,
        content: this.formatOfferMessage(offer, product.price || 0),
        metadata: {
          offerId: offer.id,
          offerType: dto.type,
          amount: dto.amount,
        },
      },
    });

    // Send notifications
    const buyer = await this.prisma.user.findUnique({
      where: { id: buyerId },
      select: { displayName: true },
    });

    this.notificationsGateway.sendOfferNotification(
      product.sellerId,
      buyer?.displayName || 'Usuario',
      product.title,
      dto.amount || 0,
      dto.conversationId,
      dto.productId,
    );

    this.pushService.sendOfferNotification(
      product.sellerId,
      buyer?.displayName || 'Usuario',
      product.title,
      dto.amount || 0,
      dto.conversationId,
    );

    return offer;
  }

  /**
   * Accept an offer
   */
  async acceptOffer(sellerId: string, offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: {
        product: true,
        buyer: true,
      },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.sellerId !== sellerId) {
      throw new ForbiddenException('Not authorized to accept this offer');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is no longer pending');
    }

    if (new Date() > offer.expiresAt) {
      await this.prisma.offer.update({
        where: { id: offerId },
        data: { status: OfferStatus.EXPIRED },
      });
      throw new BadRequestException('Offer has expired');
    }

    // Update offer status
    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    // Reject other pending offers for this product
    await this.prisma.offer.updateMany({
      where: {
        productId: offer.productId,
        id: { not: offerId },
        status: OfferStatus.PENDING,
      },
      data: {
        status: OfferStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    // Create message in conversation
    await this.prisma.message.create({
      data: {
        conversationId: offer.conversationId,
        senderId: sellerId,
        type: MessageType.SYSTEM,
        content: '¡Oferta aceptada! Pueden coordinar el pago y entrega.',
        metadata: {
          offerId: offer.id,
          action: 'offer_accepted',
        },
      },
    });

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        productId: offer.productId,
        buyerId: offer.buyerId,
        sellerId: offer.sellerId,
        offerId: offer.id,
        type: offer.type === OfferType.TRADE ? TransactionType.TRADE : TransactionType.SALE,
        amount: offer.amount || offer.product.price,
        status: TransactionStatus.PENDING,
        deliveryOption: 'BOTH',
      },
    });

    // Send notification to buyer via WebSocket
    this.notificationsGateway.sendToUser(offer.buyerId, 'offer:accepted', {
      offerId: offer.id,
      productId: offer.productId,
      transactionId: transaction.id,
    });

    // Send push notification to buyer
    this.pushService.sendToUser(offer.buyerId, {
      title: '¡Oferta aceptada!',
      body: `Tu oferta por "${offer.product.title}" fue aceptada`,
      data: {
        type: 'offer_accepted',
        offerId: offer.id,
        transactionId: transaction.id,
      },
      channelId: 'default',
    }).catch(err => console.error('Push notification failed:', err.message));

    return updatedOffer;
  }

  /**
   * Reject an offer
   */
  async rejectOffer(sellerId: string, offerId: string, reason?: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.sellerId !== sellerId) {
      throw new ForbiddenException('Not authorized to reject this offer');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is no longer pending');
    }

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.REJECTED,
        respondedAt: new Date(),
        rejectionReason: reason,
      },
    });

    // Create message
    await this.prisma.message.create({
      data: {
        conversationId: offer.conversationId,
        senderId: sellerId,
        type: MessageType.SYSTEM,
        content: reason ? `Oferta rechazada: ${reason}` : 'Oferta rechazada',
        metadata: { offerId: offer.id },
      },
    });

    // Notify buyer via WebSocket
    this.notificationsGateway.emitToUser(offer.buyerId, 'offer:rejected', {
      offerId: offer.id,
      reason,
    });

    // Send push notification to buyer
    const product = await this.prisma.product.findUnique({
      where: { id: offer.productId },
      select: { title: true },
    });

    this.pushService.sendToUser(offer.buyerId, {
      title: 'Oferta rechazada',
      body: `Tu oferta por "${product?.title}" fue rechazada${reason ? `: ${reason}` : ''}`,
      data: {
        type: 'offer_rejected',
        offerId: offer.id,
      },
      channelId: 'default',
    }).catch(err => console.error('Push notification failed:', err.message));

    return updatedOffer;
  }

  /**
   * Counter an offer
   */
  async counterOffer(sellerId: string, offerId: string, dto: CounterOfferDto) {
    const originalOffer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { product: true },
    });

    if (!originalOffer) {
      throw new NotFoundException('Offer not found');
    }

    if (originalOffer.sellerId !== sellerId) {
      throw new ForbiddenException('Not authorized to counter this offer');
    }

    if (originalOffer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is no longer pending');
    }

    // Update original offer status
    await this.prisma.offer.update({
      where: { id: offerId },
      data: {
        status: OfferStatus.COUNTERED,
        respondedAt: new Date(),
      },
    });

    // Create counter offer
    const counterOffer = await this.prisma.offer.create({
      data: {
        productId: originalOffer.productId,
        buyerId: originalOffer.buyerId,
        sellerId,
        conversationId: originalOffer.conversationId,
        type: originalOffer.type,
        amount: dto.amount,
        tradeProductIds: dto.tradeProductIds || [],
        cashDifference: dto.cashDifference,
        message: dto.message,
        status: OfferStatus.PENDING,
        parentOfferId: offerId,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
      },
    });

    // Create message
    await this.prisma.message.create({
      data: {
        conversationId: originalOffer.conversationId,
        senderId: sellerId,
        type: MessageType.SYSTEM,
        content: this.formatOfferMessage(counterOffer, originalOffer.product.price || 0),
        metadata: {
          offerId: counterOffer.id,
          originalOfferId: offerId,
          amount: dto.amount,
        },
      },
    });

    // Notify buyer via WebSocket
    this.notificationsGateway.emitToUser(originalOffer.buyerId, 'offer:countered', {
      originalOfferId: offerId,
      counterOfferId: counterOffer.id,
      amount: dto.amount,
    });

    // Send push notification to buyer
    this.pushService.sendToUser(originalOffer.buyerId, {
      title: 'Contraoferta recibida',
      body: dto.amount
        ? `Nueva propuesta de $${dto.amount.toLocaleString()} por "${originalOffer.product.title}"`
        : `Nueva contraoferta por "${originalOffer.product.title}"`,
      data: {
        type: 'offer_countered',
        offerId: counterOffer.id,
        conversationId: originalOffer.conversationId,
      },
      channelId: 'default',
    }).catch(err => console.error('Push notification failed:', err.message));

    return counterOffer;
  }

  /**
   * Cancel an offer (by buyer)
   */
  async cancelOffer(buyerId: string, offerId: string) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
    });

    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    if (offer.buyerId !== buyerId) {
      throw new ForbiddenException('Not authorized to cancel this offer');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestException('Offer is no longer pending');
    }

    const updatedOffer = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: OfferStatus.CANCELLED },
    });

    return updatedOffer;
  }

  /**
   * Get offers for a product
   */
  async getProductOffers(productId: string, sellerId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.sellerId !== sellerId) {
      throw new ForbiddenException('Not authorized');
    }

    return this.prisma.offer.findMany({
      where: { productId },
      include: {
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true, rating: true },
        },
        tradeProducts: {
          select: { id: true, title: true, price: true, images: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's sent offers
   */
  async getUserOffers(buyerId: string) {
    return this.prisma.offer.findMany({
      where: { buyerId },
      include: {
        product: {
          include: {
            seller: {
              select: { id: true, displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's received offers
   */
  async getReceivedOffers(sellerId: string) {
    return this.prisma.offer.findMany({
      where: { sellerId, status: OfferStatus.PENDING },
      include: {
        product: true,
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true, rating: true },
        },
        tradeProducts: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Format offer message for display
   */
  private formatOfferMessage(offer: any, originalPrice: number): string {
    if (offer.type === OfferType.PRICE) {
      const percentage = Math.round((offer.amount / originalPrice) * 100);
      return `💰 Oferta: $${offer.amount.toLocaleString()} (${percentage}% del precio)`;
    }

    if (offer.type === OfferType.TRADE) {
      return `🔄 Propuesta de cambio${offer.message ? `: ${offer.message}` : ''}`;
    }

    if (offer.type === OfferType.MIXED) {
      return `🔄💰 Cambio + $${offer.cashDifference?.toLocaleString() || 0}`;
    }

    return 'Nueva oferta';
  }
}
