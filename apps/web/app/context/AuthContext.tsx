"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";
import api, { setAuthCookie, clearAuthCookie } from "@/lib/api";
import type { Profile } from "types";

interface User {
  id: string;
  email: string;
}

interface RegisterInput {
  full_name: string;
  email: string;
  password: string;
  target_university_id?: string;
  target_course?: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ needsMigration: boolean }>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function redirectForProfile(router: ReturnType<typeof useRouter>, userProfile: Profile) {
  if (userProfile?.role === "admin") {
    router.push("/admin");
  } else if (!userProfile?.subject_combination?.length) {
    router.push("/onboarding");
  } else {
    router.push("/dashboard");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const response = await api.get("/api/auth/me");
    if (response.data.status === "success") {
      setUser(response.data.data.user);
      setProfile(response.data.data.profile);
      return response.data.data.profile as Profile;
    }
    return null;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        clearAuthCookie();
        setLoading(false);
        return;
      }

      try {
        await fetchProfile();
        setAuthCookie();
      } catch (error) {
        console.error("[AuthContext] Failed to fetch profile:", error);
        setUser(null);
        setProfile(null);
        clearAuthCookie();
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [fetchProfile]);

  const restoreSession = useCallback(async () => {
    if (firebaseAuth.currentUser) {
      await fetchProfile();
    }
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      const userProfile = await fetchProfile();
      setAuthCookie();
      if (userProfile) {
        redirectForProfile(router, userProfile);
      }
      return { needsMigration: false };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/auth/migrate-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (data.migrated) {
          // TODO: pass actionCodeSettings pointing at our own /reset-password
          // page once romanseries.com.ng is added to Firebase's authorized
          // domains — until then a custom redirect URL is rejected outright.
          await sendPasswordResetEmail(firebaseAuth, email);
          return { needsMigration: true };
        }

        throw new Error("Invalid email or password");
      }
      throw err;
    }
  };

  const register = async ({ full_name, email, password, target_university_id, target_course }: RegisterInput) => {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    const idToken = await credential.user.getIdToken();

    await api.post(
      "/api/auth/register",
      { full_name, target_university_id, target_course },
      { headers: { Authorization: `Bearer ${idToken}` } }
    );

    const userProfile = await fetchProfile();
    setAuthCookie();
    if (userProfile) {
      redirectForProfile(router, userProfile);
    }
  };

  const logout = async () => {
    try {
      await signOut(firebaseAuth);
    } finally {
      setUser(null);
      setProfile(null);
      clearAuthCookie();
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
    loading,
    isAuthenticated: !!user && !!profile,
    login,
    register,
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
