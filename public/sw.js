// Service worker for The Docket PWA
// Caches the app shell for fast reloads and basic offline support.

const CACHE_NAME = 'docket-v1';
const SHELL_URLS = [
  '/',
  '/inbox',
  '/today',
  '/tasks',
  '/calendar',
  '/focus',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls and Next.js HMR
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // Return cached response, then update cache in background
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, clone)
            );
          }
          return response;
        })
        .catch(() => cached); // Offline fallback

      return cached || fetchPromise;
    })
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const payload = event.data.json();
  const { title, body, data, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || 'docket-task',
      data: data || {},
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
      requireInteraction: true,
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/inbox';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // If a window is already open, focus it
      for (const client of clients) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'navigate', url: urlToOpen });
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(urlToOpen);
    })
  );
});
