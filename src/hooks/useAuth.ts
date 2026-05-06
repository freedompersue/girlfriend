"use client";

import { useEffect, useState, useCallback } from "react";
import { authClient } from "@/lib/auth-client";

interface User {
  id: string;
  email: string;
  name: string | null;
  selectedCharacterId: string | null;
  selectedCharacter: {
    id: string;
    name: string;
    subtitle: string;
    avatarUrl: string;
  } | null;
}

export function useAuth() {
  const { data: session, isPending } = authClient.useSession();
  const [user, setUser] = useState<User | null>(null);
  const [enriching, setEnriching] = useState(true);

  const enrichUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setEnriching(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;

    setEnriching(true);
    enrichUser();
  }, [session, isPending, enrichUser]);

  const logout = async () => {
    await authClient.signOut().catch(() => {});
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    window.location.href = "/login";
  };

  return { user, loading: isPending || enriching, logout, refreshUser: enrichUser };
}
