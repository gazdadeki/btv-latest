'use client';

// Session restore logic translated from Mobile/lib/providers/auth_provider.dart
// AuthNotifier._loadUser() pattern exactly preserved.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { api } from './api';
import { AuthUtils } from './auth';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isVerified: boolean;
  isBanned: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isVerified: false,
  isBanned: false,
  login: async () => { throw new Error('AuthProvider not mounted'); },
  register: async () => { throw new Error('AuthProvider not mounted'); },
  logout: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Mirrors AuthNotifier._loadUser():
  // If user cookie exists → verify with GET /auth/me
  // If /auth/me succeeds → authenticated
  // If /auth/me fails → clear cookies, unauthenticated
  // If no cookie → loading=false, unauthenticated (no API call)
  useEffect(() => {
    const cachedUser = AuthUtils.getUser();
    if (!cachedUser) {
      setIsLoading(false);
      return;
    }

    // Optimistically show cached user while verifying
    setUser(cachedUser);

    api.getMe()
      .then(freshUser => {
        setUser(freshUser);
        AuthUtils.setUserCookie(freshUser);
      })
      .catch(() => {
        setUser(null);
        AuthUtils.clearAuth();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<User> => {
    const loggedInUser = await api.login(email, password);
    AuthUtils.setUserCookie(loggedInUser);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const register = useCallback(async (email: string, username: string, password: string): Promise<User> => {
    const newUser = await api.register(email, username, password);
    AuthUtils.setUserCookie(newUser);
    setUser(newUser);
    return newUser;
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    AuthUtils.clearAuth();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      AuthUtils.setUserCookie(freshUser);
    } catch {
      setUser(null);
      AuthUtils.clearAuth();
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isVerified: user?.isVerified ?? false,
        isBanned: user?.isBanned ?? false,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
