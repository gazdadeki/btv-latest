import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { AuthUtils, AuthUser } from './auth';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(AuthUtils.getUser());
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await api.getMe();
      setUser(me);
      AuthUtils.setUserCookie(me);
    } catch {
      setUser(null);
      AuthUtils.clearAuth();
    }
  };

  useEffect(() => {
    let active = true;
    const isLoginRoute =
      typeof window !== 'undefined' &&
      (window.location.pathname === '/admin/login' ||
        window.location.pathname === '/admin/login/' ||
        window.location.pathname === '/admin/login.html');

    if (isLoginRoute) {
      setUser(null);
      setIsLoading(false);
      return () => {
        active = false;
      };
    }

    (async () => {
      try {
        const me = await api.getMe();
        if (!active) return;
        setUser(me);
        AuthUtils.setUserCookie(me);
      } catch {
        if (!active) return;
        setUser(null);
        AuthUtils.clearAuth();
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, refreshUser }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
