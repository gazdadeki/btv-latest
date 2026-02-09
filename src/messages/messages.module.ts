import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { ConversationParticipant } from './entities/conversation-participant.entity';
import { Message } from './entities/message.entity';
import { User } from '../users/entities/user.entity';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MessagesGatewayService } from './messages.gateway.service';
import { UsersModule } from '../users/users.module';
import { WebsocketModule } from '../websocket/websocket.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Messages module for handling messaging functionality between players and admins.
 *
 * Provides:
 * - Conversation management (create, list, add participants)
 * - Message sending and retrieval
 * - Real-time messaging via WebSocket
 * - Unread message tracking
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      ConversationParticipant,
      Message,
      User,
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => WebsocketModule),
    AuditModule,
  ],
  providers: [MessagesService, MessagesGatewayService],
  controllers: [MessagesController],
  exports: [MessagesService, MessagesGatewayService],
})
export class MessagesModule {}
