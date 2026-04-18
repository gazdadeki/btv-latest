/** Shared WebSocket event names */
export const WS_EVENTS = {
  GAME_CREATED: "game:created",
  GAME_UPDATED: "game:updated",
  GAME_STATUS_CHANGED: "game:status_changed",
  USER_ACTIVITY_CHANGED: "user:activity_changed",
  RESERVATION_CREATED: "reservation:created",
  RESERVATION_UPDATED: "reservation:updated",
  RESERVATION_CANCELLED: "reservation:cancelled",
  SCHEDULE_CREATED: "schedule:created",
  SCHEDULE_UPDATED: "schedule:updated",
  SCHEDULE_DELETED: "schedule:deleted",
  MESSAGE_RECEIVED: "message:received",
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",
  UNREAD_UPDATED: "unread:updated",
  CONVERSATION_CREATED: "conversation:created",
  CONVERSATION_UPDATED: "conversation:updated",
} as const;

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  statusCode?: number;
}

/** Paginated list response */
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** User role enum */
export type UserRole = "admin" | "player";

/** Base user shape shared between frontend and backend */
export interface BaseUser {
  id: number;
  email: string;
  username?: string;
  role: UserRole;
  isVerified: boolean;
  isBanned: boolean;
}
