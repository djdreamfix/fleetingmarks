/* global self */
const CACHE = "fm-cache-v3";

// Install: cache only same-origin essentials
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        "/",
        "/index.html",
        "/manifest.webmanifest",
        "/icons/icon-192.png",
        "/icons/icon-512.png",
      ])
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1) Не чіпаємо cross-origin взагалі (OSM tiles, API на іншому домені тощо)
  if (url.origin !== self.location.origin) return;

  // 2) Не кешуємо не-GET
  if (req.method !== "GET") return;

  // 3) Не кешуємо API/WS маршрути (адаптуй, якщо інші)
  if (url.pathname.startsWith("/marks") || url.pathname.startsWith("/socket.io")) {
    return;
  }

  // 4) Cache-first для статики
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      const res = await fetch(req);

      // Кешуємо лише "basic" same-origin відповіді
      if (res && res.ok && res.type === "basic") {
        cache.put(req, res.clone());
      }
      return res;
    })()
  );
});
