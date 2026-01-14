// ============================================
// REUSA - Reviews Controller
// ============================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';

class CreateReviewDto {
  transactionId: string;
  reviewedUserId: string;
  rating: number;
  comment?: string;
  tags?: string[];
}

class ReportReviewDto {
  reason: string;
}

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review' })
  async createReview(
    @CurrentUser() user: any,
    @Body() dto: CreateReviewDto,
  ) {
    const review = await this.reviewsService.createReview(user.id, dto);
    return { success: true, data: review };
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get reviews for a user' })
  async getUserReviews(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.reviewsService.getUserReviews(
      userId,
      limit ? parseInt(limit, 10) : 20,
      offset ? parseInt(offset, 10) : 0,
    );
    return { success: true, data: result };
  }

  @Get('user/:userId/summary')
  @ApiOperation({ summary: 'Get rating summary for a user' })
  async getUserRatingSummary(@Param('userId') userId: string) {
    const summary = await this.reviewsService.getUserRatingSummary(userId);
    return { success: true, data: summary };
  }

  @Get('my/given')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my given reviews' })
  async getMyGivenReviews(@CurrentUser() user: any) {
    const reviews = await this.reviewsService.getMyGivenReviews(user.id);
    return { success: true, data: reviews };
  }

  @Post(':reviewId/report')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report a review' })
  async reportReview(
    @CurrentUser() user: any,
    @Param('reviewId') reviewId: string,
    @Body() dto: ReportReviewDto,
  ) {
    const result = await this.reviewsService.reportReview(user.id, reviewId, dto.reason);
    return result;
  }
}
