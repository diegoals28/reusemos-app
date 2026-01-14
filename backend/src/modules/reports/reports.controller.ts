// ============================================
// REUSA - Reports Controller
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
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportReason, ReportStatus } from '@prisma/client';

import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ============================================
  // User Reports
  // ============================================

  @Post('user/:userId')
  @ApiOperation({ summary: 'Report a user' })
  async reportUser(
    @CurrentUser('id') reporterId: string,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() body: { reason: ReportReason; description?: string; evidence?: string[] },
  ) {
    return this.reportsService.reportUser(
      reporterId,
      targetUserId,
      body.reason,
      body.description,
      body.evidence,
    );
  }

  @Post('product/:productId')
  @ApiOperation({ summary: 'Report a product' })
  async reportProduct(
    @CurrentUser('id') reporterId: string,
    @Param('productId', ParseUUIDPipe) targetProductId: string,
    @Body() body: { reason: ReportReason; description?: string; evidence?: string[] },
  ) {
    return this.reportsService.reportProduct(
      reporterId,
      targetProductId,
      body.reason,
      body.description,
      body.evidence,
    );
  }

  @Get('mine')
  @ApiOperation({ summary: 'Get my reports' })
  async getMyReports(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reportsService.getMyReports(userId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report details' })
  async getReport(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) reportId: string,
  ) {
    return this.reportsService.getReport(reportId, userId);
  }

  // ============================================
  // Admin Endpoints
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get all reports (admin)' })
  async getAllReports(
    @Query('status') status?: ReportStatus,
    @Query('type') targetType?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.reportsService.getAllReports(status, targetType, +page, +limit);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get report statistics (admin)' })
  async getReportStats() {
    return this.reportsService.getReportStats();
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update report status (admin)' })
  async updateReportStatus(
    @Param('id', ParseUUIDPipe) reportId: string,
    @Body() body: { status: ReportStatus; moderatorNotes?: string; actionTaken?: string },
  ) {
    return this.reportsService.updateReportStatus(
      reportId,
      body.status,
      body.moderatorNotes,
      body.actionTaken,
    );
  }

  @Post(':id/action')
  @ApiOperation({ summary: 'Take action on report (admin)' })
  async takeAction(
    @Param('id', ParseUUIDPipe) reportId: string,
    @Body() body: { action: 'warn' | 'suspend_user' | 'remove_product' | 'dismiss'; moderatorNotes?: string },
  ) {
    return this.reportsService.takeAction(reportId, body.action, body.moderatorNotes);
  }
}
