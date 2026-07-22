/* Pick Up service worker — provides basic offline support for the web PWA.
 *
 * Strategy (kept deliberately simple for an MVP):
 *  - Navigations (opening a page): network-first, fall back to a cached copy of
 *    the app shell (index.html) when offline, so the app still launches.
 *  - Same-origin static assets (JS/CSS/images): stale-while-revalidate — serve
 *    from cache instantly, refresh in the background.
 *  - API calls and any cross-origin requests: always go to the network and are
 *    never cached (data must stay fresh; the backend lives on another origin).
 *
 * Note: this only runs for the WEB app. The native iOS/Android app bundles its
 * own assets and skips service-worker registration (see src/index.tsx).
 */

const CACHE_VERSION = 'pickup-cache-v1';
const APP_SHELL = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  // Activate this worker immediately instead of waiting for old tabs to close.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET; never cache POST/PUT/etc.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Only handle same-origin requests. API/backend calls (different origin) and
  // any third-party requests pass straight through to the network.
  if (url.origin !== self.location.origin) return;

  // App navigations: network-first with an offline fallback to the app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/index.html'))
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) =>
      cache.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    )
  );
});
