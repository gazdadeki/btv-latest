export const TEAM_NAMES = { A: "Sentinel", B: "Scourge" } as const;

export function teamDisplay(team: string): string {
  return TEAM_NAMES[team as keyof typeof TEAM_NAMES] ?? team;
}

export const GAME_STATUS_COLORS: Record<string, string> = {
  CREATED: "bg-blue-100 text-blue-700",
  OPEN: "bg-emerald-100 text-emerald-700",
  IN_PROGRESS: "bg-yellow-100 text-yellow-700",
  FINISHED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  RESERVED: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
  EXPIRED: "bg-gray-100 text-gray-600",
};

export const SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  EXPIRED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export const CALENDAR_STATUS_HEX: Record<string, string> = {
  CREATED: "#3b82f6",
  OPEN: "#10b981",
  IN_PROGRESS: "#f59e0b",
  FINISHED: "#22c55e",
  CANCELLED: "#ef4444",
  PSEUDO: "#9ca3af",
};

export const CALENDAR_STATUS_HEX_GOLD = "#eab308";

export const CALENDAR_STATUS_ICONS: Record<string, string> = {
  CREATED: "fa-circle",
  OPEN: "fa-unlock-alt",
  IN_PROGRESS: "fa-play-circle",
  FINISHED: "fa-check-circle",
  CANCELLED: "fa-times-circle",
  PSEUDO: "fa-question-circle",
};

export const USER_ROLES = ["player", "admin"] as const;
export const SUBSCRIPTION_TIERS = ["FREE", "GOLD"] as const;
export const RECURRENCE_TYPES = [
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
  "ONCE",
] as const;
export const REFUND_POLICIES = ["FULL", "PARTIAL", "NONE"] as const;
export const WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;
export const WEEKDAY_LABELS_SUNDAY_FIRST = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;
export const TUTORIAL_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
export const EVENTS_PER_DAY_LIMIT = 5;

export const BILLING_PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "/month",
  SIX_MONTHS: "/6 months",
  YEARLY: "/year",
};
