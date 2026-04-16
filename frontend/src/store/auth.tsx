"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { authApi, setToken, clearToken, type User } from "@/lib/api";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  /** Hand a Google ID token to the backend, store the session, return the user. */
  signInWithGoogle: (credential: string) => Promise<User>;
  /** Sets the user's role and flips onboardingCompleted=true. */
  completeOnboarding: (role: "user" | "recruiter") => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await authApi.me();
      if (res.data) setUser(res.data);
    } catch {
      setUser(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signInWithGoogle = async (credential: string): Promise<User> => {
    const res = await authApi.google(credential);
    if (res.data?.accessToken) setToken(res.data.accessToken);
    if (res.data?.user) setUser(res.data.user);
    if (!res.data?.user) throw new Error(res.message || "Google sign-in failed");
    return res.data.user;
  };

  const completeOnboarding = async (role: "user" | "recruiter"): Promise<User> => {
    const res = await authApi.completeOnboarding(role);
    if (res.data?.user) setUser(res.data.user);
    if (!res.data?.user) throw new Error(res.message || "Could not complete onboarding");
    return res.data.user;
  };

  const logout = async () => {
    try { await authApi.logout(); } catch {}
    clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, completeOnboarding, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
