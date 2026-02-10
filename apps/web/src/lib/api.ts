import { AuthUtils } from './auth';

const API_BASE = typeof window !== 'undefined'
  ? `${window.location.origin}/api/v1`
  : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1`;

const DIRECT_API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/v1`;

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${DIRECT_API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  let res = await fetch(url, config);

  if (res.status === 401) {
    const refreshed = await refreshToken();
    if (refreshed) {
      res = await fetch(url, config);
    } else {
      AuthUtils.clearAuth();
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login';
      }
      throw new Error('Session expired');
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { message?: string }).message || `Request failed: ${res.status}`,
    );
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => apiRequest('/auth/logout', { method: 'POST' }),
  getMe: () => apiRequest('/auth/me'),
  getWebSocketToken: () =>
    apiRequest<{ token: string }>('/auth/websocket-token'),

  // Users
  getUsers: () => apiRequest('/admin/users'),
  getUser: (id: number) => apiRequest(`/admin/users/${id}`),
  updateUser: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  banUser: (id: number, reason: string) =>
    apiRequest(`/admin/users/${id}/ban`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unbanUser: (id: number) =>
    apiRequest(`/admin/users/${id}/unban`, { method: 'POST' }),
  getUserActivity: (id: number) => apiRequest(`/admin/users/${id}/activity`),
  adjustUserCoins: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/users/${id}/coins`, { method: 'POST', body: JSON.stringify(data) }),

  // Schedules
  getSchedules: () => apiRequest('/admin/schedules'),
  getSchedule: (id: number) => apiRequest(`/admin/schedules/${id}`),
  createSchedule: (data: Record<string, unknown>) =>
    apiRequest('/admin/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/schedules/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSchedule: (id: number) =>
    apiRequest(`/admin/schedules/${id}`, { method: 'DELETE' }),
  generateGamesForSchedule: (id: number, date: string) =>
    apiRequest(`/admin/schedules/${id}/generate`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),

  // Games
  getGames: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest(`/admin/games${query}`);
  },
  getGame: (id: number) => apiRequest(`/admin/games/${id}`),
  updateGame: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/games/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  cancelGame: (id: number) =>
    apiRequest(`/admin/games/${id}/cancel`, { method: 'POST' }),

  // Subscriptions
  getSubscriptions: () => apiRequest('/admin/subscriptions'),
  cancelSubscription: (id: number) =>
    apiRequest(`/admin/subscriptions/${id}/cancel`, { method: 'POST' }),

  // Stripe Products
  getStripeProducts: () => apiRequest('/admin/stripe/products'),
  createStripeProduct: (data: Record<string, unknown>) =>
    apiRequest('/admin/stripe/products', { method: 'POST', body: JSON.stringify(data) }),
  updateStripeProduct: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/stripe/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archiveStripeProduct: (id: number) =>
    apiRequest(`/admin/stripe/products/${id}/archive`, { method: 'POST' }),
  syncStripeProduct: (id: number) =>
    apiRequest(`/admin/stripe/products/${id}/sync`, { method: 'POST' }),
  syncFromStripe: () =>
    apiRequest('/admin/stripe/sync', { method: 'POST' }),

  // Tutorials
  getTutorials: () => apiRequest('/admin/tutorials'),
  getTutorial: (id: number) => apiRequest(`/admin/tutorials/${id}`),
  createTutorial: (data: Record<string, unknown>) =>
    apiRequest('/admin/tutorials', { method: 'POST', body: JSON.stringify(data) }),
  updateTutorial: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/tutorials/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTutorial: (id: number) =>
    apiRequest(`/admin/tutorials/${id}`, { method: 'DELETE' }),
  getTutorialTags: () => apiRequest('/admin/tutorials/tags'),
  createTutorialTag: (data: Record<string, unknown>) =>
    apiRequest('/admin/tutorials/tags', { method: 'POST', body: JSON.stringify(data) }),
  deleteTutorialTag: (id: number) =>
    apiRequest(`/admin/tutorials/tags/${id}`, { method: 'DELETE' }),
  getTutorialCategories: () => apiRequest('/admin/tutorials/categories'),
  createTutorialCategory: (data: Record<string, unknown>) =>
    apiRequest('/admin/tutorials/categories', { method: 'POST', body: JSON.stringify(data) }),
  deleteTutorialCategory: (id: number) =>
    apiRequest(`/admin/tutorials/categories/${id}`, { method: 'DELETE' }),

  // Messages
  getConversations: () => apiRequest('/messages/conversations'),
  getConversation: (id: number) => apiRequest(`/messages/conversations/${id}`),
  getConversationMessages: (id: number, params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest(`/messages/conversations/${id}/messages${query}`);
  },
  sendMessage: (conversationId: number, content: string) =>
    apiRequest(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  startConversation: (data: Record<string, unknown>) =>
    apiRequest('/messages/conversations', { method: 'POST', body: JSON.stringify(data) }),
  getUnreadCount: () => apiRequest<{ count: number }>('/messages/unread'),

  // Audit
  getAuditLogs: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest(`/admin/audit${query}`);
  },

  // Dashboard
  getDashboardStats: () => apiRequest('/admin/statistics'),
  getSchedulerStatus: () => apiRequest('/admin/scheduler/status'),

  // Config
  getConfig: () => apiRequest('/admin/config'),
  updateConfig: (data: Record<string, unknown>) =>
    apiRequest('/admin/config', { method: 'PATCH', body: JSON.stringify(data) }),

  // Calendar
  getCalendarEvents: (params?: Record<string, string>) => {
    const query = params ? `?${new URLSearchParams(params)}` : '';
    return apiRequest(`/admin/games/calendar${query}`);
  },
};
