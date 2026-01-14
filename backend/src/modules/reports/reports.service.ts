// ============================================
// REUSA - Reports Service
// ============================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { ReportReason, ReportStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ============================================
  // Create Reports
  // ============================================

  async reportUser(
    reporterId: string,
    targetUserId: string,
    reason: ReportReason,
    description?: string,
    evidence?: string[],
  ) {
    if (reporterId === targetUserId) {
      throw new BadRequestException('Cannot report yourself');
    }

    // Check target user exists
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    // Check for duplicate report
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetUserId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this user');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: 'user',
        targetUserId,
        targetId: targetUserId,
        reason,
        description,
        evidence: evidence || [],
      },
    });
  }

  async reportProduct(
    reporterId: string,
    targetProductId: string,
    reason: ReportReason,
    description?: string,
    evidence?: string[],
  ) {
    // Check target product exists
    const targetProduct = await this.prisma.product.findUnique({
      where: { id: targetProductId },
      select: { id: true, sellerId: true },
    });

    if (!targetProduct) {
      throw new NotFoundException('Product not found');
    }

    if (reporterId === targetProduct.sellerId) {
      throw new BadRequestException('Cannot report your own product');
    }

    // Check for duplicate report
    const existingReport = await this.prisma.report.findFirst({
      where: {
        reporterId,
        targetProductId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
    });

    if (existingReport) {
      throw new BadRequestException('You have already reported this product');
    }

    return this.prisma.report.create({
      data: {
        reporterId,
        targetType: 'product',
        targetProductId,
        targetId: targetProductId,
        reason,
        description,
        evidence: evidence || [],
      },
    });
  }

  // ============================================
  // Get Reports
  // ============================================

  async getMyReports(userId: string, page = 1, limit = 20) {
    return this.prisma.paginate(
      this.prisma.report,
      {
        where: { reporterId: userId },
        orderBy: { createdAt: 'desc' },
        include: {
          targetUser: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          targetProduct: {
            select: {
              id: true,
              title: true,
              images: { orderBy: { order: 'asc' }, take: 1 },
            },
          },
        },
      },
      page,
      limit,
    );
  }

  async getReport(reportId: string, userId: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        targetUser: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
        targetProduct: {
          select: {
            id: true,
            title: true,
            description: true,
            images: { orderBy: { order: 'asc' } },
          },
        },
      },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Only reporter can view their own report (or admin)
    if (report.reporterId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return report;
  }

  // ============================================
  // Admin: Manage Reports
  // ============================================

  async getAllReports(
    status?: ReportStatus,
    targetType?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (targetType) where.targetType = targetType;

    return this.prisma.paginate(
      this.prisma.report,
      {
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          reporter: {
            select: { id: true, username: true, displayName: true, avatarUrl: true },
          },
          targetUser: {
            select: { id: true, username: true, displayName: true, avatarUrl: true, status: true },
          },
          targetProduct: {
            select: {
              id: true,
              title: true,
              status: true,
              images: { orderBy: { order: 'asc' }, take: 1 },
            },
          },
        },
      },
      page,
      limit,
    );
  }

  async updateReportStatus(
    reportId: string,
    status: ReportStatus,
    moderatorNotes?: string,
    actionTaken?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const updateData: any = {
      status,
      moderatorNotes,
    };

    if (status === 'RESOLVED' || status === 'DISMISSED') {
      updateData.resolvedAt = new Date();
      updateData.actionTaken = actionTaken;
    }

    return this.prisma.report.update({
      where: { id: reportId },
      data: updateData,
    });
  }

  async takeAction(
    reportId: string,
    action: 'warn' | 'suspend_user' | 'remove_product' | 'dismiss',
    moderatorNotes?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Execute action
    if (action === 'suspend_user' && report.targetUserId) {
      await this.prisma.user.update({
        where: { id: report.targetUserId },
        data: { status: 'SUSPENDED' },
      });
    }

    if (action === 'remove_product' && report.targetProductId) {
      await this.prisma.product.update({
        where: { id: report.targetProductId },
        data: { status: 'REMOVED' },
      });
    }

    // Update report
    return this.prisma.report.update({
      where: { id: reportId },
      data: {
        status: action === 'dismiss' ? 'DISMISSED' : 'RESOLVED',
        resolvedAt: new Date(),
        actionTaken: action,
        moderatorNotes,
      },
    });
  }

  // ============================================
  // Stats
  // ============================================

  async getReportStats() {
    const [total, pending, resolved, dismissed] = await Promise.all([
      this.prisma.report.count(),
      this.prisma.report.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count({ where: { status: 'RESOLVED' } }),
      this.prisma.report.count({ where: { status: 'DISMISSED' } }),
    ]);

    const byReason = await this.prisma.report.groupBy({
      by: ['reason'],
      _count: true,
    });

    return {
      total,
      byStatus: { pending, resolved, dismissed },
      byReason: byReason.reduce(
        (acc, item) => ({ ...acc, [item.reason]: item._count }),
        {},
      ),
    };
  }
}
