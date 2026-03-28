"use client";

import { io, type Socket } from "socket.io-client";
import { api } from "./api";

type EventHandler = (...args: unknown[]) => void;

class WebSocketManager {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<EventHandler>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _isConnected = false;

  get isConnected() {
    return this._isConnected;
  }

  async connect() {
    if (this.socket?.connected) return;

    try {
      const { token } = await api.getWebSocketToken();
      const wsUrl =
        process.env.NEXT_PUBLIC_WS_URL ||
        (typeof window !== "undefined"
          ? `${window.location.protocol}//${window.location.hostname}:3000`
          : "http://localhost:3000");

      this.socket = io(wsUrl, {
        auth: { token },
        transports: ["websocket", "polling"],
        forceNew: true,
        reconnection: false,
      });

      this.socket.on("connect", () => {
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.emit("_status", "connected");
      });

      this.socket.on("disconnect", (reason) => {
        this._isConnected = false;
        this.emit("_status", "disconnected");
        if (reason !== "io client disconnect") {
          this.scheduleReconnect();
        }
      });

      this.socket.on("connect_error", () => {
        this._isConnected = false;
        this.emit("_status", "error");
        this.scheduleReconnect();
      });

      this.socket.onAny((event: string, ...args: unknown[]) => {
        this.emit(event, ...args);
      });
    } catch {
      this.emit("_status", "error");
      this.scheduleReconnect();
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this._isConnected = false;
  }

  on(event: string, handler: EventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  private emit(event: string, ...args: unknown[]) {
    this.listeners.get(event)?.forEach((handler) => {
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

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

export const webSocketManager = new WebSocketManager();
