'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api, User } from '@/services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
  refreshUser: async () => null,
});

const PUBLIC_ROUTES = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const refreshUser = useCallback(async (): Promise<User | null> => {
    try {
      const res = await api.getMe();
      if (res.data?.user) {
        setUser(res.data.user);
        return res.data.user;
      } else {
        setUser(null);
        return null;
      }
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      const currentUser = await refreshUser();
      if (isMounted) {
        setLoading(false);
        const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
        if (!currentUser && !isPublicRoute) {
          router.replace('/login');
        } else if (currentUser && pathname === '/login') {
          router.replace('/');
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [pathname, refreshUser, router]);

  const logout = async () => {
    try {
      setLoading(true);
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setLoading(false);
      router.replace('/login');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
