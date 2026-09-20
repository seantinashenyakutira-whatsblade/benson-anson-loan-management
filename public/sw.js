const CACHE_NAME = 'bal-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/branding/logo-icon.png',
  '/branding/monogram.svg',
];

/* ── Install: precache app shell ─────────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

/* ── Activate: clean old caches ──────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

/* ── Fetch: network-first for data, cache-first for static ─ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Skip Supabase API calls (authenticated data)
  if (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/')) {
    return;
  }

  // Static assets: cache-first
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      }),
    );
    return;
  }

  // Navigation: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          // Offline fallback: try cache, then show a basic offline page
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              '<html><body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#061633;color:#fff;text-align:center"><div><h1>Offline</h1><p>Please check your connection and try again.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html' } },
            );
          });
        }),
    );
    return;
  }

  // Everything else: network-first
  event.respondWith(
    fetch(request).catch(() => caches.match(request)),
  );
});
