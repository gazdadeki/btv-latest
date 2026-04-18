import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Formatters (from Mobile/lib/shared/utils/formatters.dart) ────────────────

export function formatDateTime(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

export function formatDate(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return dateString;
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

// Matches Flutter's Formatters.formatTimeAgo() exactly
export function formatTimeAgo(dateString: string): string {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 7) {
      return formatDate(dateString);
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes} minute${diffMinutes > 1 ? "s" : ""} ago`;
    } else {
      return "Just now";
    }
  } catch {
    return dateString;
  }
}

// ─── Validators (from Mobile/lib/shared/utils/validators.dart) ───────────────

export function validateEmail(value: string): string | null {
  if (!value || value.trim() === "") return "Email is required";
  const emailRegex = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;
  if (!emailRegex.test(value)) return "Please enter a valid email";
  return null;
}

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 14;

export function validateUsername(value: string): string | null {
  if (!value || value.trim() === "") return "Username is required";
  if (value.length < USERNAME_MIN_LENGTH)
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  if (value.length > USERNAME_MAX_LENGTH)
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  const usernameRegex = /^[A-Za-z0-9._\-()[\]]+$/;
  if (!usernameRegex.test(value)) {
    return "Username can only contain letters, numbers, and . - _ [ ] ( )";
  }
  return null;
}

export function validatePassword(value: string): string | null {
  if (!value || value.trim() === "") return "Password is required";
  if (value.length < 6) return "Password must be at least 6 characters";
  return null;
}

export function validateRequired(
  value: string,
  fieldName: string,
): string | null {
  if (!value || value.trim() === "") return `${fieldName} is required`;
  return null;
}

// ─── Toast helper ─────────────────────────────────────────────────────────────

export function toastError(err: unknown, prefix = "Error") {
  toast.error(
    `${prefix}: ${err instanceof Error ? err.message : "Something went wrong"}`,
  );
}
