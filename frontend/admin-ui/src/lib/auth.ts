export interface AuthUser {
  id: number;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export const AuthUtils = {
  COOKIE_NAMES: {
    ACCESS_TOKEN: 'admin_access_token',
    REFRESH_TOKEN: 'admin_refresh_token',
    USER: 'admin_user',
  },

  getCookie(name: string): string | null {
    const nameEq = `${name}=`;
    const parts = document.cookie.split(';');
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith(nameEq)) {
        return trimmed.substring(nameEq.length);
      }
    }
    return null;
  },

  setCookie(name: string, value: string, days = 7) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    const sameSite = '; SameSite=Lax';
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/${secure}${sameSite}`;
  },

  deleteCookie(name: string) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },

  getUser(): AuthUser | null {
    const userCookie = this.getCookie(this.COOKIE_NAMES.USER);
    if (!userCookie) return null;
    try {
      return JSON.parse(decodeURIComponent(userCookie)) as AuthUser;
    } catch (error) {
      console.error('Failed to parse user cookie:', error);
      return null;
    }
  },

  setUserCookie(user: AuthUser, days = 7) {
    this.setCookie(
      this.COOKIE_NAMES.USER,
      encodeURIComponent(JSON.stringify(user)),
      days,
    );
  },

  isAuthenticated(): boolean {
    return !!this.getUser();
  },

  clearAuth() {
    this.deleteCookie(this.COOKIE_NAMES.ACCESS_TOKEN);
    this.deleteCookie(this.COOKIE_NAMES.REFRESH_TOKEN);
    this.deleteCookie(this.COOKIE_NAMES.USER);
  },

  redirectToLogin() {
    const currentPath = window.location.pathname;
    if (!currentPath.includes('/admin/login')) {
      window.location.href = '/admin/login';
    }
  },

  initUserDisplay() {
    const user = this.getUser();
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement && user) {
      userEmailElement.textContent = user.email || 'Admin User';
    }
  },
};

if (typeof window !== 'undefined') {
  window.AuthUtils = AuthUtils;
}
