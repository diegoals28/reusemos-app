// ============================================
// REUSA - Transactions Controller
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TransactionsService, TransactionStatus } from './transactions.service';

class CreateTransactionDto {
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

class UpdateStatusDto {
  status: TransactionStatus;
}

@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  async createTransaction(
    @CurrentUser() user: any,
    @Body() dto: CreateTransactionDto,
  ) {
    const transaction = await this.transactionsService.createTransaction(user.id, dto);
    return { success: true, data: transaction };
  }

  @Get('purchases')
  @ApiOperation({ summary: 'Get my purchases' })
  async getMyPurchases(@CurrentUser() user: any) {
    const purchases = await this.transactionsService.getMyPurchases(user.id);
    return { success: true, data: purchases };
  }

  @Get('sales')
  @ApiOperation({ summary: 'Get my sales' })
  async getMySales(@CurrentUser() user: any) {
    const sales = await this.transactionsService.getMySales(user.id);
    return { success: true, data: sales };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction statistics' })
  async getTransactionStats(@CurrentUser() user: any) {
    const stats = await this.transactionsService.getTransactionStats(user.id);
    return { success: true, data: stats };
  }

  @Get(':transactionId')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async getTransactionById(
    @CurrentUser() user: any,
    @Param('transactionId') transactionId: string,
  ) {
    const transaction = await this.transactionsService.getTransactionById(
      transactionId,
      user.id,
    );
    return { success: true, data: transaction };
  }

  @Patch(':transactionId/status')
  @ApiOperation({ summary: 'Update transaction status' })
  async updateStatus(
    @CurrentUser() user: any,
    @Param('transactionId') transactionId: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const transaction = await this.transactionsService.updateStatus(
      user.id,
      transactionId,
      dto.status,
    );
    return { success: true, data: transaction };
  }
}
