export interface Slot {
  id: number;
  slotNumber: number;
  team: string;
  isReserved: boolean;
  reservedByUserId: number | null;
  isPreAssigned: boolean;
  preAssignedUserId: number | null;
  reservedByUser?: { email: string };
}

export interface Reservation {
  id: number;
  slotId: number;
  userId: number;
  gameId: number;
  status: string;
  reservedAt: string;
  confirmedAt: string | null;
  user?: { email: string };
  slot?: { slotNumber: number };
}

export type GameStatus =
  | "CREATED"
  | "OPEN"
  | "IN_PROGRESS"
  | "FINISHED"
  | "CANCELLED";

export interface Game {
  id: number;
  scheduleId: number;
  schedule?: { name: string };
  scheduledStartTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  durationMinutes?: number;
  status: GameStatus;
  teamAName: string;
  teamBName: string;
  isExclusiveToGold: boolean;
  winningTeam?: string;
  mvpUserId?: number;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  slotsReserved?: number;
  totalSlots?: number;
  slots?: Slot[];
  reservations?: Reservation[];
}

export type StreamStatus = "PENDING" | "LIVE" | "ENDED";

export interface Stream {
  id: number;
  scheduleId: number;
  status: StreamStatus;
  schedule?: { name: string };
  games?: Game[];
  createdAt: string;
  updatedAt: string;
}

export interface SlotConfig {
  slotNumber: number;
  team: string;
  isGoldOnly?: boolean;
  coinsCost?: number | null;
  preAssignedUserId?: number | null;
}

export interface Schedule {
  id: number;
  name: string;
  description?: string;
  recurrenceType: string;
  recurrenceDays?: number[] | null;
  recurrencePattern?: { year?: number; month: number; day: number } | null;
  isActive: boolean;
  slotsPerGame: number;
  reservationCost: number;
  instantReservationCost?: number;
  confirmationWindowMinutes: number;
  refundPolicy: string;
  refundPercentage?: number;
  isExclusiveToGold: boolean;
  firstGameStartTime?: string;
  gameCreationTime?: string;
  reservationOpenTime?: string | null;
  scheduleStartDate?: string | null;
  scheduleEndDate?: string | null;
  gamesPerDay: number;
  spacingAfterFinishMinutes?: number;
  teamAName: string;
  teamBName: string;
  reminderMinutesBefore?: number[];
  url?: string;
  createdAt: string;
  slotConfigs?: SlotConfig[];
  games?: Pick<
    Game,
    "id" | "status" | "scheduledStartTime" | "slotsReserved" | "totalSlots"
  >[];
}

export interface AdminUser {
  id: number;
  email: string;
  username?: string | null;
  role: string;
  subscriptionTier: string;
  isVerified: boolean;
  isBanned: boolean;
  isVoided?: boolean;
  stripeCustomerId?: string | null;
  createdAt: string;
  wallet?: { balance: string | number };
  statistics?: Record<string, number>;
  fullName?: string | null;
  bannedUntil?: string | null;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
}

export interface WalletTx {
  id: number;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface StripeInfo {
  customerId?: string;
  email?: string;
  name?: string;
  created?: string;
}

export interface Subscription {
  id: number;
  userId: number;
  user?: { email: string };
  tier: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
}

export interface AuditLog {
  id: number;
  createdAt: string;
  userEmail?: string;
  userId?: number;
  action: string;
  entityType: string;
  entityId?: string | number;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  user?: { id: number; email: string; username?: string; role?: string };
}

export interface Tutorial {
  id: number;
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  status?: string;
  isPublished: boolean;
  isFeatured?: boolean;
  createdAt: string;
  tags?: Array<{ id: number; name: string }>;
  category?: { id: number; name: string };
  categoryId?: number;
  tagIds?: number[];
}

export interface TutorialTag {
  id: number;
  name: string;
}

export interface TutorialCategory {
  id: number;
  name: string;
  description?: string;
}

export interface StripeProduct {
  id: number;
  name: string;
  description?: string;
  type: "SUBSCRIPTION" | "COIN_PACK";
  isActive: boolean;
  isArchived: boolean;
  syncStatus?: string;
  productData: {
    price: number;
    coins?: number;
    billingPeriod?: string;
    tier?: string;
  };
  stripeProductId?: string;
  stripePriceId?: string;
  displayOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: number;
  title?: string;
  scheduledStartTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  status: string;
  isPseudo?: boolean;
  isExclusiveToGold?: boolean;
  orderIndex?: number;
  scheduleId?: number;
  scheduleName?: string;
  schedule?: { name: string; id: number };
  teamAName?: string;
  teamBName?: string;
  slotsReserved?: number;
  totalSlots?: number;
  slotsConfirmed?: number;
  slotsAvailable?: number;
  slots?: Array<{ id: number; slotNumber: number; isReserved: boolean }>;
  reservations?: Array<{
    id: number;
    userId: number;
    status: string;
    reservedAt?: string;
    confirmedAt?: string;
    user?: { email: string };
    slot?: { slotNumber: number };
  }>;
}

export interface Conversation {
  id: number;
  type?: string;
  participants: Array<{ id: number; email: string; username?: string }>;
  lastMessage?: { content: string; createdAt: string };
  unreadCount?: number;
}

export interface ChatMessage {
  id: number;
  content: string;
  senderId: number;
  createdAt: string;
  sender?: { email: string; username?: string };
}

export interface DashboardData {
  activeSchedules?: number;
  upcomingGames?: number;
  totalUsers?: number;
  verifiedUsers?: number;
  bannedUsers?: number;
  totalCoins?: number;
  activeSubscriptions?: number;
  onlineUsers?: number;
  pendingSubscriptions?: number;
  expiredSubscriptions?: number;
}

export interface SchedulerStatus {
  lastExecutionTime?: string;
  lastExecutionStatus?: string;
  executionCount?: number;
  lastExecutionError?: string;
}

export interface ConfirmActionState {
  title: string;
  message: string;
  variant?: "danger" | "default";
  onConfirm: () => void;
}
