// ============================================
// REUSA - Offers Controller
// ============================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OffersService, OfferType } from './offers.service';

class CreateOfferDto {
  productId: string;
  conversationId: string;
  type: OfferType;
  amount?: number;
  tradeProductIds?: string[];
  cashDifference?: number;
  message?: string;
}

class CounterOfferDto {
  amount?: number;
  tradeProductIds?: string[];
  cashDifference?: number;
  message?: string;
}

class RejectOfferDto {
  reason?: string;
}

@ApiTags('Offers')
@Controller('offers')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new offer' })
  async createOffer(
    @CurrentUser() user: any,
    @Body() dto: CreateOfferDto,
  ) {
    const offer = await this.offersService.createOffer(user.id, dto);
    return { success: true, data: offer };
  }

  @Get('sent')
  @ApiOperation({ summary: 'Get my sent offers' })
  async getMySentOffers(@CurrentUser() user: any) {
    const offers = await this.offersService.getUserOffers(user.id);
    return { success: true, data: offers };
  }

  @Get('received')
  @ApiOperation({ summary: 'Get received offers' })
  async getReceivedOffers(@CurrentUser() user: any) {
    const offers = await this.offersService.getReceivedOffers(user.id);
    return { success: true, data: offers };
  }

  @Get('product/:productId')
  @ApiOperation({ summary: 'Get offers for a product' })
  async getProductOffers(
    @CurrentUser() user: any,
    @Param('productId') productId: string,
  ) {
    const offers = await this.offersService.getProductOffers(productId, user.id);
    return { success: true, data: offers };
  }

  @Patch(':offerId/accept')
  @ApiOperation({ summary: 'Accept an offer' })
  async acceptOffer(
    @CurrentUser() user: any,
    @Param('offerId') offerId: string,
  ) {
    const offer = await this.offersService.acceptOffer(user.id, offerId);
    return { success: true, data: offer };
  }

  @Patch(':offerId/reject')
  @ApiOperation({ summary: 'Reject an offer' })
  async rejectOffer(
    @CurrentUser() user: any,
    @Param('offerId') offerId: string,
    @Body() dto: RejectOfferDto,
  ) {
    const offer = await this.offersService.rejectOffer(user.id, offerId, dto.reason);
    return { success: true, data: offer };
  }

  @Post(':offerId/counter')
  @ApiOperation({ summary: 'Counter an offer' })
  async counterOffer(
    @CurrentUser() user: any,
    @Param('offerId') offerId: string,
    @Body() dto: CounterOfferDto,
  ) {
    const offer = await this.offersService.counterOffer(user.id, offerId, dto);
    return { success: true, data: offer };
  }

  @Patch(':offerId/cancel')
  @ApiOperation({ summary: 'Cancel an offer' })
  async cancelOffer(
    @CurrentUser() user: any,
    @Param('offerId') offerId: string,
  ) {
    const offer = await this.offersService.cancelOffer(user.id, offerId);
    return { success: true, data: offer };
  }
}
