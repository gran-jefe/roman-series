"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import api, { storeTokens, clearAuth } from "@/lib/api";
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
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

      // Check token expiry before attempting to use it
      const expiresAt =
        typeof window !== "undefined"
          ? parseInt(localStorage.getItem("token_expires_at") || "0")
          : 0;
      const isExpired = expiresAt && Date.now() > expiresAt - 30_000; // 30s buffer

      if (isExpired) {
        const refreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem("refresh_token")
            : null;

        if (!refreshToken) {
          setLoading(false);
          return;
        }

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
          const { data } = await axios.post(
            `${apiUrl}/api/auth/refresh`,
            { refresh_token: refreshToken }
          );

          if (data.status === "success") {
            const { access_token, refresh_token: newRefresh, expires_in } =
              data.data;
            storeTokens(access_token, newRefresh, expires_in);
          } else {
            setLoading(false);
            return;
          }
        } catch {
          setLoading(false);
          return;
        }
      }

      // Fetch current user's profile
      const response = await api.get("/api/auth/me");

      if (response.data.status === "success") {
        setUser(response.data.data.user);
        setProfile(response.data.data.profile);
      } else {
        // Token invalid, clear everything
        clearAuth();
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("[AuthContext] Failed to restore session:", error);
      // Only clear credentials on 401 (token actually invalid)
      // Network errors should not clear credentials
      if (error.response?.status === 401) {
        clearAuth();
        setUser(null);
        setProfile(null);
      }
      // If network error, just leave state as is and keep trying
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

  // Proactive token refresh — schedule refresh 60s before expiry
  useEffect(() => {
    if (!user) return;

    const expiresAt =
      typeof window !== "undefined"
        ? parseInt(localStorage.getItem("token_expires_at") || "0")
        : 0;

    if (!expiresAt) return;

    const msUntilRefresh = expiresAt - Date.now() - 60_000; // refresh 60s before expiry
    if (msUntilRefresh <= 0) return;

    const timer = setTimeout(async () => {
      const refreshToken =
        typeof window !== "undefined"
          ? localStorage.getItem("refresh_token")
          : null;

      if (!refreshToken) return;

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const { data } = await axios.post(`${apiUrl}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        if (data.status === "success") {
          const { access_token, refresh_token: newRefresh, expires_in } =
            data.data;
          storeTokens(access_token, newRefresh, expires_in);
        }
      } catch (error) {
        console.error("[AuthContext] Proactive refresh failed:", error);
        clearAuth();
        router.push("/login");
      }
    }, msUntilRefresh);

    return () => clearTimeout(timer);
  }, [user, router]);

  const login = async (email: string, password: string) => {
    const response = await api.post("/api/auth/login", { email, password });

    const { access_token, refresh_token, expires_in } = response.data.data;

    // Store tokens with expiry tracking
    storeTokens(access_token, refresh_token, expires_in);

    // Fetch full profile data
    const meResponse = await api.get("/api/auth/me");

    if (meResponse.data.status === "success") {
      const userProfile = meResponse.data.data.profile;
      setUser(meResponse.data.data.user);
      setProfile(userProfile);

      // Redirect based on role and onboarding status
      if (userProfile?.role === "admin") {
        router.push("/admin");
      } else if (!userProfile?.subject_combination?.length) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
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

      // Clear auth storage
      clearAuth();

      // Redirect to login
      router.push("/login");
    }
  };

  const refreshProfile = useCallback(async () => {
    try {
      const response = await api.get("/api/auth/me");
      if (response.data.status === "success") {
        setProfile(response.data.data.profile);
      }
    } catch (error) {
      console.error("[AuthContext] Failed to refresh profile:", error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    loading: loading || !mounted,
    isAuthenticated: !!user && !!profile,
    login,
    logout,
    restoreSession,
    refreshProfile,
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
