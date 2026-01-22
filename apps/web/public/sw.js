/* global self */
const CACHE = "fm-cache-v4";

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

/**
 * Fetch handler:
 * - do NOT intercept cross-origin (OSM tiles, API on other domain, etc.)
 * - do NOT cache API/WS
 * - cache-first for same-origin static GET
 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;
  if (req.method !== "GET") return;

  // don't cache API or socket endpoints
  if (
    url.pathname.startsWith("/marks") ||
    url.pathname.startsWith("/socket.io") ||
    url.pathname.startsWith("/push")
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      const res = await fetch(req);
      if (res && res.ok && res.type === "basic") {
        cache.put(req, res.clone());
      }
      return res;
    })()
  );
});

/**
 * Push event:
 * backend sends JSON payload: { title, body, data, icon }
 */
self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        // fallback: plain text
        const text = event.data ? event.data.text() : "";
        data = { title: "Fleeting Marks", body: text };
      }

      const title = data.title || "Fleeting Marks";
      const body = data.body || "Нова подія";
      const icon = data.icon || "/icons/icon-192.png";

      // what to open on click
      const targetUrl =
        data?.data?.id
          ? `/?mark=${encodeURIComponent(data.data.id)}`
          : "/";

      await self.registration.showNotification(title, {
        body,
        icon,
        badge: "/icons/icon-192.png",
        data: { targetUrl, raw: data },
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.targetUrl || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // if already open – focus and navigate
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          try {
            client.navigate(targetUrl);
          } catch {}
          return;
        }
      }

      // otherwise open new window
      await self.clients.openWindow(targetUrl);
    })()
  );
});
