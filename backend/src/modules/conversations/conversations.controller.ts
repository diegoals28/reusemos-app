// ============================================
// REUSA - Conversations Controller
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
import { MessageType } from '@prisma/client';

import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  // ============================================
  // Conversations
  // ============================================

  @Get()
  @ApiOperation({ summary: 'Get user conversations' })
  async getConversations(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.conversationsService.getConversations(userId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single conversation' })
  async getConversation(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.getConversation(conversationId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create or get conversation for a product' })
  async createConversation(
    @CurrentUser('id') userId: string,
    @Body('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.conversationsService.getOrCreateConversation(productId, userId);
  }

  // ============================================
  // Messages
  // ============================================

  @Get(':id/messages')
  @ApiOperation({ summary: 'Get conversation messages' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 50,
  ) {
    return this.conversationsService.getMessages(conversationId, userId, +page, +limit);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body() body: { type?: string; content?: string; imageUrl?: string; metadata?: any },
  ) {
    const type = (body.type?.toUpperCase() as MessageType) || MessageType.TEXT;
    return this.conversationsService.sendMessage(conversationId, userId, {
      type,
      content: body.content,
      imageUrl: body.imageUrl,
      metadata: body.metadata,
    });
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark conversation as read' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ) {
    return this.conversationsService.markAsRead(conversationId, userId);
  }
}

// ============================================
// Messages Controller (for responding to offers)
// ============================================

@ApiTags('messages')
@Controller('messages')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Patch(':id/respond')
  @ApiOperation({ summary: 'Respond to an offer or trade proposal' })
  async respondToMessage(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body('accept') accept: boolean,
  ) {
    return this.conversationsService.respondToMessage(messageId, userId, accept);
  }
}
