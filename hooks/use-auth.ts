// hooks/use-auth.ts
"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useAuthStore } from "@/store/auth-store";

export function useAuth() {
  const { data: session, status } = useSession();
  const {
    user,
    setUser,
    isAuthenticated,
    setAuthenticated,
    isLoading,
    setLoading,
  } = useAuthStore();

  useEffect(() => {
    setLoading(status === "loading");

    if (status === "authenticated" && session?.user) {
      setUser({
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
        name: session.user.name,
        email: session.user.email,
      });
      setAuthenticated(true);
    } else if (status === "unauthenticated") {
      setUser(null);
      setAuthenticated(false);
    }
  }, [session, status, setUser, setAuthenticated, setLoading]);

  return {
    user,
    isAuthenticated,
    isLoading,
    hasRole: (role: string | string[]) => {
      if (!user?.role) return false;

      if (Array.isArray(role)) {
        return role.includes(user.role);
      }

      return user.role === role;
    },
  };
}
