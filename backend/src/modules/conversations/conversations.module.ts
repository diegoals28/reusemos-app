// ============================================
// REUSA - Conversations Module
// ============================================

import { Module } from '@nestjs/common';
import { ConversationsController, MessagesController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  controllers: [ConversationsController, MessagesController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
