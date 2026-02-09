import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { WebsocketService } from '../websocket/websocket.service';
import { Message } from './entities/message.entity';

/**
 * Service for broadcasting messages via WebSocket to conversation participants.
 *
 * Handles real-time message delivery to all participants in a conversation.
 */
@Injectable()
export class MessagesGatewayService {
  private readonly logger = new Logger(MessagesGatewayService.name);

  constructor(
    @Inject(forwardRef(() => WebsocketService))
    private websocketService: WebsocketService,
  ) {}

  /**
   * Broadcast a new message to all participants in a conversation.
   *
   * @param conversationId - ID of the conversation
   * @param message - Message entity with sender relation loaded
   */
  async broadcastMessage(
    conversationId: number,
    message: Message,
  ): Promise<void> {
    const room = `conversation:${conversationId}`;
    const messageData = {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      sender: {
        id: message.sender.id,
        email: message.sender.email,
        role: message.sender.role,
      },
      content: message.content,
      createdAt: message.createdAt,
    };

    this.websocketService.broadcastToRoom(
      room,
      'message:received',
      messageData,
    );
    this.logger.debug(`Broadcasted message ${message.id} to room ${room}`);
  }

  /**
   * Broadcast typing indicator to conversation participants.
   *
   * @param conversationId - ID of the conversation
   * @param userId - ID of the user typing
   * @param isTyping - Whether user is typing or stopped typing
   */
  broadcastTyping(
    conversationId: number,
    userId: number,
    isTyping: boolean,
  ): void {
    const room = `conversation:${conversationId}`;
    const event = isTyping ? 'typing:start' : 'typing:stop';
    const data = {
      conversationId,
      userId,
      isTyping,
    };

    this.websocketService.broadcastToRoom(room, event, data);
    this.logger.debug(
      `Broadcasted ${event} for user ${userId} in conversation ${conversationId}`,
    );
  }

  /**
   * Notify participants of a new conversation or conversation update.
   *
   * @param conversationId - ID of the conversation
   * @param userIds - Array of user IDs to notify
   * @param event - Event type (e.g., 'conversation:created', 'conversation:updated')
   * @param data - Event data
   */
  notifyConversationUpdate(
    conversationId: number,
    userIds: number[],
    event: string,
    data: any,
  ): void {
    for (const userId of userIds) {
      this.websocketService.broadcastToUser(userId, event, {
        conversationId,
        ...data,
      });
    }
    this.logger.debug(
      `Notified ${userIds.length} users about conversation ${conversationId} update`,
    );
  }

  /**
   * Broadcast unread count update to a specific user.
   *
   * @param userId - ID of the user
   * @param count - New unread count
   */
  broadcastUnreadCount(userId: number, count: number): void {
    this.websocketService.broadcastToUser(userId, 'unread:updated', { count });
    this.logger.debug(`Broadcasted unread count ${count} to user ${userId}`);
  }

  /**
   * Broadcast conversation created event to participants.
   *
   * @param conversationId - ID of the conversation
   * @param userIds - Array of user IDs to notify
   * @param conversationData - Conversation data
   */
  broadcastConversationCreated(
    conversationId: number,
    userIds: number[],
    conversationData: any,
  ): void {
    for (const userId of userIds) {
      this.websocketService.broadcastToUser(userId, 'conversation:created', {
        conversationId,
        conversation: conversationData,
      });
    }
    this.logger.debug(
      `Broadcasted conversation:created for conversation ${conversationId} to ${userIds.length} users`,
    );
  }

  /**
   * Broadcast conversation updated event to participants.
   *
   * @param conversationId - ID of the conversation
   * @param userIds - Array of user IDs to notify
   * @param conversationData - Conversation data
   */
  broadcastConversationUpdated(
    conversationId: number,
    userIds: number[],
    conversationData: any,
  ): void {
    for (const userId of userIds) {
      this.websocketService.broadcastToUser(userId, 'conversation:updated', {
        conversationId,
        conversation: conversationData,
      });
    }
    this.logger.debug(
      `Broadcasted conversation:updated for conversation ${conversationId} to ${userIds.length} users`,
    );
  }
}
