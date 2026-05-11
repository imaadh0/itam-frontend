"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "@/lib/api";

export type UserRole = "ADMIN" | "IT_MANAGER" | "IT_STAFF";

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
}

interface LoginResponse {
  token: string;
}

interface TokenPayload {
  userId: string;
  name: string;
  role: UserRole;
}

interface AuthContextValue {
  user: CurrentUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<CurrentUser>;
  logout: () => void;
}

const TOKEN_STORAGE_KEY = "token";
const TOKEN_COOKIE_NAME = "auth_token";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function decodeToken(token: string): CurrentUser {
  const [, payload] = token.split(".");

  if (!payload) {
    throw new Error("Invalid token");
  }

  const decodedPayload = JSON.parse(
    window.atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
  ) as TokenPayload;

  return {
    id: decodedPayload.userId,
    name: decodedPayload.name,
    role: decodedPayload.role,
  };
}

function persistToken(token: string) {
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  document.cookie = `${TOKEN_COOKIE_NAME}=${token}; path=/; max-age=86400; SameSite=Lax`;
}

function clearPersistedToken() {
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  document.cookie = `${TOKEN_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.queueMicrotask(() => {
      const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);

      if (storedToken) {
        try {
          setToken(storedToken);
          setUser(decodeToken(storedToken));
          persistToken(storedToken);
        } catch {
          clearPersistedToken();
        }
      }

      setIsLoading(false);
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post<LoginResponse>("/auth/login", {
      email,
      password,
    });
    const nextToken = response.data.token;
    const nextUser = decodeToken(nextToken);

    persistToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);

    return nextUser;
  }, []);

  const logout = useCallback(() => {
    clearPersistedToken();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      isLoading,
      login,
      logout,
    }),
    [isLoading, login, logout, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
