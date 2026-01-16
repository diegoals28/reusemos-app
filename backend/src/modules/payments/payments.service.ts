// ============================================
// REUSA - Payments Service (MercadoPago Integration)
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../../gateways/notifications.gateway';
import { PushService } from '../notifications/push.service';
import { TransactionStatus, PaymentMethod, ProductStatus } from '@prisma/client';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

interface PaymentWebhookData {
  id: string;
  type: string;
  data: {
    id: string;
  };
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly accessToken: string;
  private readonly webhookSecret: string;
  private readonly isProduction: boolean;
  private readonly mpClient: MercadoPagoConfig;
  private readonly preferenceClient: Preference;
  private readonly paymentClient: Payment;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly pushService: PushService,
  ) {
    this.accessToken = this.configService.get<string>('MERCADOPAGO_ACCESS_TOKEN') || '';
    this.webhookSecret = this.configService.get<string>('MERCADOPAGO_WEBHOOK_SECRET') || '';
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';

    // Initialize MercadoPago SDK
    this.mpClient = new MercadoPagoConfig({
      accessToken: this.accessToken,
    });
    this.preferenceClient = new Preference(this.mpClient);
    this.paymentClient = new Payment(this.mpClient);

    this.logger.log(`MercadoPago initialized (${this.isProduction ? 'production' : 'sandbox'})`);
  }

  /**
   * Create a payment preference for MercadoPago
   */
  async createPayment(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: {
        product: true,
        buyer: true,
        seller: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (transaction.paymentMethod !== PaymentMethod.MERCADO_PAGO) {
      throw new BadRequestException('Invalid payment method');
    }

    // Create MercadoPago preference
    const preference = await this.createMercadoPagoPreference({
      items: [
        {
          id: transaction.productId,
          title: transaction.product.title,
          description: `Compra en Reusemos: ${transaction.product.title}`,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: transaction.amount,
        },
      ],
      payer: {
        email: transaction.buyer.email,
        name: transaction.buyer.displayName,
      },
      back_urls: {
        success: `${this.getAppUrl()}/payment/success?transactionId=${transactionId}`,
        failure: `${this.getAppUrl()}/payment/failure?transactionId=${transactionId}`,
        pending: `${this.getAppUrl()}/payment/pending?transactionId=${transactionId}`,
      },
      auto_return: 'approved',
      external_reference: transactionId,
      notification_url: `${this.getApiUrl()}/payments/webhook`,
      statement_descriptor: 'REUSEMOS',
    });

    // Store preference ID in transaction
    await this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        paymentPreferenceId: preference.id,
      },
    });

    return {
      preferenceId: preference.id,
      initPoint: this.isProduction ? preference.init_point : preference.sandbox_init_point,
    };
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(userId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.buyerId !== userId && transaction.sellerId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    if (transaction.paymentId) {
      // Get payment status from MercadoPago
      const payment = await this.getMercadoPagoPayment(transaction.paymentId);
      return {
        status: payment.status,
        statusDetail: payment.status_detail,
        paymentId: transaction.paymentId,
      };
    }

    return {
      status: 'pending',
      statusDetail: 'Waiting for payment',
    };
  }

  /**
   * Handle MercadoPago webhook
   */
  async handleWebhook(data: PaymentWebhookData) {
    if (data.type !== 'payment') {
      return { success: true };
    }

    const paymentId = data.data.id;
    const payment = await this.getMercadoPagoPayment(paymentId);

    if (!payment || !payment.external_reference) {
      return { success: false, message: 'Invalid payment' };
    }

    const transactionId = payment.external_reference;

    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { product: true, buyer: true, seller: true },
    });

    if (!transaction) {
      return { success: false, message: 'Transaction not found' };
    }

    // Update transaction based on payment status
    if (payment.status === 'approved') {
      // Update transaction to PAID
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: TransactionStatus.PAID,
          paymentId,
          paidAt: new Date(),
        },
      });

      // Mark product as SOLD
      await this.prisma.product.update({
        where: { id: transaction.productId },
        data: { status: ProductStatus.SOLD },
      });

      this.logger.log(`Product ${transaction.productId} marked as SOLD`);

      // Update environmental impact for buyer (who is reusing the product)
      const product = transaction.product;
      if (product.impactCO2 || product.impactWater) {
        await this.prisma.user.update({
          where: { id: transaction.buyerId },
          data: {
            impactCO2Saved: { increment: product.impactCO2 || 0 },
            impactWaterSaved: { increment: product.impactWater || 0 },
            impactItemsReused: { increment: 1 },
          },
        });

        // Also update seller's stats (they helped the environment by selling instead of throwing away)
        await this.prisma.user.update({
          where: { id: transaction.sellerId },
          data: {
            impactCO2Saved: { increment: product.impactCO2 || 0 },
            impactWaterSaved: { increment: product.impactWater || 0 },
            impactItemsReused: { increment: 1 },
          },
        });

        this.logger.log(
          `Environmental impact updated: CO2=${product.impactCO2}kg, Water=${product.impactWater}L`,
        );
      }

      // Notify seller via WebSocket
      this.notificationsGateway.emitToUser(transaction.sellerId, 'payment:received', {
        transactionId,
        amount: transaction.amount,
        buyerName: transaction.buyer.displayName,
        productTitle: transaction.product.title,
      });

      // Send push notification to seller
      await this.pushService.sendPurchaseNotification(
        transaction.sellerId,
        transaction.buyer.displayName,
        transaction.product.title,
        transactionId,
        transaction.amount || 0,
      );

      this.logger.log(`Payment approved notification sent to seller ${transaction.sellerId}`);
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          paymentStatus: payment.status,
          paymentStatusDetail: payment.status_detail,
        },
      });
    }

    return { success: true };
  }

  /**
   * Get seller's earnings
   */
  async getEarnings(sellerId: string) {
    const result = await this.prisma.transaction.aggregate({
      where: {
        sellerId,
        status: TransactionStatus.COMPLETED,
      },
      _sum: { amount: true },
      _count: true,
    });

    const pendingResult = await this.prisma.transaction.aggregate({
      where: {
        sellerId,
        status: { in: [TransactionStatus.PAID, TransactionStatus.SHIPPED, TransactionStatus.DELIVERED] },
      },
      _sum: { amount: true },
      _count: true,
    });

    return {
      totalEarnings: result._sum.amount || 0,
      totalSales: result._count,
      pendingEarnings: pendingResult._sum.amount || 0,
      pendingSales: pendingResult._count,
    };
  }

  /**
   * Create MercadoPago preference
   */
  private async createMercadoPagoPreference(preferenceData: any): Promise<{
    id: string;
    init_point: string;
    sandbox_init_point: string;
  }> {
    try {
      this.logger.log('Creating MercadoPago preference...');

      const response = await this.preferenceClient.create({ body: preferenceData });

      this.logger.log(`Preference created: ${response.id}`);

      return {
        id: response.id || '',
        init_point: response.init_point || '',
        sandbox_init_point: response.sandbox_init_point || '',
      };
    } catch (error) {
      this.logger.error('Error creating MercadoPago preference:', error);
      throw new BadRequestException('Failed to create payment preference');
    }
  }

  /**
   * Get MercadoPago payment by ID
   */
  private async getMercadoPagoPayment(paymentId: string): Promise<any> {
    try {
      this.logger.log(`Fetching payment: ${paymentId}`);

      const response = await this.paymentClient.get({ id: paymentId });

      return {
        id: response.id,
        status: response.status,
        status_detail: response.status_detail,
        external_reference: response.external_reference,
        transaction_amount: response.transaction_amount,
        currency_id: response.currency_id,
        payer: response.payer,
        date_approved: response.date_approved,
      };
    } catch (error) {
      this.logger.error(`Error fetching payment ${paymentId}:`, error);
      throw new BadRequestException('Failed to get payment status');
    }
  }

  /**
   * Verify webhook signature from MercadoPago
   */
  verifyWebhookSignature(
    xSignature: string,
    xRequestId: string,
    dataId: string,
  ): boolean {
    if (!this.webhookSecret) {
      this.logger.warn('Webhook secret not configured, skipping signature verification');
      return true;
    }

    try {
      // Parse x-signature header: ts=xxx,v1=xxx
      const parts = xSignature.split(',');
      const tsValue = parts.find(p => p.startsWith('ts='))?.split('=')[1];
      const signatureValue = parts.find(p => p.startsWith('v1='))?.split('=')[1];

      if (!tsValue || !signatureValue) {
        this.logger.warn('Invalid signature format');
        return false;
      }

      // Build the manifest string
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${tsValue};`;

      // Calculate HMAC-SHA256
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(manifest);
      const calculatedSignature = hmac.digest('hex');

      const isValid = calculatedSignature === signatureValue;

      if (!isValid) {
        this.logger.warn('Webhook signature mismatch');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return false;
    }
  }

  private getAppUrl(): string {
    return this.configService.get<string>('APP_URL') || 'reusemos://';
  }

  private getApiUrl(): string {
    return this.configService.get<string>('API_URL') || 'http://localhost:3000';
  }
}
