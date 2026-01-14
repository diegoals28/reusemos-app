// ============================================
// REUSA - Shipping Controller
// ============================================

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequestShippingLabelDto } from './dto/chilexpress.dto';

@ApiTags('Shipping')
@Controller('shipping')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  /**
   * Generate shipping label for a transaction
   * POST /shipping/label
   */
  @Post('label')
  @ApiOperation({ summary: 'Generate shipping label' })
  async generateLabel(@CurrentUser() user: any, @Body() dto: RequestShippingLabelDto) {
    return this.shippingService.generateShippingLabel(user.id, dto);
  }

  /**
   * Get shipping label for a transaction
   * GET /shipping/label/:transactionId
   */
  @Get('label/:transactionId')
  @ApiOperation({ summary: 'Get shipping label for a transaction' })
  async getLabel(@CurrentUser() user: any, @Param('transactionId') transactionId: string) {
    return this.shippingService.getShippingLabel(user.id, transactionId);
  }

  /**
   * Get coverage areas (comunas)
   * GET /shipping/coverage?regionCode=RM
   */
  @Get('coverage')
  async getCoverageAreas(@Query('regionCode') regionCode?: string) {
    return this.shippingService.getCoverageAreas(regionCode);
  }

  /**
   * Calculate shipping quote
   * POST /shipping/quote
   */
  @Post('quote')
  async calculateQuote(
    @Body()
    body: {
      originCountyCode: string;
      destinationCountyCode: string;
      weight: number;
      height: number;
      width: number;
      length: number;
    },
  ) {
    return this.shippingService.calculateShippingQuote(
      body.originCountyCode,
      body.destinationCountyCode,
      body.weight,
      body.height,
      body.width,
      body.length,
    );
  }

  /**
   * Track shipment
   * GET /shipping/track/:trackingNumber
   */
  @Get('track/:trackingNumber')
  async trackShipment(@Param('trackingNumber') trackingNumber: string) {
    return this.shippingService.trackShipment(trackingNumber);
  }
}
