'use client';

// Translated from Mobile/lib/core/websocket/websocket_service.dart
// and Mobile/lib/providers/websocket_provider.dart

import { io, type Socket } from 'socket.io-client';
import { api } from './api';

export type WebSocketStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

type EventHandler = (...args: unknown[]) => void;

class WebSocketManager {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<EventHandler>>();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelayMs = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  private _status: WebSocketStatus = 'disconnected';

  private statusListeners = new Set<(status: WebSocketStatus) => void>();

  get status(): WebSocketStatus {
    return this._status;
  }

  get isConnected(): boolean {
    return this._status === 'connected';
  }

  private updateStatus(status: WebSocketStatus) {
    this._status = status;
    this.statusListeners.forEach(fn => fn(status));
  }

  onStatusChange(fn: (status: WebSocketStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  async connect() {
    if (this.isConnecting || this.socket?.connected) return;

    this.isConnecting = true;
    this.updateStatus('connecting');

    let token: string;
    try {
      token = await api.getWebSocketToken();
    } catch {
      this.isConnecting = false;
      this.updateStatus('error');
      this.scheduleReconnect();
      return;
    }

    if (!token) {
      this.isConnecting = false;
      this.updateStatus('error');
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

    this.socket = io(wsUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false, // we handle reconnection manually like Flutter
    });

    this.socket.on('connect', () => {
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.updateStatus('connected');
    });

    this.socket.on('disconnect', () => {
      this.isConnecting = false;
      this.updateStatus('disconnected');
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', () => {
      this.isConnecting = false;
      this.updateStatus('error');
      this.scheduleReconnect();
    });

    this.socket.onAny((event: string, ...args: unknown[]) => {
      this.emit(event, ...args);
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.updateStatus('disconnected');
  }

  // Linear backoff: attempt * 1000ms (matches Flutter's WebSocketService._handleReconnect)
  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.updateStatus('error');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelayMs * this.reconnectAttempts;
    this.reconnectTimer = setTimeout(() => {
      if (!this.isConnected && this._status !== 'connecting') {
        this.connect();
      }
    }, delay);
  }

  // retry() resets attempts and reconnects (from WebSocketService.retry())
  async retry() {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    await this.connect();
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(...args);
      } catch (err) {
        console.error(`WebSocket handler error for ${event}:`, err);
      }
    });
  }

  send(event: string, data?: unknown) {
    this.socket?.emit(event, data);
  }

  joinEvent(eventId: number) {
    if (this.isConnected) {
      this.socket?.emit('join:event', { eventId });
    }
  }

  leaveEvent(eventId: number) {
    if (this.isConnected) {
      this.socket?.emit('leave:event', { eventId });
    }
  }

  ping() {
    if (this.isConnected) {
      this.socket?.emit('activity:ping');
    }
  }
}

export const wsManager = new WebSocketManager();
