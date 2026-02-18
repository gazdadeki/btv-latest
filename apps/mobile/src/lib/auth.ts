import type { User } from '@/types';

// ─── Cookie helpers ───────────────────────────────────────────────────────────

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ─── Auth cookie names (player app — no admin_ prefix) ───────────────────────

const COOKIE_USER = 'user';

// ─── Auth utilities ───────────────────────────────────────────────────────────

export const AuthUtils = {
  getUser(): User | null {
    const raw = getCookie(COOKIE_USER);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },

  setUserCookie(user: User) {
    setCookie(COOKIE_USER, JSON.stringify(user), 7);
  },

  isAuthenticated(): boolean {
    // Auth is cookie-based (httpOnly). We use the user cookie as a client-side
    // indicator — the actual auth is enforced by the backend via httpOnly cookies.
    return !!getCookie(COOKIE_USER);
  },

  clearAuth() {
    deleteCookie(COOKIE_USER);
    // The httpOnly access_token and refresh_token are cleared server-side on logout.
    // We also attempt to clear them client-side in case they're not httpOnly in dev.
    deleteCookie('access_token');
    deleteCookie('refresh_token');
  },
};
