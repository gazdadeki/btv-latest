import { io, Socket } from 'socket.io-client';
import { api } from './api';

type WebSocketEventHandler = (...args: unknown[]) => void;

export class WebSocketManagerInstance {
  socket: Socket | null = null;
  isConnecting = false;
  isConnected = false;
  reconnectAttempts = 0;
  maxReconnectAttempts = 5;
  reconnectDelay = 1000;
  reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  authFailure = false;
  eventListeners = new Map<string, Set<WebSocketEventHandler>>();
  connectionCallbacks: WebSocketEventHandler[] = [];
  disconnectionCallbacks: WebSocketEventHandler[] = [];

  private isAuthError(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    const message = error.message.toLowerCase();
    return (
      message.includes('session expired') ||
      message.includes('authentication failed') ||
      message.includes('no access token') ||
      message.includes('unauthorized')
    );
  }

  resetAuthFailure() {
    this.authFailure = false;
  }

  async connect() {
    if (this.authFailure) {
      console.warn(
        '[WebSocket] Authentication failure detected. Not attempting to connect.',
      );
      return;
    }

    if (this.socket && this.socket.connected) {
      return;
    }

    if (this.isConnecting) {
      return;
    }

    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket = null;
    }

    this.isConnecting = true;

    try {
      const token = await api.getWebSocketToken();
      if (!token) {
        console.error('[WebSocket] No authentication token found.');
        this.isConnecting = false;
        return;
      }

      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.socket = io({
        auth: { token },
        reconnection: false,
        transports: ['websocket', 'polling'],
        forceNew: true,
      });

      this.setupEventHandlers();
      this.reconnectAttempts = 0;
    } catch (error) {
      this.isConnecting = false;

      if (this.isAuthError(error)) {
        console.error(
          '[WebSocket] Authentication failure while fetching token. Not retrying.',
        );
        this.authFailure = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        return;
      }

      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      console.error('[WebSocket] Failed to get WebSocket token:', error);
      this.scheduleReconnect();
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.authFailure = false;
      this.connectionCallbacks.forEach((callback) => {
        try {
          callback();
        } catch (error) {
          console.error('[WebSocket] Error in connection callback:', error);
        }
      });
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.isConnecting = false;

      this.disconnectionCallbacks.forEach((callback) => {
        try {
          callback(reason);
        } catch (error) {
          console.error('[WebSocket] Error in disconnection callback:', error);
        }
      });

      if (reason === 'io server disconnect') {
        console.warn(
          '[WebSocket] Server disconnected client - likely authentication failure.',
        );
        this.authFailure = true;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        return;
      }

      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
      this.isConnecting = false;
      if (
        error.message &&
        error.message.toLowerCase().includes('auth')
      ) {
        console.error('[WebSocket] Authentication error - stopping reconnect.');
        this.authFailure = true;
        return;
      }
      this.scheduleReconnect();
    });

    this.socket.onAny((eventName, ...args) => {
      this.emitToListeners(eventName, ...args);
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.authFailure) {
      return;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached.');
      return;
    }

    this.reconnectAttempts += 1;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  on(event: string, callback: WebSocketEventHandler): () => void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)?.add(callback);
    return () => {
      this.off(event, callback);
    };
  }

  off(event: string, callback?: WebSocketEventHandler) {
    if (!this.eventListeners.has(event)) {
      return;
    }
    if (callback) {
      this.eventListeners.get(event)?.delete(callback);
    } else {
      this.eventListeners.get(event)?.clear();
    }
  }

  emit(event: string, data: unknown) {
    if (!this.socket || !this.getConnectionState()) {
      console.warn(`[WebSocket] Cannot emit ${event}: not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  private emitToListeners(event: string, ...args: unknown[]) {
    const listeners = this.eventListeners.get(event);
    if (!listeners) return;
    listeners.forEach((callback) => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`[WebSocket] Error in event listener for ${event}:`, error);
      }
    });
  }

  getConnectionState(): boolean {
    return !!(this.isConnected && this.socket && this.socket.connected);
  }

  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' | 'error' {
    if (this.isConnected && this.socket && this.socket.connected) {
      return 'connected';
    }
    if (this.isConnecting) {
      return 'connecting';
    }
    if (this.authFailure) {
      return 'error';
    }
    return 'disconnected';
  }

  getConnectionStatusMessage(): string {
    const status = this.getConnectionStatus();
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection error';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  onConnect(callback: WebSocketEventHandler) {
    this.connectionCallbacks.push(callback);
    if (this.isConnected) {
      callback();
    }
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }

  onDisconnect(callback: WebSocketEventHandler) {
    this.disconnectionCallbacks.push(callback);
    return () => {
      this.disconnectionCallbacks = this.disconnectionCallbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }
}

export const webSocketManager = new WebSocketManagerInstance();

if (typeof window !== 'undefined') {
  window.WebSocketManager = webSocketManager;

  window.addEventListener('beforeunload', () => {
    webSocketManager.disconnect();
  });
}
