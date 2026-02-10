'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { api } from './api';
import { AuthUtils, type AdminUser } from './auth';

interface AuthContextValue {
  user: AdminUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = (await api.getMe()) as AdminUser;
      setUser(me);
      AuthUtils.setUserCookie(me);
    } catch {
      setUser(null);
      AuthUtils.clearAuth();
    }
  }, []);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setIsLoading(false);
      return;
    }

    const cachedUser = AuthUtils.getUser();
    if (cachedUser) {
      setUser(cachedUser);
    }

    refreshUser().finally(() => setIsLoading(false));
  }, [pathname, refreshUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
