// ─── User ─────────────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  username?: string;
  role: string;
  subscriptionTier: string;
  isVerified: boolean;
  isBanned: boolean;
  bannedUntil?: string;
  fullName?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  avatarId?: number | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AvatarTier = "FREE" | "GOLD" | "ADMIN";

export interface Avatar {
  id: number;
  key: string;
  filename: string;
  url: string;
  tier: AvatarTier;
  displayName?: string | null;
  sortOrder: number;
}

export const AVATAR_PLACEHOLDER_URL = "/avatars/placeholder-avatar.png";

export function isPlayer(user: User) {
  return user.role === "player";
}
export function isAdmin(user: User) {
  return user.role === "admin";
}
export function isGold(user: User) {
  return user.subscriptionTier === "GOLD";
}
export function isFree(user: User) {
  return user.subscriptionTier === "FREE";
}

// ─── Game ─────────────────────────────────────────────────────────────────────

export type GameStatus =
  | "CREATED"
  | "OPEN"
  | "IN_PROGRESS"
  | "FINISHED"
  | "CANCELLED";

export const GAME_STATUS_DISPLAY: Record<GameStatus, string> = {
  CREATED: "Upcoming",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  FINISHED: "Finished",
  CANCELLED: "Cancelled",
};

export interface Game {
  id: number;
  // scheduleId is no longer a column on games — when surfaced in API responses,
  // it's derived from stream.scheduleId for backward-compat.
  scheduleId?: number | null;
  streamId: number;
  gameIndex?: number | null;
  scheduledStartTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: GameStatus;
  isExclusiveToGold: boolean;
  allowMultipleReservations?: boolean;
  winningTeam?: "A" | "B" | null;
  slots: Slot[];
  createdAt: string;
  updatedAt: string;
}

export function gameIsAvailable(g: Game) {
  return g.status === "CREATED" || g.status === "OPEN";
}
export function gameIsInProgress(g: Game) {
  return g.status === "IN_PROGRESS";
}
export function gameIsFinished(g: Game) {
  return g.status === "FINISHED";
}
export function gameIsCancelled(g: Game) {
  return g.status === "CANCELLED";
}
export function availableSlotsCount(g: Game) {
  return g.slots.filter((s) => !s.isReserved).length;
}
export function reservedSlotsCount(g: Game) {
  return g.slots.filter((s) => s.isReserved).length;
}

// ─── Slot ─────────────────────────────────────────────────────────────────────

export type Team = "A" | "B";

export const TEAM_DISPLAY: Record<Team, string> = {
  A: "Sentinel",
  B: "Scourge",
};

export interface Slot {
  id: number;
  gameId: number;
  slotNumber: number;
  team: Team;
  isReserved: boolean;
  reservedByUserId?: number;
  reservedByUsername?: string;
  reservedByRole?: string;
  reservedByAvatarUrl?: string | null;
  reservationId?: number;
  reservationStatus?: string;
  isGoldOnly?: boolean;
  createdAt: string;
  updatedAt: string;
}

export function slotIsPending(s: Slot) {
  return s.reservationStatus?.toUpperCase() === "RESERVED";
}
export function slotIsConfirmed(s: Slot) {
  return s.reservationStatus?.toUpperCase() === "CONFIRMED";
}

// ─── Reservation ──────────────────────────────────────────────────────────────

