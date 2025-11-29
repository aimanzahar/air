"use client";

import { ConvexProvider } from "convex/react";
import { ReactNode } from "react";
import convex from "@/convexClient";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ConvexProvider>
  );
}
