const CACHE_NAME = "soulchat-v1";
const STATIC_ASSETS = ["/", "/chat", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Network-first for API calls
  if (url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request).catch(() => caches.match("/offline.html"))
    );
    return;
  }

  // Cache-first for static assets
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok && request.method === "GET") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match("/offline.html"));
    })
  );
});

// Push notifications
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title ?? "SoulChat", {
      body: data.body,
      icon: "https://i.pinimg.com/736x/d1/41/b1/d141b12348131e32bdda392cfd819730.jpg",
      badge: "https://i.pinimg.com/736x/e0/e5/5d/e0e55d384c591648bd66c5b925ea7a46.jpg",
      tag: data.tag,
      data: { url: data.url ?? "/chat" }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/chat";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

// Background sync for queued messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-messages") {
    event.waitUntil(syncQueuedMessages());
  }
});

async function syncQueuedMessages() {
  // Placeholder – actual implementation would read from IndexedDB queue
}
