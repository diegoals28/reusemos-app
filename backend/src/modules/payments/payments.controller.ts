// ============================================
// REUSA - Payments Controller
// ============================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a MercadoPago payment preference' })
  async createPayment(
    @CurrentUser() user: any,
    @Param('transactionId') transactionId: string,
  ) {
    const result = await this.paymentsService.createPayment(user.id, transactionId);
    return { success: true, data: result };
  }

  @Get('status/:transactionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check payment status' })
  async checkPaymentStatus(
    @CurrentUser() user: any,
    @Param('transactionId') transactionId: string,
  ) {
    const status = await this.paymentsService.checkPaymentStatus(user.id, transactionId);
    return { success: true, data: status };
  }

  @Get('earnings')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller earnings' })
  async getEarnings(@CurrentUser() user: any) {
    const earnings = await this.paymentsService.getEarnings(user.id);
    return { success: true, data: earnings };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'MercadoPago webhook handler' })
  async handleWebhook(
    @Body() data: any,
    @Headers('x-signature') signature: string,
    @Headers('x-request-id') requestId: string,
  ) {
    this.logger.log(`Webhook received: type=${data?.type}, id=${data?.data?.id}`);

    // Verify webhook signature if headers are present
    if (signature && requestId && data?.data?.id) {
      const isValid = this.paymentsService.verifyWebhookSignature(
        signature,
        requestId,
        data.data.id,
      );

      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    const result = await this.paymentsService.handleWebhook(data);
    this.logger.log(`Webhook processed: ${JSON.stringify(result)}`);
    return result;
  }
}
