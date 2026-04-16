"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";
import { SERVER_URL } from "@/lib/constants";

export function ServiceWorkerRegistrar() {
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    

    // navigator.serviceWorker
    //   .register("/sw.js")
    //   .then((registration) => {
    //     console.log("[SW] registered", registration.scope);
    //   })
    //   .catch((err) => console.warn("[SW] registration failed", err));
  }, []);

  // Subscribe to push notifications once logged in
  useEffect(() => {
    if (!user || !("PushManager" in window)) return;

    async function subscribePush() {
      try {
        const vapidRes = await fetch(`${SERVER_URL}/api/notifications/vapid-public-key`);
        const { key } = await vapidRes.json() as { key: string | null };
        if (!key) return;

        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        if (existing) return; // already subscribed

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key)
        });

        const { accessToken } = useAuthStore.getState();
        await fetch(`${SERVER_URL}/api/notifications/subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken ?? ""}`
          },
          body: JSON.stringify(sub.toJSON())
        });
      } catch {
        // push not supported or denied
      }
    }

    subscribePush();
  }, [user]);

  return null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
