// ============================================
// REUSA - Transactions Service
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
import { TransactionStatus, TransactionType, ProductStatus, OfferStatus, DeliveryOption } from '@prisma/client';

export { TransactionStatus };

interface CreateTransactionDto {
  productId: string;
  offerId?: string;
  deliveryMethod: 'pickup' | 'shipping';
  paymentMethod: 'mercadopago' | 'transfer' | 'cash';
  shippingAddress?: string;
  shippingCity?: string;
  shippingPostalCode?: string;
  shippingNotes?: string;
  conversationId?: string;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushService: PushService,
  ) {}

  /**
   * Create a new transaction
   */
  async createTransaction(buyerId: string, dto: CreateTransactionDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.sellerId === buyerId) {
      throw new BadRequestException('Cannot buy your own product');
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw new BadRequestException('Product is not available');
    }

    // Get offer amount if applicable
    let amount = product.price;
    if (dto.offerId) {
      const offer = await this.prisma.offer.findUnique({
        where: { id: dto.offerId },
      });

      if (offer && offer.status === OfferStatus.ACCEPTED) {
        amount = offer.amount || product.price;
      }
    }

    // Create transaction
    const transaction = await this.prisma.transaction.create({
      data: {
        productId: dto.productId,
        buyerId,
        sellerId: product.sellerId,
        offerId: dto.offerId,
        amount,
        deliveryMethod: dto.deliveryMethod,
        deliveryOption: DeliveryOption.BOTH,
        shippingAddress: dto.shippingAddress,
        shippingCity: dto.shippingCity,
        shippingPostalCode: dto.shippingPostalCode,
        shippingNotes: dto.shippingNotes,
        conversationId: dto.conversationId,
        status: TransactionStatus.PENDING,
        type: TransactionType.SALE,
      },
      include: {
        product: true,
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
        seller: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
    });

    // Reserve the product
    await this.prisma.product.update({
      where: { id: dto.productId },
      data: { status: ProductStatus.RESERVED },
    });

    // Notify seller via WebSocket
    this.notificationsGateway.sendToUser(product.sellerId, 'transaction:created', {
      transactionId: transaction.id,
      buyerName: transaction.buyer?.displayName,
      productTitle: product.title,
    });

    // Send push notification to seller
    this.pushService.sendPurchaseNotification(
      product.sellerId,
      transaction.buyer?.displayName || 'Un comprador',
      product.title,
      transaction.id,
      amount || 0,
    ).catch(err => console.error('Push notification failed:', err.message));

    return transaction;
  }

  /**
   * Get transaction by ID
   */
  async getTransactionById(transactionId: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        product: true,
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true, rating: true },
        },
        seller: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            rating: true,
            bankDetails: true,
          },
        },
        offer: true,
        reviews: {
          where: { reviewerId: userId },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new ForbiddenException('Not authorized to view this transaction');
    }

    return transaction;
  }

  /**
   * Get user's purchases
   */
  async getMyPurchases(buyerId: string) {
    return this.prisma.transaction.findMany({
      where: { buyerId },
      include: {
        product: {
          select: { id: true, title: true, images: true },
        },
        seller: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get user's sales
   */
  async getMySales(sellerId: string) {
    return this.prisma.transaction.findMany({
      where: { sellerId },
      include: {
        product: {
          select: { id: true, title: true, images: true },
        },
        buyer: {
          select: { id: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update transaction status
   */
  async updateStatus(userId: string, transactionId: string, status: TransactionStatus) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { product: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // Validate who can update what status
    const isBuyer = transaction.buyerId === userId;
    const isSeller = transaction.sellerId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('Not authorized');
    }

    // Status transition rules
    const validTransitions: Record<string, { from: TransactionStatus[]; by: 'buyer' | 'seller' | 'both' }> = {
      [TransactionStatus.PAID]: { from: [TransactionStatus.PENDING], by: 'seller' },
      [TransactionStatus.SHIPPED]: { from: [TransactionStatus.PAID], by: 'seller' },
      [TransactionStatus.DELIVERED]: { from: [TransactionStatus.SHIPPED, TransactionStatus.PAID], by: 'buyer' },
      [TransactionStatus.COMPLETED]: { from: [TransactionStatus.DELIVERED], by: 'both' },
      [TransactionStatus.CANCELLED]: { from: [TransactionStatus.PENDING, TransactionStatus.PAID], by: 'both' },
    };

    const transition = validTransitions[status];
    if (!transition) {
      throw new BadRequestException('Invalid status');
    }

    if (!transition.from.includes(transaction.status)) {
      throw new BadRequestException(`Cannot transition from ${transaction.status} to ${status}`);
    }

    if (
      (transition.by === 'buyer' && !isBuyer) ||
      (transition.by === 'seller' && !isSeller)
    ) {
      throw new ForbiddenException('You cannot perform this action');
    }

    // Update transaction
    const updatedTransaction = await this.prisma.transaction.update({
      where: { id: transactionId },
      data: { status },
    });

    // Handle side effects
    if (status === TransactionStatus.COMPLETED) {
      // Mark product as sold
      await this.prisma.product.update({
        where: { id: transaction.productId },
        data: { status: ProductStatus.SOLD },
      });

      // Update seller stats
      await this.prisma.user.update({
        where: { id: transaction.sellerId },
        data: { salesCount: { increment: 1 } },
      });

      // Update buyer stats
      await this.prisma.user.update({
        where: { id: transaction.buyerId },
        data: { purchasesCount: { increment: 1 } },
      });

      // Calculate environmental impact
      await this.updateEnvironmentalImpact(
        transaction.buyerId,
        transaction.productId,
      );
    }

    if (status === TransactionStatus.CANCELLED) {
      // Restore product status
      await this.prisma.product.update({
        where: { id: transaction.productId },
        data: { status: ProductStatus.ACTIVE },
      });
    }

    // Notify other party via WebSocket
    const recipientId = isBuyer ? transaction.sellerId : transaction.buyerId;
    this.notificationsGateway.sendToUser(recipientId, 'transaction:updated', {
      transactionId,
      status,
    });

    // Send push notification for status change
    const statusMessages: Record<TransactionStatus, string> = {
      [TransactionStatus.PENDING]: 'Transacción pendiente',
      [TransactionStatus.PAID]: 'Pago confirmado',
      [TransactionStatus.SHIPPED]: 'Producto enviado',
      [TransactionStatus.DELIVERED]: 'Producto entregado',
      [TransactionStatus.COMPLETED]: 'Transacción completada',
      [TransactionStatus.CANCELLED]: 'Transacción cancelada',
      [TransactionStatus.DISPUTED]: 'Disputa abierta',
      [TransactionStatus.REFUNDED]: 'Reembolso procesado',
    };

    this.pushService.sendToUser(recipientId, {
      title: `Actualización de compra`,
      body: `${transaction.product.title}: ${statusMessages[status]}`,
      data: {
        type: 'transaction_update',
        transactionId,
        status,
      },
      channelId: 'transactions',
    }).catch(err => console.error('Push notification failed:', err.message));

    return updatedTransaction;
  }

  /**
   * Update environmental impact
   */
  private async updateEnvironmentalImpact(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) return;

    // Get environmental impact from category
    const co2Saved = product.category?.co2Footprint || 5;
    const waterSaved = product.category?.waterFootprint || 2000;

    // Update user's impact
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totalCo2Saved: { increment: co2Saved },
        totalWaterSaved: { increment: waterSaved },
        itemsRescued: { increment: 1 },
      },
    });
  }

  /**
   * Get transaction stats for user
   */
  async getTransactionStats(userId: string) {
    const [purchases, sales, pendingPurchases, pendingSales] = await Promise.all([
      this.prisma.transaction.count({
        where: { buyerId: userId, status: TransactionStatus.COMPLETED },
      }),
      this.prisma.transaction.count({
        where: { sellerId: userId, status: TransactionStatus.COMPLETED },
      }),
      this.prisma.transaction.count({
        where: {
          buyerId: userId,
          status: { in: [TransactionStatus.PENDING, TransactionStatus.PAID, TransactionStatus.SHIPPED] },
        },
      }),
      this.prisma.transaction.count({
        where: {
          sellerId: userId,
          status: { in: [TransactionStatus.PENDING, TransactionStatus.PAID, TransactionStatus.SHIPPED] },
        },
      }),
    ]);

    return {
      totalPurchases: purchases,
      totalSales: sales,
      pendingPurchases,
      pendingSales,
    };
  }
}
