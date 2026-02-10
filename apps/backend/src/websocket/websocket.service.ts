import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketEnvelope, WebsocketEventName } from './events';

@Injectable()
export class WebsocketService {
  constructor(private gateway: WebsocketGateway) {}

  broadcast(event: string, data: any): void {
    this.gateway.server.emit(event, data);
  }

  broadcastEnvelope<TPayload>(
    event: WebsocketEventName,
    payload: TPayload,
    correlationId?: string,
  ): void {
    const message: WebsocketEnvelope<TPayload> = {
      type: event,
      version: 'v1',
      timestamp: new Date().toISOString(),
      correlationId: correlationId ?? randomUUID(),
      payload,
    };
    this.gateway.server.emit(event, message);
  }

  broadcastToRoom(room: string, event: string, data: any): void {
    this.gateway.server.to(room).emit(event, data);
  }

  broadcastToUser(userId: number, event: string, data: any): void {
    this.gateway.server.to(`user:${userId}`).emit(event, data);
  }

  broadcastToEvent(eventId: number, event: string, data: any): void {
    this.gateway.server.to(`event:${eventId}`).emit(event, data);
  }

  broadcastToAdmin(event: string, data: any): void {
    this.gateway.server.to('admin').emit(event, data);
  }
}
