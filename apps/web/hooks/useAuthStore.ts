"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
};

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setAuth: (payload: { accessToken: string; refreshToken: string; user: AuthUser; deviceId?: string }) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      user: null,
      hydrated: false,
      setAuth: ({ accessToken, refreshToken, user, deviceId }) =>
        set({ accessToken, refreshToken, user, deviceId: deviceId ?? null }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      clearAuth: () => set({ accessToken: null, refreshToken: null, user: null, deviceId: null }),
      setHydrated: (hydrated) => set({ hydrated })
    }),
    {
      name: "soulchat-auth",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        deviceId: state.deviceId,
        user: state.user
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      }
    }
  )
);
