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

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') filtered[k] = v;
  }
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : '';
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

  // ─── Users ────────────────────────────────────────────
  getUsers: (params?: Record<string, string | undefined>) =>
    apiRequest(`/admin/users${buildQuery(params)}`),
  getUser: (id: number) => apiRequest(`/admin/users/${id}`),
  createUser: (data: Record<string, unknown>) =>
    apiRequest('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  changeUserRole: (id: number, role: string) =>
    apiRequest(`/admin/users/${id}/role`, { method: 'PUT', body: JSON.stringify({ role }) }),
  banUser: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/users/${id}/ban`, { method: 'PUT', body: JSON.stringify(data) }),
  unbanUser: (id: number) =>
    apiRequest(`/admin/users/${id}/unban`, { method: 'PUT' }),
  deleteUser: (id: number, reason?: string) =>
    apiRequest(`/admin/users/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  // Stripe
  getUserStripeInfo: (id: number) =>
    apiRequest(`/admin/users/${id}/stripe`),
  linkStripeCustomer: (id: number, customerId: string) =>
    apiRequest(`/admin/users/${id}/stripe/link`, {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    }),
  unlinkStripeCustomer: (id: number) =>
    apiRequest(`/admin/users/${id}/stripe/unlink`, { method: 'POST' }),
  createStripeCustomer: (id: number) =>
    apiRequest(`/admin/users/${id}/stripe/create-customer`, { method: 'POST' }),
  // Coins
  grantCoins: (id: number, amount: number, description: string) =>
    apiRequest(`/admin/users/${id}/coins`, {
      method: 'POST',
      body: JSON.stringify({ amount, description }),
    }),
  getUserWalletTransactions: (id: number) =>
    apiRequest(`/admin/users/${id}/wallet/transactions`),
  getUserPaymentMethods: (id: number) =>
    apiRequest(`/admin/users/${id}/payment-methods`),
  // Verification (admin)
  adminRequestVerification: (id: number) =>
    apiRequest(`/verification/admin/users/${id}/request-verification`, { method: 'POST' }),
  adminVerifyUser: (id: number) =>
    apiRequest(`/verification/admin/users/${id}/verify`, { method: 'PUT' }),
  getLatestVerificationCode: (id: number) =>
    apiRequest(`/verification/admin/users/${id}/latest-code`),

  // ─── Schedules ────────────────────────────────────────
  getSchedules: () => apiRequest('/admin/schedules'),
  getSchedule: (id: number) => apiRequest(`/admin/schedules/${id}`),
  createSchedule: (data: Record<string, unknown>) =>
    apiRequest('/admin/schedules', { method: 'POST', body: JSON.stringify(data) }),
  updateSchedule: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/schedules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSchedule: (id: number) =>
    apiRequest(`/admin/schedules/${id}`, { method: 'DELETE' }),
  cancelScheduleGames: (id: number) =>
    apiRequest(`/admin/schedules/${id}/cancel-games`, { method: 'PUT' }),
  generateGamesForSchedule: (id: number, date: string) =>
    apiRequest(`/admin/schedules/${id}/generate-games`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    }),

  // ─── Games ────────────────────────────────────────────
  getGames: (params?: Record<string, string | undefined>) =>
    apiRequest(`/admin/games${buildQuery(params)}`),
  getGame: (id: number) => apiRequest(`/admin/games/${id}`),
  createGame: (data: Record<string, unknown>) =>
    apiRequest('/admin/games', { method: 'POST', body: JSON.stringify(data) }),
  updateGame: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  startGame: (id: number) =>
    apiRequest(`/admin/games/${id}/start`, { method: 'PUT' }),
  finishGame: (id: number, data: { winningTeam: string; mvpUserId?: number }) =>
    apiRequest(`/admin/games/${id}/finish`, { method: 'PUT', body: JSON.stringify(data) }),
  cancelGame: (id: number) =>
    apiRequest(`/admin/games/${id}/cancel`, { method: 'PUT' }),
  cancelAllActiveGames: () =>
    apiRequest<{ cancelledCount: number }>('/admin/games/cancel-all-active', { method: 'POST' }),
  autoStartNextGame: (id: number, delayMinutes: number) =>
    apiRequest(`/admin/games/${id}/auto-start-next`, {
      method: 'POST',
      body: JSON.stringify({ delayMinutes }),
    }),
  shufflePlayers: (id: number) =>
    apiRequest(`/admin/games/${id}/shuffle`, { method: 'POST' }),
  // Slots
  assignUserToSlot: (gameId: number, slotId: number, userId: number) =>
    apiRequest(`/admin/games/${gameId}/slots/${slotId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    }),
  kickUserFromSlot: (gameId: number, slotId: number) =>
    apiRequest(`/admin/games/${gameId}/slots/${slotId}/kick`, { method: 'PUT' }),
  confirmSlotReservation: (gameId: number, slotId: number) =>
    apiRequest(`/admin/games/${gameId}/slots/${slotId}/confirm`, { method: 'PUT' }),
  confirmAllSlots: (gameId: number) =>
    apiRequest<{ confirmedCount: number }>(`/admin/games/${gameId}/slots/confirm-all`, { method: 'PUT' }),
  cancelAllConfirmations: (gameId: number) =>
    apiRequest<{ cancelledCount: number }>(`/admin/games/${gameId}/slots/cancel-all-confirmations`, { method: 'PUT' }),

  // ─── Subscriptions ────────────────────────────────────
  getSubscriptions: () => apiRequest('/admin/subscriptions'),
  cancelSubscription: (id: number) =>
    apiRequest(`/admin/subscriptions/${id}/cancel`, { method: 'POST' }),

  // ─── Stripe Products ──────────────────────────────────
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

  // ─── Tutorials ────────────────────────────────────────
  getTutorials: (params?: Record<string, string | undefined>) =>
    apiRequest(`/admin/tutorials${buildQuery(params)}`),
  getTutorial: (id: number) => apiRequest(`/admin/tutorials/${id}`),
  createTutorial: (data: Record<string, unknown>) =>
    apiRequest('/admin/tutorials', { method: 'POST', body: JSON.stringify(data) }),
  updateTutorial: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/tutorials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTutorial: (id: number) =>
    apiRequest(`/admin/tutorials/${id}`, { method: 'DELETE' }),
  getTutorialTags: () => apiRequest('/admin/tutorials/tags'),
  createTutorialTag: (data: Record<string, unknown>) =>
    apiRequest('/admin/tutorials/tags', { method: 'POST', body: JSON.stringify(data) }),
  updateTutorialTag: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/tutorials/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTutorialTag: (id: number) =>
    apiRequest(`/admin/tutorials/tags/${id}`, { method: 'DELETE' }),
  getTutorialCategories: () => apiRequest('/admin/tutorials/categories'),
  createTutorialCategory: (data: Record<string, unknown>) =>
    apiRequest('/admin/tutorials/categories', { method: 'POST', body: JSON.stringify(data) }),
  updateTutorialCategory: (id: number, data: Record<string, unknown>) =>
    apiRequest(`/admin/tutorials/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTutorialCategory: (id: number) =>
    apiRequest(`/admin/tutorials/categories/${id}`, { method: 'DELETE' }),

  // ─── Messages ─────────────────────────────────────────
  getConversations: () => apiRequest('/messages/conversations'),
  getConversation: (id: number) => apiRequest(`/messages/conversations/${id}`),
  getConversationMessages: (id: number, page?: number, limit?: number) => {
    const params: Record<string, string | undefined> = {};
    if (page !== undefined) params.page = String(page);
    if (limit !== undefined) params.limit = String(limit);
    return apiRequest(`/messages/conversations/${id}/messages${buildQuery(params)}`);
  },
  sendMessage: (conversationId: number, content: string) =>
    apiRequest(`/messages/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
  markConversationAsRead: (id: number) =>
    apiRequest(`/messages/conversations/${id}/read`, { method: 'POST' }),
  startConversation: (data: Record<string, unknown>) =>
    apiRequest('/messages/conversations', { method: 'POST', body: JSON.stringify(data) }),
  createConversationFromAdmin: (targetUserIds: number[]) =>
    apiRequest('/messages/conversations/from-admin', {
      method: 'POST',
      body: JSON.stringify({ targetUserIds }),
    }),
  addAdminToConversation: (conversationId: number, adminId: number) =>
    apiRequest(`/messages/conversations/${conversationId}/admins`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    }),
  getUnreadCount: () => apiRequest<{ count: number }>('/messages/unread-count'),

  // ─── Audit ────────────────────────────────────────────
  getAuditLogs: (params?: Record<string, string | undefined>) =>
    apiRequest(`/admin/audit-logs${buildQuery(params)}`),
  getAuditLog: (id: number) => apiRequest(`/admin/audit-logs/${id}`),

  // ─── Dashboard ────────────────────────────────────────
  getDashboardStats: () => apiRequest('/admin/dashboard'),
  getSchedulerStatus: () => apiRequest('/admin/scheduler/status'),

  // ─── Config ───────────────────────────────────────────
  getConfig: () => apiRequest('/admin/config'),
  updateConfig: (data: Record<string, unknown>) =>
    apiRequest('/admin/config', { method: 'PATCH', body: JSON.stringify(data) }),

  // ─── Calendar ─────────────────────────────────────────
  getCalendarEvents: (params?: Record<string, string | undefined>) =>
    apiRequest(`/admin/calendar${buildQuery(params)}`),
};
