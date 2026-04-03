import { AuthUtils } from "./auth";
import type {
  User,
  Game,
  Slot,
  Reservation,
  Product,
  Subscription,
  Transaction,
  Tutorial,
  TutorialFilters,
  Conversation,
  Message,
  PaginatedMessages,
  AdminUser,
  UserStatistics,
  GameStatusFilter,
  ScheduleSection,
  ActiveStream,
  PaymentMethod,
  StripePayment,
} from "@/types";

// ─── Base config ──────────────────────────────────────────────────────────────

const API_BASE =
  typeof window !== "undefined"
    ? `${window.location.origin}/api/v1`
    : `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1`;

// ─── Token refresh (single in-flight guard) ───────────────────────────────────

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function refreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        credentials: "include",
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

// ─── Core request ─────────────────────────────────────────────────────────────

async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const config: RequestInit = {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      throw new Error("Session expired");
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

function buildQuery(
  params: Record<string, string | number | boolean | undefined>,
): string {
  const filtered: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") filtered[k] = String(v);
  }
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `?${qs}` : "";
}

// ─── Auth endpoints (from auth_repository.dart) ───────────────────────────────

async function login(email: string, password: string): Promise<User> {
  const data = await apiRequest<{ user: User }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return data.user;
}

async function register(
  email: string,
  username: string,
  password: string,
): Promise<User> {
  const data = await apiRequest<{ user: User }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, username, password }),
  });
  return data.user;
}

async function logout(): Promise<void> {
  await apiRequest("/auth/logout", { method: "POST" }).catch(() => undefined);
}

// GET /auth/me returns User directly (no wrapper)
async function getMe(): Promise<User> {
  return apiRequest<User>("/auth/me");
}

