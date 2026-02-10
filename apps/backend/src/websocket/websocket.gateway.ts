import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, forwardRef, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ActivityService, ActivityState } from '../activity/activity.service';
import { MessagesService } from '../messages/messages.service';
import { MessagesGatewayService } from '../messages/messages.gateway.service';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
      : '*',
    credentials: true,
  },
  namespace: '/',
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private connectedUsers: Map<number, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private activityService: ActivityService,
    @Inject(forwardRef(() => MessagesService))
    private messagesService: MessagesService,
    @Inject(forwardRef(() => MessagesGatewayService))
    private messagesGatewayService: MessagesGatewayService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      this.logger.debug(
        `WebSocket connection attempt from client ID: ${client.id}`,
      );
      this.logger.debug(
        `Handshake auth: ${JSON.stringify(client.handshake.auth)}`,
      );
      this.logger.debug(
        `Handshake headers authorization: ${client.handshake.headers?.authorization ? 'present' : 'missing'}`,
      );

      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(
          `WebSocket connection rejected: No token provided (client ID: ${client.id})`,
        );
        this.logger.debug(
          `Available auth keys: ${Object.keys(client.handshake.auth || {}).join(', ')}`,
        );
        client.disconnect();
        return;
      }

      this.logger.debug(
        `Token received, length: ${token.length}, first 20 chars: ${token.substring(0, 20)}...`,
      );

      let payload;
      try {
        payload = this.jwtService.verify(token);
      } catch (jwtError) {
        this.logger.warn(
          `WebSocket connection rejected: Invalid token (client ID: ${client.id}, error: ${jwtError.message})`,
        );
        client.disconnect();
        return;
      }

      const user = await this.usersService.findOne(payload.sub);

      if (!user) {
        this.logger.warn(
          `WebSocket connection rejected: User not found (userId: ${payload.sub}, client ID: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      if (user.isBanned) {
        this.logger.warn(
          `WebSocket connection rejected: User is banned (userId: ${user.id}, client ID: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      if (!user.isVerified) {
        this.logger.warn(
          `WebSocket connection rejected: User is not verified (userId: ${user.id}, client ID: ${client.id})`,
        );
        client.disconnect();
        return;
      }

      client.data.userId = user.id;
      client.join(`user:${user.id}`);
      client.join('global');

      if (user.role === 'admin') {
        client.join('admin');
      }

      if (!this.connectedUsers.has(user.id)) {
        this.connectedUsers.set(user.id, new Set());
      }
      this.connectedUsers.get(user.id)!.add(client.id);

      this.activityService.setActivityState(user.id, ActivityState.ONLINE);

      this.server.to('admin').emit('user:activity_changed', {
        userId: user.id,
        state: ActivityState.ONLINE,
      });

      this.logger.log(
        `WebSocket connection established: User ${user.id} (${user.email}, role: ${user.role}, client ID: ${client.id})`,
      );
    } catch (error) {
      this.logger.error(
        `WebSocket connection error (client ID: ${client.id}): ${error.message}`,
        error.stack,
      );
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const userSockets = this.connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(userId);
          this.activityService.setActivityState(userId, ActivityState.OFFLINE);

          this.server.to('admin').emit('user:activity_changed', {
            userId,
            state: ActivityState.OFFLINE,
          });
        }
      }
    }
  }

  @SubscribeMessage('join:event')
  handleJoinEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: number },
  ) {
    client.join(`event:${data.eventId}`);
  }

  @SubscribeMessage('leave:event')
  handleLeaveEvent(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId: number },
  ) {
    client.leave(`event:${data.eventId}`);
  }

  @SubscribeMessage('activity:ping')
  handleActivityPing(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    if (userId) {
      const now = Date.now();
      const lastPing = Number(client.data.lastActivityPingAt || 0);
      if (now - lastPing < 5000) {
        return;
      }
      client.data.lastActivityPingAt = now;
      this.activityService.updateLastActivity(userId);
    }
  }

  @SubscribeMessage('messages:join')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    // Validate user has access to conversation
    this.messagesService
      .validateConversationAccess(data.conversationId, userId)
      .then(() => {
        client.join(`conversation:${data.conversationId}`);
      })
      .catch(() => {
        // User doesn't have access, don't join
      });
  }

  @SubscribeMessage('messages:leave')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number },
  ) {
    client.leave(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('messages:send')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; content: string },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    try {
      // Send message via service (handles validation and broadcasting)
      await this.messagesService.sendMessage(
        data.conversationId,
        userId,
        data.content,
      );
    } catch (error) {
      // Error handling is done in service
      client.emit('message:error', { error: error.message });
    }
  }

  @SubscribeMessage('messages:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: number; isTyping: boolean },
  ) {
    const userId = client.data.userId;
    if (!userId) {
      return;
    }

    // Broadcast typing indicator to other participants
    this.messagesGatewayService.broadcastTyping(
      data.conversationId,
      userId,
      data.isTyping,
    );
  }
}
