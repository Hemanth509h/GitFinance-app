import React, { createContext, useContext, useState, useEffect } from 'react';
import { router } from 'expo-router';
import { api } from '../api';
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
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.getMe();
      if (response.data?.user) {
        setUser(response.data.user);
      } else if (response.data) {
        setUser(response.data);
      }
    } catch (err) {
      console.warn("Failed to fetch current user profile:", err);
      await logout();
    }
  };

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        await fetchCurrentUser();
      }
    } catch (err) {
      console.warn("Error checking auth status:", err);
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
      const response = await api.login(email, password);
      const token = response.data?.token;
      if (token) {
        await setToken(token);
        await fetchCurrentUser();
      } else {
        throw new Error("No token returned from login response.");
      }
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
        await fetchCurrentUser();
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
      setLoading(false);
      try {
        await router.replace('/login');
      } catch {
        // no-op if navigation is unavailable during logout
      }
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
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
