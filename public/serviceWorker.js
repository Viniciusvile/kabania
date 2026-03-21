const CACHE_NAME = 'synapse-smart-v1';

// Recursos estáticos básicos
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) {
          console.log('[Service Worker] Deleting old cache:', cacheName);
          return caches.delete(cacheName);
        }
      })
    ))
  );
  self.clients.claim();
});

// Cache First for static assets, Network First for data
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Se for uma requisição do Supabase ou API externa (ignoramos o cache direto aqui, tratamos pelo IndexedDB no App)
  if (request.url.includes('supabase.co')) {
    // Network only for Supabase POSTs
    if (request.method !== 'GET') return;
    
    // Network First para Supabase GETs
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Comportamento Padrão: Network First -> Cache Fallback (Ideal para Desenvolvimento Vite)
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