export type ReservationStatus =
  | "RESERVED"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export interface Reservation {
  id: number;
  gameId: number;
  slotId: number;
  userId: number;
  team: Team;
  status: ReservationStatus;
  game?: Game;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export function reservationIsPending(r: Reservation) {
  return r.status === "RESERVED";
}
export function reservationIsConfirmed(r: Reservation) {
  return r.status === "CONFIRMED";
}
export function reservationIsCancelled(r: Reservation) {
  return r.status === "CANCELLED";
}
export function reservationIsExpired(r: Reservation) {
  return r.status === "EXPIRED";
}
export function reservationIsActive(r: Reservation) {
  return r.status === "RESERVED" || r.status === "CONFIRMED";
}

// ─── Product ──────────────────────────────────────────────────────────────────

export type ProductType = "SUBSCRIPTION" | "COIN_PACK";

export interface ProductData {
  price?: number;
  coins?: number;
  billingPeriod?: string;
  tier?: string;
}

export interface Product {
  id: number;
  stripeProductId: string;
  stripePriceId?: string;
  name: string;
  description?: string;
  type: ProductType;
  productData: ProductData;
  isActive: boolean;
  isArchived: boolean;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export function productIsSubscription(p: Product) {
  return p.type === "SUBSCRIPTION";
}
export function productIsCoinPack(p: Product) {
  return p.type === "COIN_PACK";
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export type SubscriptionTier = "FREE" | "GOLD";
export type SubscriptionStatus = "ACTIVE" | "CANCELLED" | "EXPIRED" | "PENDING";
export type BillingPeriod = "MONTHLY" | "SIXMONTHS" | "YEARLY";

export interface Subscription {
  id: number;
  userId: number;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod?: BillingPeriod;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  payments?: StripePayment[];
}

export function subscriptionIsActive(s: Subscription) {
  return s.status === "ACTIVE";
}
export function subscriptionIsGold(s: Subscription) {
  return s.tier === "GOLD";
}
export function subscriptionIsFree(s: Subscription) {
  return s.tier === "FREE";
}

// ─── Stripe Payment ───────────────────────────────────────────────────────────

export type StripePaymentType = "SUBSCRIPTION" | "COIN_PACK";
export type StripePaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export interface StripePayment {
  id: number;
  userId: number;
  stripeProductId: number;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  type: StripePaymentType;
  status: StripePaymentStatus;
  amount: number;
  currency: string;
  coinsGranted?: number;
  subscriptionId?: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Transaction ──────────────────────────────────────────────────────────────

export type TransactionType =
  | "DEPOSIT"
  | "WITHDRAWAL"
  | "RESERVATIONCOST"
  | "CONFIRMATIONCOST"
  | "REFUND"
  | "REWARD"
  | "STRIPEPURCHASE";

export interface Transaction {
  id: number;
  walletId: number;
  type: TransactionType;
  amount: number;
  description?: string;
  createdAt: string;
}

export function transactionIsPositive(t: Transaction): boolean {
  return ["DEPOSIT", "REFUND", "REWARD", "STRIPEPURCHASE"].includes(t.type);
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface Wallet {
  id: number;
  userId: number;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Category ─────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Tutorial ─────────────────────────────────────────────────────────────────

export type TutorialStatus = "DRAFT" | "PUBLISHED";

export interface TutorialAuthor {
  id: number;
  username: string;
  avatarUrl: string | null;
}

export interface Tutorial {
  id: number;
  title: string;
  slug: string;
  body: string;
  excerpt?: string | null;
  youtubeUrl?: string | null;
  status: TutorialStatus;
  viewCount: number;
  authorId: number;
  categoryId: number;
  createdAt: string;
  updatedAt: string;
  author: TutorialAuthor | null;
  category: Category | null;
}

export interface TutorialFilters {
  categoryId?: number;
  search?: string;
}

// ─── Conversation & Message ───────────────────────────────────────────────────

export type ConversationType = "DIRECT" | "GROUP";

export interface ConversationParticipant {
  id: number;
  email: string;
  role: string;
}

export interface MessageSender {
  id: number;
  email: string;
}

export interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  sender?: MessageSender;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Conversation {
  id: number;
  type: ConversationType;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  participants: ConversationParticipant[];
  lastMessage?: Message;
  lastReadAt?: string;
  unreadCount: number;
}

export interface PaginatedMessages {
  messages: Message[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Admin User (for conversation creation) ───────────────────────────────────

export interface AdminUser {
  id: number;
  username?: string;
  email: string;
}

export function adminDisplayName(a: AdminUser): string {
  return a.username ?? a.email;
}

// ─── User Statistics ──────────────────────────────────────────────────────────

export interface UserStatistics {
  id: number;
  userId: number;
  totalWins: number;
  totalLosses: number;
  totalCoinsSpent: number;
  totalCoinsEarned: number;
  createdAt: string;
  updatedAt: string;
}

export function totalGamesPlayed(s: UserStatistics): number {
  return s.totalWins + s.totalLosses;
}
export function winRate(s: UserStatistics): number {
  const played = totalGamesPlayed(s);
  if (played === 0) return 0;
  return (s.totalWins / played) * 100;
}
export function netCoins(s: UserStatistics): number {
  return s.totalCoinsEarned - s.totalCoinsSpent;
}

// ─── Game Filter ──────────────────────────────────────────────────────────────

export interface GameStatusFilter {
  includeCreated: boolean;
  includeOpen: boolean;
  includeInProgress: boolean;
  includeFinished: boolean;
  includeCancelled: boolean;
}

export const DEFAULT_GAME_FILTER: GameStatusFilter = {
  includeCreated: true,
  includeOpen: true,
  includeInProgress: true,
  includeFinished: true,
  includeCancelled: false,
};

// ─── Schedule (from today's games endpoint) ───────────────────────────────────

export interface ScheduleSection {
  id: number;
  name: string;
  description?: string;
  teamAName: string;
  teamBName: string;
  games: Game[];
}

// ─── Stream (from active stream endpoint) ─────────────────────────────────────

export interface ActiveStream {
  stream: {
    id: number;
    status: string;
    title: string | null;
    url: string | null;
    scheduleId: number;
    scheduleName: string;
    teamAName: string;
    teamBName: string;
  };
  games: Game[];
}

// ─── Payment Method ───────────────────────────────────────────────────────────

export interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}
