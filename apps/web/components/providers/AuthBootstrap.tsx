"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/hooks/useAuthStore";

type MeResponse = {
  id: string;
  email: string;
  username: string;
  displayName: string;
};

export function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const hydrated = useAuthStore((state) => state.hydrated);
  const accessToken = useAuthStore((state) => state.accessToken);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setAuth = useAuthStore((state) => state.setAuth);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!hydrated || !refreshToken || !accessToken) {
      return;
    }

    apiClient
      .get<MeResponse>("/api/auth/me")
      .then((me) => {
        if (!user) {
          setAuth({ accessToken, refreshToken, user: me });
        }
      })
      .catch(() => clearAuth());
  }, [hydrated, refreshToken, accessToken, user, setAuth, clearAuth]);

  return <>{children}</>;
}
