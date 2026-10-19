// Service worker for The Docket PWA
// Caches the app shell for fast reloads and basic offline support.

const CACHE_NAME = 'docket-v6';
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

// `event.respondWith()` requires a real Response. `caches.match()` resolves to
// `undefined` on a miss, so a network failure on an uncached route used to
// hand `respondWith()` an `undefined` and the browser rejected the fetch event
// with "Failed to convert value to 'Response'". Every branch below therefore
// falls back to this minimal plain-text response instead of `undefined`.
// It is deliberately a 503: an offline failure must not look like a rendered
// app page, which could mask authentication failures.
const OFFLINE_BODY = 'The Docket is offline and this page is not cached yet. Reconnect and try again.';

function offlineResponse() {
  return new Response(OFFLINE_BODY, {
    status: 503,
    statusText: 'Offline',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// Cache lookup that never rejects and never yields a non-Response value.
function cacheMatch(request) {
  return caches.match(request).then(
    (cached) => (cached ? cached : undefined),
    () => undefined
  );
}

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

  const url = new URL(event.request.url);

  // Skip API calls and Next.js static assets (they're content-addressed and immutable)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  // Network-first routes. `/page/{id}` must always fetch fresh HTML — cached
  // HTML references stale JS chunk hashes after deploys, hiding code updates.
  // `/capture` is opened cold from a launcher shortcut, so it must never be
  // served from the HTML cache either: a stale copy would reference JS chunks
  // that no longer exist after a deploy, and a cached login redirect would
  // mask the real page.
  // The cache is only a fallback for network failures; on a cache miss the
  // request still has to resolve to a Response.
  if (url.pathname.startsWith('/page/') || url.pathname === '/capture') {
    event.respondWith(
      fetch(event.request).catch(() =>
        cacheMatch(event.request).then((cached) => cached || offlineResponse())
      )
    );
    return;
  }

  // App shell + other routes: stale-while-revalidate
  event.respondWith(
    cacheMatch(event.request).then((cached) => {
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
        .catch(() => cached || offlineResponse()); // Offline fallback

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
