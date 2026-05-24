// Loftin Method — Service Worker
// Update this version string whenever you deploy a new version
// The browser will detect the change and refresh the cache automatically
const CACHE_VERSION = 'fft-v216';
const CACHE_NAME = CACHE_VERSION;

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/styles.css',
  '/js/migrate.js',
  '/js/state.js',
  '/js/lane-profiles.js',
  '/js/plan-templates.js',
  '/js/macros.js',
  '/js/mealdb.js',
  '/js/savedmeals.js',
  '/js/carblookup.js',
  '/js/devicelink.js',
  '/js/swap-options.js',
  '/js/engine.js',
  '/js/sync.js',
  '/js/meals.js',
  '/js/stripe.js',
  '/js/grocery.js',
  '/js/progress.js',
  '/js/restaurants.js',
  '/js/fridge.js',
  '/js/history.js',
  '/js/ui.js',
  '/js/app-handlers.js',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-mark.png',
  '/loftin-depth-bg.png',
  '/loftin-light-depth-bg-v3.png',
  '/manifest.json'
];

// Install: cache core assets
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: delete old caches from previous versions
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch strategy:
// - HTML + JS: network first — always get latest, fall back to cache if offline
// - Icons, manifest, images: cache first — rarely change, fast from cache
self.addEventListener('fetch', function(event) {
  // Never intercept POST requests or API calls
  if (event.request.method !== 'GET') return;
  // Never intercept cross-origin requests — causes CORS errors on staging
  if (!event.request.url.startsWith(self.location.origin)) return;
  if (event.request.url.includes('anthropic.com')) return;
  if (event.request.url.includes('netlify/functions')) return;
  if (event.request.url.includes('googleapis.com')) return;

  var url = event.request.url;
  var isHTML = event.request.mode === 'navigate' || url.endsWith('.html') || url.endsWith('/');
  var isJS   = url.includes('/js/') && url.endsWith('.js');

  // Network first for HTML and JS — ensures deploys are always picked up immediately
  if (isHTML || isJS) {
    event.respondWith(
      fetch(event.request).then(function(response) {
        if (response && response.status === 200) {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache first for static assets (icons, manifest, images) — these rarely change
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      return cached || fetch(event.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      });
    })
  );
});
