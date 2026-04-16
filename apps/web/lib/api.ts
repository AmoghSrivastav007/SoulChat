"use client";

import { useAuthStore } from "@/hooks/useAuthStore";
import { SERVER_URL } from "@/lib/constants";

type JsonRecord = Record<string, unknown>;

async function request<T>(path: string, init?: RequestInit, retry = true): Promise<T> {
  const { accessToken, deviceId } = useAuthStore.getState();
  const headers = new Headers(init?.headers ?? {});
  if (!(init?.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (deviceId) headers.set("X-Device-Id", deviceId);

  const response = await fetch(`${SERVER_URL}${path}`, { ...init, headers });

  if (response.status === 401 && retry) {
    const refreshed = await refreshToken();
    if (refreshed) return request<T>(path, init, false);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as JsonRecord | null;
    throw new Error((payload?.error as string | undefined) ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function refreshToken(): Promise<boolean> {
  const { refreshToken: rt, deviceId } = useAuthStore.getState();
  if (!rt) return false;

  try {
    const data = await fetch(`${SERVER_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt, deviceId })
    }).then((res) => (res.ok ? res.json() : null));

    if (!data?.accessToken || !data?.refreshToken) {
      useAuthStore.getState().clearAuth();
      return false;
    }

    useAuthStore.getState().setTokens(data.accessToken as string, data.refreshToken as string);
    return true;
  } catch {
    useAuthStore.getState().clearAuth();
    return false;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: JsonRecord | unknown[]) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: JsonRecord) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: "POST", body: formData })
};
