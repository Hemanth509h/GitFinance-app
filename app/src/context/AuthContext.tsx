import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { api } from '../api';
import { clearLocalData, getCached } from '../api/localData';
import { getToken, setToken, removeToken } from '../api/storage';

interface User {
  id: string | number;
  email: string;
  name: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  /** End session without wiping pending outbox (e.g. expired JWT during sync). */
  endSession: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(data: any): User | null {
  if (!data) return null;
  if (data.user) return data.user as User;
  return data as User;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const endSession = async () => {
    setUser(null);
    await removeToken();
    // Keep cache + outbox so unsynced edits remain visible and can push after
    // the user logs in again. Intentional logout still wipes everything.
    try {
      await router.replace('/login');
    } catch {
      // no-op if navigation is unavailable
    }
  };

  const fetchCurrentUser = async (options?: { allowCachedFallback?: boolean }) => {
    try {
      // Always validate the token online — cached profile must not hide expiry.
      const response = await api.getMeOnline();
      const next = normalizeUser(response.data);
      if (next) {
        setUser(next);
        return;
      }
      await endSession();
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        await endSession();
        return;
      }

      // Offline / server unreachable: keep the session if we still have a
      // cached profile, otherwise clear.
      if (options?.allowCachedFallback !== false) {
        const cached = await getCached<any>('profile');
        const next = normalizeUser(cached);
        if (next) {
          setUser(next);
          return;
        }
      }

      console.warn('Failed to fetch current user profile:', err);
      await endSession();
    }
  };

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        await fetchCurrentUser({ allowCachedFallback: true });
      }
    } catch (err) {
      console.warn('Error checking auth status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const previous = await getCached<any>('profile');
      const response = await api.login(email, password);
      const token = response.data?.token;
      if (!token) {
        throw new Error('No token returned from login response.');
      }
      await setToken(token);

      const loginUser = normalizeUser(response.data?.user ?? response.data);
      const prevId = previous?._id ?? previous?.id;
      const nextId = loginUser?._id ?? loginUser?.id;
      // Different account on this device — never mix caches or outbox.
      if (prevId && nextId && String(prevId) !== String(nextId)) {
        await clearLocalData();
      }

      await fetchCurrentUser({ allowCachedFallback: false });
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      const response = await api.register(email, password, name);
      const token = response.data?.token;
      if (token) {
        await setToken(token);
        await fetchCurrentUser({ allowCachedFallback: false });
      }
    } catch (err) {
      setUser(null);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setUser(null);

    try {
      await api.logout().catch(() => {});
    } catch {
      // Ignore network errors on logout
    } finally {
      await removeToken();
      // Intentional logout: wipe user-specific cache and pending mutations.
      await clearLocalData();
      setLoading(false);
      try {
        await router.replace('/login');
      } catch {
        // no-op if navigation is unavailable during logout
      }
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser({ allowCachedFallback: true });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        endSession,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
