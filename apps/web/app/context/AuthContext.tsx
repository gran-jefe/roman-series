"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { Profile } from "types";

interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Mark as mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  const restoreSession = useCallback(async () => {
    try {
      const token = typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;

      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch current user's profile
      const response = await api.get("/api/auth/me");

      if (response.data.status === "success") {
        setUser(response.data.data.user);
        setProfile(response.data.data.profile);
      } else {
        // Token invalid, clear everything
        if (typeof window !== "undefined") {
          localStorage.clear();
          document.cookie = "auth_token=; path=/";
        }
      }
    } catch (error) {
      console.error("[AuthContext] Failed to restore session:", error);
      // Clear all data on error (401 will also clear via API interceptor)
      if (typeof window !== "undefined") {
        localStorage.clear();
        document.cookie = "auth_token=; path=/";
      }
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore session only on client mount
  useEffect(() => {
    if (mounted) {
      restoreSession();
    }
  }, [mounted, restoreSession]);

  const login = async (email: string, password: string) => {
    const response = await api.post("/api/auth/login", { email, password });

    const { access_token, refresh_token } = response.data.data;

    // Store tokens
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", access_token);
      localStorage.setItem("refresh_token", refresh_token);
      document.cookie = `auth_token=${access_token}; path=/`;
    }

    // Fetch full profile data
    const meResponse = await api.get("/api/auth/me");

    if (meResponse.data.status === "success") {
      setUser(meResponse.data.data.user);
      setProfile(meResponse.data.data.profile);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout", {});
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
    } finally {
      // Clear state
      setUser(null);
      setProfile(null);

      // Clear storage
      if (typeof window !== "undefined") {
        localStorage.clear();
        document.cookie = "auth_token=; path=/";
      }

      // Redirect to login
      router.push("/login");
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    loading: loading || !mounted,
    isAuthenticated: !!user && !!profile,
    login,
    logout,
    restoreSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
