// HexaFlow Pro - Service Worker for Offline Access
const CACHE_NAME = 'hexaflow-pro-v1';
const OFFLINE_URL = 'index.html';

// Files to cache for offline access
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json'
];

// Install event - cache all necessary files
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async (cache) => {
        console.log('[Service Worker] Caching app files');
        try {
          await cache.addAll(urlsToCache);
          console.log('[Service Worker] All files cached successfully');
        } catch (error) {
          console.error('[Service Worker] Cache failed:', error);
        }
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache first, then network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      event.request.url.includes('chrome-extension') ||
      event.request.url.includes('firefox-settings')) {
    return;
  }

  // For HTML requests - network first with cache fallback
  if (event.request.mode === 'navigate' || 
      event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fetched page
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(async () => {
          // If network fails, serve cached offline page
          const cachedResponse = await caches.match(OFFLINE_URL);
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback response
          return new Response(
            '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        })
    );
    return;
  }

  // For static assets (CSS, JS) - cache first with network fallback
  if (event.request.url.match(/\.(css|js|json|svg|png|jpg|jpeg|gif|webp)$/)) {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request)
            .then((response) => {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
              return response;
            })
            .catch(() => {
              // Return a minimal response for failed assets
              if (event.request.url.endsWith('.css')) {
                return new Response('/* CSS offline fallback */', {
                  headers: { 'Content-Type': 'text/css' }
                });
              }
              return new Response('', { status: 200 });
            });
        })
    );
    return;
  }

  // For all other requests - network first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(async () => {
        // Try cache as fallback
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Return a basic error response
        return new Response('Network request failed', {
          status: 408,
          statusText: 'Request Timeout'
        });
      })
  );
});

// Handle offline sync (for future use)
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Sync event:', event.tag);
  if (event.tag === 'sync-files') {
    event.waitUntil(syncFiles());
  }
});

async function syncFiles() {
  // Future implementation for background sync
  console.log('[Service Worker] Syncing files...');
}

// Push notification support (optional)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || 'New update available',
    icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%233b82f6"/%3E%3Ctext x="50" y="68" font-size="50" text-anchor="middle" fill="white" font-weight="bold"%3EHF%3C/text%3E%3C/svg%3E',
    badge: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" fill="%233b82f6"/%3E%3C/svg%3E',
    vibrate: [200, 100, 200]
  };
  event.waitUntil(self.registration.showNotification('HexaFlow Pro', options));
});