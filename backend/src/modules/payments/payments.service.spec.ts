import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from '../../gateways/notifications.gateway';
import { PushService } from '../notifications/push.service';
import { TransactionStatus, PaymentMethod } from '@prisma/client';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let notificationsGateway: NotificationsGateway;
  let pushService: PushService;

  const mockPrismaService = {
    transaction: {
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    product: {
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const mockNotificationsGateway = {
    emitToUser: jest.fn(),
  };

  const mockPushService = {
    sendPurchaseNotification: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        MERCADOPAGO_ACCESS_TOKEN: 'test-access-token',
        MERCADOPAGO_WEBHOOK_SECRET: 'test-webhook-secret',
        NODE_ENV: 'test',
        APP_URL: 'reusemos://',
        API_URL: 'http://localhost:3000',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: NotificationsGateway, useValue: mockNotificationsGateway },
        { provide: PushService, useValue: mockPushService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    notificationsGateway = module.get<NotificationsGateway>(NotificationsGateway);
    pushService = module.get<PushService>(PushService);

    jest.clearAllMocks();
  });

  describe('checkPaymentStatus', () => {
    const mockTransaction = {
      id: 'transaction-id',
      buyerId: 'buyer-id',
      sellerId: 'seller-id',
      paymentId: null,
      status: TransactionStatus.PENDING,
    };

    it('should return pending status when no paymentId', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      const result = await service.checkPaymentStatus('buyer-id', 'transaction-id');

      expect(result).toEqual({
        status: 'pending',
        statusDetail: 'Waiting for payment',
      });
    });

    it('should throw NotFoundException for non-existing transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.checkPaymentStatus('buyer-id', 'non-existing-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unauthorized user', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      await expect(
        service.checkPaymentStatus('other-user-id', 'transaction-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleWebhook', () => {
    const mockTransaction = {
      id: 'transaction-id',
      productId: 'product-id',
      buyerId: 'buyer-id',
      sellerId: 'seller-id',
      amount: 10000,
      product: {
        id: 'product-id',
        title: 'Test Product',
        impactCO2: 5.5,
        impactWater: 120,
      },
      buyer: {
        id: 'buyer-id',
        displayName: 'Test Buyer',
        email: 'buyer@test.com',
      },
      seller: {
        id: 'seller-id',
        displayName: 'Test Seller',
        email: 'seller@test.com',
      },
    };

    it('should return success for non-payment webhook types', async () => {
      const result = await service.handleWebhook({
        id: 'webhook-id',
        type: 'merchant_order',
        data: { id: 'order-id' },
      });

      expect(result).toEqual({ success: true });
    });

    it('should process approved payment, mark product as SOLD, update environmental impact, and send notifications', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
      mockPrismaService.transaction.update.mockResolvedValue({
        ...mockTransaction,
        status: TransactionStatus.PAID,
      });
      mockPrismaService.product.update.mockResolvedValue({
        id: 'product-id',
        status: 'SOLD',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      // Mock the private method to return approved payment
      jest.spyOn(service as any, 'getMercadoPagoPayment').mockResolvedValue({
        id: 'payment-id',
        status: 'approved',
        status_detail: 'accredited',
        external_reference: 'transaction-id',
        transaction_amount: 10000,
      });

      const result = await service.handleWebhook({
        id: 'webhook-id',
        type: 'payment',
        data: { id: 'payment-id' },
      });

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'transaction-id' },
        data: expect.objectContaining({
          status: TransactionStatus.PAID,
          paymentId: 'payment-id',
        }),
      });
      // Verify product is marked as SOLD
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'product-id' },
        data: { status: 'SOLD' },
      });
      // Verify environmental impact is updated for buyer
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'buyer-id' },
        data: {
          impactCO2Saved: { increment: 5.5 },
          impactWaterSaved: { increment: 120 },
          impactItemsReused: { increment: 1 },
        },
      });
      // Verify environmental impact is updated for seller
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'seller-id' },
        data: {
          impactCO2Saved: { increment: 5.5 },
          impactWaterSaved: { increment: 120 },
          impactItemsReused: { increment: 1 },
        },
      });
      expect(mockNotificationsGateway.emitToUser).toHaveBeenCalledWith(
        'seller-id',
        'payment:received',
        expect.objectContaining({
          transactionId: 'transaction-id',
          amount: 10000,
        }),
      );
      expect(mockPushService.sendPurchaseNotification).toHaveBeenCalledWith(
        'seller-id',
        'Test Buyer',
        'Test Product',
        'transaction-id',
        10000,
      );
    });

    it('should handle rejected payment', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);
      mockPrismaService.transaction.update.mockResolvedValue(mockTransaction);

      jest.spyOn(service as any, 'getMercadoPagoPayment').mockResolvedValue({
        id: 'payment-id',
        status: 'rejected',
        status_detail: 'cc_rejected_insufficient_amount',
        external_reference: 'transaction-id',
      });

      const result = await service.handleWebhook({
        id: 'webhook-id',
        type: 'payment',
        data: { id: 'payment-id' },
      });

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.transaction.update).toHaveBeenCalledWith({
        where: { id: 'transaction-id' },
        data: {
          paymentStatus: 'rejected',
          paymentStatusDetail: 'cc_rejected_insufficient_amount',
        },
      });
      // Should not send notifications for rejected payments
      expect(mockPushService.sendPurchaseNotification).not.toHaveBeenCalled();
    });

    it('should return error for non-existing transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      jest.spyOn(service as any, 'getMercadoPagoPayment').mockResolvedValue({
        id: 'payment-id',
        status: 'approved',
        external_reference: 'non-existing-id',
      });

      const result = await service.handleWebhook({
        id: 'webhook-id',
        type: 'payment',
        data: { id: 'payment-id' },
      });

      expect(result).toEqual({ success: false, message: 'Transaction not found' });
    });
  });

  describe('getEarnings', () => {
    it('should return seller earnings', async () => {
      mockPrismaService.transaction.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: 50000 },
          _count: 5,
        })
        .mockResolvedValueOnce({
          _sum: { amount: 20000 },
          _count: 2,
        });

      const result = await service.getEarnings('seller-id');

      expect(result).toEqual({
        totalEarnings: 50000,
        totalSales: 5,
        pendingEarnings: 20000,
        pendingSales: 2,
      });
    });

    it('should return zero earnings for new seller', async () => {
      mockPrismaService.transaction.aggregate
        .mockResolvedValueOnce({
          _sum: { amount: null },
          _count: 0,
        })
        .mockResolvedValueOnce({
          _sum: { amount: null },
          _count: 0,
        });

      const result = await service.getEarnings('new-seller-id');

      expect(result).toEqual({
        totalEarnings: 0,
        totalSales: 0,
        pendingEarnings: 0,
        pendingSales: 0,
      });
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should return true when webhook secret is not configured', async () => {
      // Create a new service instance without webhook secret
      const moduleWithoutSecret = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: PrismaService, useValue: mockPrismaService },
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                if (key === 'MERCADOPAGO_WEBHOOK_SECRET') return '';
                if (key === 'MERCADOPAGO_ACCESS_TOKEN') return 'test-token';
                if (key === 'NODE_ENV') return 'test';
                return '';
              },
            },
          },
          { provide: NotificationsGateway, useValue: mockNotificationsGateway },
          { provide: PushService, useValue: mockPushService },
        ],
      }).compile();

      const serviceWithoutSecret = moduleWithoutSecret.get<PaymentsService>(PaymentsService);

      const result = serviceWithoutSecret.verifyWebhookSignature(
        'ts=123,v1=abc',
        'request-id',
        'data-id',
      );

      // When secret is empty, it should skip verification and return true
      expect(result).toBe(true);
    });

    it('should return false for invalid signature format', async () => {
      // Create service with webhook secret configured
      const moduleWithSecret = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: PrismaService, useValue: mockPrismaService },
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                if (key === 'MERCADOPAGO_WEBHOOK_SECRET') return 'test-secret';
                if (key === 'MERCADOPAGO_ACCESS_TOKEN') return 'test-token';
                if (key === 'NODE_ENV') return 'test';
                return '';
              },
            },
          },
          { provide: NotificationsGateway, useValue: mockNotificationsGateway },
          { provide: PushService, useValue: mockPushService },
        ],
      }).compile();

      const serviceWithSecret = moduleWithSecret.get<PaymentsService>(PaymentsService);

      const result = serviceWithSecret.verifyWebhookSignature(
        'invalid-format',
        'request-id',
        'data-id',
      );

      expect(result).toBe(false);
    });

    it('should return false for mismatched signature', async () => {
      // Create service with webhook secret configured
      const moduleWithSecret = await Test.createTestingModule({
        providers: [
          PaymentsService,
          { provide: PrismaService, useValue: mockPrismaService },
          {
            provide: ConfigService,
            useValue: {
              get: (key: string) => {
                if (key === 'MERCADOPAGO_WEBHOOK_SECRET') return 'test-secret';
                if (key === 'MERCADOPAGO_ACCESS_TOKEN') return 'test-token';
                if (key === 'NODE_ENV') return 'test';
                return '';
              },
            },
          },
          { provide: NotificationsGateway, useValue: mockNotificationsGateway },
          { provide: PushService, useValue: mockPushService },
        ],
      }).compile();

      const serviceWithSecret = moduleWithSecret.get<PaymentsService>(PaymentsService);

      const result = serviceWithSecret.verifyWebhookSignature(
        'ts=1234567890,v1=wrong-signature',
        'request-id',
        'data-id',
      );

      expect(result).toBe(false);
    });
  });

  describe('createPayment', () => {
    const mockTransaction = {
      id: 'transaction-id',
      productId: 'product-id',
      buyerId: 'buyer-id',
      sellerId: 'seller-id',
      amount: 10000,
      paymentMethod: PaymentMethod.MERCADO_PAGO,
      product: {
        id: 'product-id',
        title: 'Test Product',
      },
      buyer: {
        id: 'buyer-id',
        displayName: 'Test Buyer',
        email: 'buyer@test.com',
      },
      seller: {
        id: 'seller-id',
        displayName: 'Test Seller',
      },
    };

    it('should throw NotFoundException for non-existing transaction', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment('buyer-id', 'non-existing-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unauthorized user', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue(mockTransaction);

      await expect(
        service.createPayment('other-user-id', 'transaction-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid payment method', async () => {
      mockPrismaService.transaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        paymentMethod: PaymentMethod.CASH_IN_PERSON,
      });

      await expect(
        service.createPayment('buyer-id', 'transaction-id'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
