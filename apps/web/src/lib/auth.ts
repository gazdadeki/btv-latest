function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

export interface AdminUser {
  id: number;
  email: string;
  username?: string;
  role: string;
  isVerified: boolean;
  isBanned: boolean;
}

export const AuthUtils = {
  getAccessToken(): string | null {
    return getCookie("access_token");
  },

  getRefreshToken(): string | null {
    return getCookie("refresh_token");
  },

  getUser(): AdminUser | null {
    const raw = getCookie("user");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AdminUser;
    } catch {
      return null;
    }
  },

  setUserCookie(user: AdminUser) {
    setCookie("user", JSON.stringify(user), 7);
  },

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  clearAuth() {
    deleteCookie("access_token");
    deleteCookie("refresh_token");
    deleteCookie("user");
  },

  initUserDisplay() {
    // No-op in Next.js — handled by React components
  },
};
