"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sessionToken: string | null;
  isAuthenticated: boolean;
  setSessionToken: (token: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize session token from localStorage
  useEffect(() => {
    const storedSession = localStorage.getItem("air-session-token");
    if (storedSession) {
      setSessionToken(storedSession);
    }
    setIsInitialized(true);
  }, []);

  // Query session using Convex
  const session = useQuery(
    api.auth.session,
    sessionToken ? { token: sessionToken } : "skip"
  );

  // Handle expired session
  useEffect(() => {
    if (session === null && sessionToken && isInitialized) {
      localStorage.removeItem("air-session-token");
      setSessionToken(null);
    }
  }, [session, sessionToken, isInitialized]);

  const user = session?.user ?? null;
  const isLoading = !isInitialized || Boolean(sessionToken && session === undefined);
  const isAuthenticated = Boolean(user);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    sessionToken,
    isAuthenticated,
    setSessionToken: (token: string | null) => {
      if (token) {
        localStorage.setItem("air-session-token", token);
        setSessionToken(token);
      } else {
        localStorage.removeItem("air-session-token");
        setSessionToken(null);
      }
    },
  };

  return (
    <AuthContext.Provider value={contextValue}>
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