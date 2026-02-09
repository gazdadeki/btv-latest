import { AuthUtils, AuthUser } from './auth';

const API_BASE_URL = 'http://localhost:3000/api/v1';

export class ApiClient {
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;
  private activeRequests: Map<string, Promise<unknown>> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
    };
  }

  private simpleHash(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      const char = value.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash;
    }
    return hash.toString(36);
  }

  generateRequestSignature(
    endpoint: string,
    options: RequestInit = {},
  ): string {
    const method = (options.method || 'GET').toUpperCase();
    const bodyHash =
      typeof options.body === 'string' ? this.simpleHash(options.body) : '';
    return `${method}:${endpoint}:${bodyHash}`;
  }

  cancelRequest(signature: string) {
    const controller = this.abortControllers.get(signature);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(signature);
      this.activeRequests.delete(signature);
    }
  }

  cancelAllRequests() {
    for (const controller of this.abortControllers.values()) {
      controller.abort();
    }
    this.abortControllers.clear();
    this.activeRequests.clear();
  }

  private isOnAdminLoginRoute(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const path = window.location.pathname;
    return (
      path === '/admin/login' ||
      path === '/admin/login/' ||
      path === '/admin/login.html'
    );
  }

  private clearClientAuthState() {
    try {
      sessionStorage.setItem('logoutInProgress', 'true');
    } catch {
      // sessionStorage might not be available
    }

    AuthUtils.clearAuth();
    this.cancelAllRequests();
  }

  private redirectToLoginIfNeeded() {
    if (typeof window === 'undefined') {
      return;
    }
    if (this.isOnAdminLoginRoute()) {
      return;
    }
    window.location.href = '/admin/login';
  }

  private handleAuthFailure(message: string): Error {
    this.clearClientAuthState();
    this.redirectToLoginIfNeeded();
    return new Error(message);
  }

  private async handleResponse<T>(
    response: Response,
    originalUrl: string | null = null,
    originalOptions: RequestInit | null = null,
    isRetry = false,
    signal: AbortSignal | null = null,
  ): Promise<T> {
    if (response.status === 401) {
      if (
        originalUrl &&
        (originalUrl.includes('/auth/login') ||
          originalUrl.includes('/auth/refresh') ||
          originalUrl.includes('/auth/logout'))
      ) {
        const error = await response
          .json()
          .catch(() => ({ message: 'Authentication failed' }));
        throw new Error(
          (error as { message?: string }).message || 'Authentication failed',
        );
      }

      let logoutAlreadyInProgress = false;
      try {
        logoutAlreadyInProgress =
          sessionStorage.getItem('logoutInProgress') === 'true';
      } catch {
        // sessionStorage might not be available
      }
      if (logoutAlreadyInProgress) {
        throw this.handleAuthFailure('Session expired. Please login again.');
      }

      if (isRetry) {
        throw this.handleAuthFailure('Session expired. Please login again.');
      }

      const refreshed = await this.refresh();
      if (refreshed && originalUrl && originalOptions) {
        if (signal && signal.aborted) {
          throw new DOMException('Request was cancelled', 'AbortError');
        }

        const retryResponse = await fetch(originalUrl, {
          ...originalOptions,
          credentials: 'include',
          signal,
        });
        return this.handleResponse<T>(
          retryResponse,
          originalUrl,
          originalOptions,
          true,
          signal,
        );
      }
      throw this.handleAuthFailure('Session expired. Please login again.');
    }

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: 'An error occurred' }));
      throw new Error(
        (error as { message?: string }).message || `HTTP ${response.status}`,
      );
    }

    return (await response.json()) as T;
  }

  async request<T = unknown>(
    endpoint: string,
    options: RequestInit = {},
    skipCancellation = false,
  ): Promise<T> {
    const signature = this.generateRequestSignature(endpoint, options);

    if (!skipCancellation && this.activeRequests.has(signature)) {
      return this.activeRequests.get(signature) as Promise<T>;
    }

    if (!skipCancellation) {
      this.cancelRequest(signature);
    }

    const abortController = new AbortController();
    if (!skipCancellation) {
      this.abortControllers.set(signature, abortController);
    }

    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      ...this.getHeaders(),
      ...(options.headers || {}),
    };

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
      signal: abortController.signal,
    };

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, config);
        return await this.handleResponse<T>(
          response,
          url,
          config,
          false,
          abortController.signal,
        );
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.debug(`[API] Request cancelled: ${signature}`);
          throw error;
        }
        throw error;
      } finally {
        if (!skipCancellation) {
          this.abortControllers.delete(signature);
          this.activeRequests.delete(signature);
        }
      }
    })();

    if (!skipCancellation) {
      this.activeRequests.set(signature, requestPromise);
    }

    return requestPromise;
  }

  async login(email: string, password: string): Promise<{ user: AuthUser }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: 'Login failed. Please check your credentials.',
      }));
      throw new Error(
        (error as { message?: string }).message || `HTTP ${response.status}`,
      );
    }

    const data = (await response.json()) as { user?: AuthUser };
    if (data.user) {
      if (data.user.role !== 'admin') {
        throw new Error('Access denied. Admin privileges required.');
      }

      AuthUtils.setUserCookie(data.user, 7);
      return { user: data.user };
    }

    throw new Error('Invalid response from server');
  }

  async getWebSocketToken(): Promise<string> {
    const response = await this.request<{ token: string }>(
      '/auth/websocket-token',
      {},
      true,
    );
    return response.token;
  }

  async refresh(): Promise<boolean> {
    if (this.isRefreshing) {
      return this.refreshPromise || false;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        });

        if (!response.ok) {
          return false;
        }

        const data = (await response.json()) as { user?: AuthUser };
        if (data.user) {
          AuthUtils.setUserCookie(data.user, 7);
        }

        return true;
      } catch {
        return false;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async logout(): Promise<void> {
    this.clearClientAuthState();

    try {
      await this.request('/auth/logout', { method: 'POST' }, true);
    } catch (error) {
      console.debug('Logout API call failed (non-critical):', error);
    }

    this.redirectToLoginIfNeeded();
  }

  async getMe(): Promise<AuthUser> {
    return this.request('/auth/me');
  }

  async getDashboard(): Promise<Record<string, unknown>> {
    return this.request('/admin/dashboard');
  }

  async getCalendar(
    startDate?: string,
    endDate?: string,
  ): Promise<Record<string, unknown>> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return this.request(`/admin/calendar?${params.toString()}`);
  }

  async getUsers(filters: Record<string, unknown> = {}): Promise<unknown> {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return this.request(`/admin/users?${params.toString()}`);
  }

  async getUser(id: number): Promise<unknown> {
    return this.request(`/admin/users/${id}`);
  }

  async updateUser(id: number, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async createUser(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adminRequestVerification(userId: number): Promise<unknown> {
    return this.request(`/verification/admin/users/${userId}/request-verification`, {
      method: 'POST',
    });
  }

  async adminVerifyUser(userId: number): Promise<unknown> {
    return this.request(`/verification/admin/users/${userId}/verify`, {
      method: 'PUT',
    });
  }

  async getLatestVerificationCode(userId: number): Promise<unknown> {
    return this.request(`/verification/admin/users/${userId}/latest-code`);
  }

  async requestVerification(): Promise<unknown> {
    return this.request('/verification/request', { method: 'POST' });
  }

  async verifyUser(code: string): Promise<unknown> {
    return this.request('/verification/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  async deleteUser(id: number, reason: string | null = null): Promise<unknown> {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    });
  }

  async grantCoinsToUser(
    userId: number,
    amount: number,
    description = '',
  ): Promise<unknown> {
    return this.request(`/admin/users/${userId}/wallet/grant`, {
      method: 'PUT',
      body: JSON.stringify({ amount, description }),
    });
  }

  async getUserWalletTransactions(userId: number): Promise<unknown> {
    return this.request(`/admin/users/${userId}/wallet/transactions`);
  }

  async getSchedules(): Promise<unknown> {
    return this.request('/admin/schedules');
  }

  async getSchedule(id: number): Promise<unknown> {
    return this.request(`/admin/schedules/${id}`);
  }

  async createSchedule(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/admin/schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSchedule(id: number, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/admin/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteSchedule(id: number): Promise<unknown> {
    return this.request(`/admin/schedules/${id}`, { method: 'DELETE' });
  }

  async generateGamesForSchedule(
    scheduleId: number,
    date: string,
  ): Promise<unknown> {
    return this.request(`/admin/schedules/${scheduleId}/generate-games`, {
      method: 'POST',
      body: JSON.stringify({ date }),
    });
  }

  async getSchedulerStatus(): Promise<unknown> {
    return this.request('/admin/scheduler/status');
  }

  async getGames(filters: Record<string, unknown> = {}): Promise<unknown> {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return this.request(`/admin/games?${params.toString()}`);
  }

  async getGame(id: number): Promise<unknown> {
    return this.request(`/admin/games/${id}`);
  }

  async startGame(id: number): Promise<unknown> {
    return this.request(`/admin/games/${id}/start`, { method: 'PUT' });
  }

  async finishGame(id: number, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/admin/games/${id}/finish`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async cancelGame(id: number): Promise<unknown> {
    return this.request(`/admin/games/${id}/cancel`, { method: 'PUT' });
  }

  async updateGame(id: number, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/admin/games/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async assignUserToSlot(
    gameId: number,
    slotId: number,
    userId: number,
  ): Promise<unknown> {
    return this.request(`/admin/games/${gameId}/slots/${slotId}/assign`, {
      method: 'PUT',
      body: JSON.stringify({ userId }),
    });
  }

  async kickUserFromSlot(gameId: number, slotId: number): Promise<unknown> {
    return this.request(`/admin/games/${gameId}/slots/${slotId}/kick`, {
      method: 'PUT',
    });
  }

  async cancelAllActiveGames(): Promise<unknown> {
    return this.request('/admin/games/cancel-all-active', { method: 'POST' });
  }

  async confirmSlotReservation(gameId: number, slotId: number): Promise<unknown> {
    return this.request(`/admin/games/${gameId}/slots/${slotId}/confirm`, {
      method: 'PUT',
    });
  }

  async confirmAllSlotReservations(gameId: number): Promise<unknown> {
    return this.request(`/admin/games/${gameId}/slots/confirm-all`, {
      method: 'PUT',
    });
  }

  async cancelAllConfirmations(gameId: number): Promise<unknown> {
    return this.request(
      `/admin/games/${gameId}/slots/cancel-all-confirmations`,
      { method: 'PUT' },
    );
  }

  async autoStartNextGame(
    gameId: number,
    delayMinutes: number,
  ): Promise<unknown> {
    return this.request(`/admin/games/${gameId}/auto-start-next`, {
      method: 'POST',
      body: JSON.stringify({ delayMinutes }),
    });
  }

  async shuffleGamePlayers(gameId: number): Promise<unknown> {
    return this.request(`/admin/games/${gameId}/shuffle`, { method: 'POST' });
  }

  async createGame(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/admin/games', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getSubscriptions(): Promise<unknown> {
    return this.request('/admin/subscriptions');
  }

  async cancelSubscription(userId: number): Promise<unknown> {
    return this.request(`/admin/subscriptions/${userId}/cancel`, {
      method: 'POST',
    });
  }

  async getConfig(): Promise<unknown> {
    return this.request('/admin/config');
  }

  async getConfigKey(key: string): Promise<unknown> {
    return this.request(`/admin/config/${key}`);
  }

  async updateConfig(
    key: string,
    value: string,
    description?: string,
  ): Promise<unknown> {
    return this.request(`/admin/config/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ value, description }),
    });
  }

  async getAuditLogs(filters: Record<string, unknown> = {}): Promise<unknown> {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return this.request(`/admin/audit-logs?${params.toString()}`);
  }

  async getAuditLog(id: number): Promise<unknown> {
    return this.request(`/admin/audit-logs/${id}`);
  }

  async getStripeProducts(): Promise<unknown> {
    return this.request('/admin/stripe/products');
  }

  async createStripeProduct(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/admin/stripe/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStripeProduct(
    id: number,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    return this.request(`/admin/stripe/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async archiveStripeProduct(id: number): Promise<unknown> {
    return this.request(`/admin/stripe/products/${id}`, { method: 'DELETE' });
  }

  async syncStripeProduct(id: number): Promise<unknown> {
    return this.request(`/admin/stripe/products/${id}/sync`, {
      method: 'POST',
    });
  }

  async getConversations(): Promise<unknown> {
    return this.request('/messages/conversations');
  }

  async getConversation(id: number): Promise<unknown> {
    return this.request(`/messages/conversations/${id}`);
  }

  async getConversationMessages(
    id: number,
    page = 1,
    limit = 50,
  ): Promise<unknown> {
    return this.request(
      `/messages/conversations/${id}/messages?page=${page}&limit=${limit}`,
    );
  }

  async sendMessage(id: number, content: string): Promise<unknown> {
    return this.request(`/messages/conversations/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async markConversationAsRead(id: number): Promise<unknown> {
    return this.request(`/messages/conversations/${id}/read`, {
      method: 'POST',
    });
  }

  async getUnreadCount(): Promise<{ count: number }> {
    return this.request('/messages/unread-count');
  }

  async addAdminToConversation(
    id: number,
    adminId: number,
  ): Promise<unknown> {
    return this.request(`/messages/conversations/${id}/admins`, {
      method: 'POST',
      body: JSON.stringify({ adminId }),
    });
  }

  async createConversationFromAdmin(
    targetUserIds: number[],
  ): Promise<unknown> {
    return this.request('/messages/conversations/from-admin', {
      method: 'POST',
      body: JSON.stringify({ targetUserIds }),
    });
  }

  async getUserStripeInfo(userId: number): Promise<unknown> {
    return this.request(`/admin/users/${userId}/stripe`);
  }

  async linkUserStripeCustomer(
    userId: number,
    customerId: string,
  ): Promise<unknown> {
    return this.request(`/admin/users/${userId}/stripe/link`, {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    });
  }

  async unlinkUserStripeCustomer(userId: number): Promise<unknown> {
    return this.request(`/admin/users/${userId}/stripe/unlink`, {
      method: 'POST',
    });
  }

  async createStripeCustomerForUser(userId: number): Promise<unknown> {
    return this.request(`/admin/users/${userId}/stripe/create-customer`, {
      method: 'POST',
    });
  }

  async getAdminUserPaymentMethods(userId: number): Promise<unknown> {
    return this.request(`/admin/users/${userId}/payment-methods`);
  }

  async syncProductsFromStripe(): Promise<unknown> {
    return this.request('/admin/stripe/products/sync-from-stripe', {
      method: 'POST',
    });
  }

  async getTutorials(filters: Record<string, unknown> = {}): Promise<unknown> {
    const params = new URLSearchParams();
    Object.keys(filters).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    return this.request(`/admin/tutorials?${params.toString()}`);
  }

  async getTutorial(id: number): Promise<unknown> {
    return this.request(`/admin/tutorials/${id}`);
  }

  async createTutorial(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/admin/tutorials', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTutorial(
    id: number,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    return this.request(`/admin/tutorials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTutorial(id: number): Promise<unknown> {
    return this.request(`/admin/tutorials/${id}`, { method: 'DELETE' });
  }

  async getTags(): Promise<unknown> {
    return this.request('/admin/tutorials/tags');
  }

  async createTag(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/admin/tutorials/tags', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTag(id: number, data: Record<string, unknown>): Promise<unknown> {
    return this.request(`/admin/tutorials/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTag(id: number): Promise<unknown> {
    return this.request(`/admin/tutorials/tags/${id}`, { method: 'DELETE' });
  }

  async getCategories(): Promise<unknown> {
    return this.request('/admin/tutorials/categories');
  }

  async createCategory(data: Record<string, unknown>): Promise<unknown> {
    return this.request('/admin/tutorials/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCategory(
    id: number,
    data: Record<string, unknown>,
  ): Promise<unknown> {
    return this.request(`/admin/tutorials/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCategory(id: number): Promise<unknown> {
    return this.request(`/admin/tutorials/categories/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();

if (typeof window !== 'undefined') {
  window.api = api;
  window.addEventListener('beforeunload', () => {
    api.cancelAllRequests();
  });
}