async function updateProfile(fields: {
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
}): Promise<User> {
  const body: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) body[k] = v;
  }
  return apiRequest<User>("/auth/me", {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function forgotPassword(email: string): Promise<unknown> {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

async function resetPassword(
  token: string,
  password: string,
): Promise<unknown> {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

async function getWebSocketToken(): Promise<string> {
  const data = await apiRequest<{ token: string }>("/auth/websocket-token");
  return data.token;
}

async function requestVerification(): Promise<unknown> {
  return apiRequest("/verification/request", { method: "POST" });
}

async function verifyEmail(code: string): Promise<unknown> {
  return apiRequest("/verification/verify", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

// ─── Games (from game_repository.dart) ───────────────────────────────────────

async function getSchedulesToday(
  filter: GameStatusFilter,
): Promise<ScheduleSection[]> {
  const params: Record<string, boolean | undefined> = {};
  if (!filter.includeCreated) params["includeCreated"] = false;
  if (!filter.includeOpen) params["includeOpen"] = false;
  if (!filter.includeInProgress) params["includeInProgress"] = false;
  if (!filter.includeFinished) params["includeFinished"] = false;
  if (filter.includeCancelled) params["includeCancelled"] = true;

  const qs = buildQuery(
    params as Record<string, string | number | boolean | undefined>,
  );
  const raw = await apiRequest<
    Array<{
      schedule: {
        id: number;
        name: string;
        description?: string;
        teamAName: string;
        teamBName: string;
      };
      games: Game[];
    }>
  >(`/players/schedules/today${qs}`);
  return raw.map((item) => ({
    id: item.schedule.id,
    name: item.schedule.name,
    description: item.schedule.description,
    teamAName: item.schedule.teamAName,
    teamBName: item.schedule.teamBName,
    games: item.games,
  }));
}

async function getActiveStream(
  filter: GameStatusFilter,
): Promise<ActiveStream | null> {
  const params: Record<string, boolean | undefined> = {};
  if (!filter.includeCreated) params["includeCreated"] = false;
  if (!filter.includeOpen) params["includeOpen"] = false;
  if (!filter.includeInProgress) params["includeInProgress"] = false;
  if (!filter.includeFinished) params["includeFinished"] = false;
  if (filter.includeCancelled) params["includeCancelled"] = true;

  const qs = buildQuery(
    params as Record<string, string | number | boolean | undefined>,
  );
  const res = await apiRequest<ActiveStream | null>(
    `/players/stream/active${qs}`,
  );
  return res ?? null;
}

async function getAvailableGames(): Promise<Game[]> {
  return apiRequest<Game[]>("/players/games/available");
}

async function getGameDetails(id: number): Promise<Game> {
  return apiRequest<Game>(`/players/games/${id}`);
}

async function getGameSlots(id: number): Promise<Slot[]> {
  return apiRequest<Slot[]>(`/players/games/${id}/slots`);
}

// ─── Reservations (from reservation_repository.dart) ─────────────────────────

async function getMyReservations(): Promise<Reservation[]> {
  return apiRequest<Reservation[]>("/players/reservations/my");
}

async function reserveSlot(
  gameId: number,
  slotId: number,
  team: "A" | "B",
  useInstantReservation = false,
): Promise<Reservation> {
  return apiRequest<Reservation>(
    `/players/games/${gameId}/slots/${slotId}/reserve`,
    {
      method: "POST",
      body: JSON.stringify({ team, useInstantReservation }),
    },
  );
}

async function confirmReservation(id: number): Promise<Reservation> {
  return apiRequest<Reservation>(`/players/reservations/${id}/confirm`, {
    method: "POST",
  });
}

async function cancelReservation(id: number): Promise<void> {
  return apiRequest(`/players/reservations/${id}`, { method: "DELETE" });
}

// ─── Wallet (from wallet_repository.dart) ────────────────────────────────────

async function getWalletBalance(): Promise<number> {
  const data = await apiRequest<{ balance: number }>("/players/wallet");
  return data.balance;
}

async function getWalletTransactions(
  page = 1,
  limit = 50,
): Promise<{
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}> {
  const data = await apiRequest<{
    data: Transaction[];
    total: number;
    page: number;
    limit: number;
  }>(`/players/wallet/transactions${buildQuery({ page, limit })}`);
  return {
    transactions: data.data,
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

// ─── Statistics (from statistics_repository.dart) ────────────────────────────

async function getMyStatistics(): Promise<UserStatistics> {
  return apiRequest<UserStatistics>("/players/statistics/my");
}

// ─── Subscriptions (from subscription_repository.dart) ───────────────────────

async function getCurrentSubscription(): Promise<Subscription | null> {
  try {
    const data = await apiRequest<{ subscription: Subscription | null }>(
      "/players/subscription",
    );
    return data.subscription ?? null;
  } catch {
    return null;
  }
}

async function getSubscriptionHistory(): Promise<Subscription[]> {
  const data = await apiRequest<{ subscriptions: Subscription[] }>(
    "/players/subscription/history",
  );
  return data.subscriptions;
}

async function subscribe(
  productId: number,
  paymentMethodId?: string,
): Promise<Subscription> {
  const data = await apiRequest<{ subscription: Subscription }>(
    "/players/subscription/subscribe",
    {
      method: "POST",
      body: JSON.stringify({
        productId,
        ...(paymentMethodId ? { paymentMethodId } : {}),
      }),
    },
  );
  return data.subscription;
}

async function cancelSubscription(): Promise<void> {
  return apiRequest("/players/subscription/cancel", { method: "POST" });
}

async function createSubscriptionIntent(
  productId: number,
  paymentMethodId?: string,
): Promise<{
  subscriptionId: string;
  customerId?: string;
  clientSecret?: string;
}> {
  return apiRequest("/players/stripe/subscription-intent", {
    method: "POST",
    body: JSON.stringify({
      productId,
      ...(paymentMethodId ? { paymentMethodId } : {}),
    }),
  });
}

async function createSetupIntent(): Promise<string> {
  const data = await apiRequest<{ clientSecret: string }>(
    "/players/stripe/setup-intent",
    {
      method: "POST",
    },
  );
  return data.clientSecret;
}

async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const data = await apiRequest<{ paymentMethods: PaymentMethod[] }>(
    "/players/stripe/payment-methods",
  );
  return data.paymentMethods;
}

async function attachPaymentMethod(
  paymentMethodId: string,
): Promise<PaymentMethod> {
  const data = await apiRequest<{ paymentMethod: PaymentMethod }>(
    "/players/stripe/payment-methods",
    {
      method: "POST",
      body: JSON.stringify({ paymentMethodId }),
    },
  );
  return data.paymentMethod;
}

async function deletePaymentMethod(id: string): Promise<void> {
  return apiRequest(`/players/stripe/payment-methods/${id}`, {
    method: "DELETE",
  });
}

async function setDefaultPaymentMethod(id: string): Promise<void> {
  return apiRequest(`/players/stripe/payment-methods/${id}/default`, {
    method: "PUT",
  });
}

// ─── Products (from product_repository.dart) ─────────────────────────────────

async function getProducts(): Promise<Product[]> {
  const data = await apiRequest<{ products: Product[] }>(
    "/players/stripe/products",
  );
  return data.products;
}

async function createPaymentIntent(
  productId: number,
  paymentMethodId?: string,
): Promise<string> {
  const data = await apiRequest<{ clientSecret: string }>(
    "/players/stripe/payment-intent",
    {
      method: "POST",
      body: JSON.stringify({
        productId,
        ...(paymentMethodId ? { paymentMethodId } : {}),
      }),
    },
  );
  return data.clientSecret;
}

async function checkPaymentStatus(paymentIntentId: string): Promise<unknown> {
  return apiRequest(`/players/stripe/payment-status/${paymentIntentId}`);
}

async function syncPaymentStatus(paymentIntentId: string): Promise<unknown> {
  return apiRequest("/players/stripe/sync-payment-status", {
    method: "POST",
    body: JSON.stringify({ paymentIntentId }),
  });
}

// ─── Tutorials (from tutorial_repository.dart) ───────────────────────────────

async function getTutorials(filters?: TutorialFilters): Promise<Tutorial[]> {
  const params: Record<string, string | number | boolean | undefined> = {};
  if (filters?.featured !== undefined) params["featured"] = filters.featured;
  if (filters?.categoryId !== undefined)
    params["categoryId"] = filters.categoryId;
  if (filters?.tagId !== undefined) params["tagId"] = filters.tagId;
  if (filters?.search) params["search"] = filters.search;
  return apiRequest<Tutorial[]>(`/players/tutorials${buildQuery(params)}`);
}

async function getTutorialById(id: number): Promise<Tutorial> {
  return apiRequest<Tutorial>(`/players/tutorials/${id}`);
}

async function getTutorialBySlug(slug: string): Promise<Tutorial> {
  return apiRequest<Tutorial>(`/players/tutorials/slug/${slug}`);
}

// ─── Messages (from message_repository.dart) ──────────────────────────────────

async function getConversations(): Promise<Conversation[]> {
  return apiRequest<Conversation[]>("/messages/conversations");
}

async function getConversation(id: number): Promise<Conversation> {
  return apiRequest<Conversation>(`/messages/conversations/${id}`);
}

async function createConversation(adminId: number): Promise<Conversation> {
  return apiRequest<Conversation>("/messages/conversations", {
    method: "POST",
    body: JSON.stringify({ adminId }),
  });
}

async function getConversationMessages(
  conversationId: number,
  page = 1,
  limit = 50,
): Promise<PaginatedMessages> {
  return apiRequest<PaginatedMessages>(
    `/messages/conversations/${conversationId}/messages${buildQuery({ page, limit })}`,
  );
}

async function sendMessage(
  conversationId: number,
  content: string,
): Promise<Message> {
  return apiRequest<Message>(
    `/messages/conversations/${conversationId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}

async function markConversationAsRead(id: number): Promise<void> {
  return apiRequest(`/messages/conversations/${id}/read`, { method: "POST" });
}

async function getUnreadCount(): Promise<number> {
  const data = await apiRequest<{ count: number }>("/messages/unread-count");
  return data.count;
}

async function getAdmins(search?: string): Promise<AdminUser[]> {
  const qs = search ? buildQuery({ search }) : "";
  return apiRequest<AdminUser[]>(`/messages/admins${qs}`);
}

// ─── Exported API object ──────────────────────────────────────────────────────

export const api = {
  // Auth
  login,
  register,
  logout,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  getWebSocketToken,
  requestVerification,
  verifyEmail,
  // Games
  getSchedulesToday,
  getActiveStream,
  getAvailableGames,
  getGameDetails,
  getGameSlots,
  // Reservations
  getMyReservations,
  reserveSlot,
  confirmReservation,
  cancelReservation,
  // Wallet
  getWalletBalance,
  getWalletTransactions,
  // Statistics
  getMyStatistics,
  // Subscriptions
  getCurrentSubscription,
  getSubscriptionHistory,
  subscribe,
  cancelSubscription,
  createSubscriptionIntent,
  createSetupIntent,
  getPaymentMethods,
  attachPaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  // Products
  getProducts,
  createPaymentIntent,
  checkPaymentStatus,
  syncPaymentStatus,
  // Tutorials
  getTutorials,
  getTutorialById,
  getTutorialBySlug,
  // Messages
  getConversations,
  getConversation,
  createConversation,
  getConversationMessages,
  sendMessage,
  markConversationAsRead,
  getUnreadCount,
  getAdmins,
};
