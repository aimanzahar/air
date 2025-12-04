"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
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
  convexError: string | null;
  setSessionToken: (token: string | null) => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [convexError, setConvexError] = useState<string | null>(null);

  // Initialize session token from localStorage
  useEffect(() => {
    try {
      const storedSession = localStorage.getItem("air-session-token");
      if (storedSession) {
        setSessionToken(storedSession);
      }
    } catch (e) {
      console.warn("[AuthContext] Failed to read session from localStorage:", e);
    }
    setIsInitialized(true);
  }, []);

  // Query session using Convex - wrap in try/catch via error handling
  let session: { user: User } | null | undefined = undefined;
  let queryError: Error | null = null;
  
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    session = useQuery(
      api.auth.session,
      sessionToken ? { token: sessionToken } : "skip"
    );
  } catch (error) {
    queryError = error as Error;
    console.error("[AuthContext] Convex query error:", error);
  }

  // Handle Convex errors
  useEffect(() => {
    if (queryError) {
      const errorMessage = queryError.message || "Unknown error";
      if (
        errorMessage.includes("Could not find public function") ||
        errorMessage.includes("CONVEX")
      ) {
        setConvexError(
          "Unable to connect to the server. The backend may be restarting. Please try again in a moment."
        );
      } else {
        setConvexError(errorMessage);
      }
    } else {
      setConvexError(null);
    }
  }, [queryError]);

  // Handle expired session
  useEffect(() => {
    if (session === null && sessionToken && isInitialized && !queryError) {
      try {
        localStorage.removeItem("air-session-token");
      } catch (e) {
        console.warn("[AuthContext] Failed to clear session from localStorage:", e);
      }
      setSessionToken(null);
    }
  }, [session, sessionToken, isInitialized, queryError]);

  const user = session?.user ?? null;
  const isLoading = !isInitialized || Boolean(sessionToken && session === undefined && !queryError);
  const isAuthenticated = Boolean(user);

  const clearError = useCallback(() => {
    setConvexError(null);
  }, []);

  const contextValue: AuthContextType = {
    user,
    isLoading,
    sessionToken,
    isAuthenticated,
    convexError,
    setSessionToken: (token: string | null) => {
      try {
        if (token) {
          localStorage.setItem("air-session-token", token);
          setSessionToken(token);
        } else {
          localStorage.removeItem("air-session-token");
          setSessionToken(null);
        }
      } catch (e) {
        console.warn("[AuthContext] Failed to update session in localStorage:", e);
      }
    },
    clearError,
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