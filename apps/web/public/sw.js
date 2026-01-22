/* global self */
const CACHE = 'fm-cache-v1';
const ORIGIN = self.location.origin;

// Install: precache basic assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icons/icon-192.png',
        '/icons/icon-512.png'
      ])
    )
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Runtime cache for map tiles (simple)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        const res = await fetch(event.request);
        cache.put(event.request, res.clone());
        return res;
      })
    );
  }
});

// Push handler
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const payload = event.data.json();
  const { title, body, icon, data } = payload;
  event.waitUntil(
    self.registration.showNotification(title || 'Повідомлення', {
      body,
      icon: icon || '/icons/icon-192.png',
      data
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = ORIGIN + '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientsArr) => {
      const hadWindow = clientsArr.find((c) => c.url === url);
      if (hadWindow) return hadWindow.focus();
      return self.clients.openWindow(url);
    })
  );
});
