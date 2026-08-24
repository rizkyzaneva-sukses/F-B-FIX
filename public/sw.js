const CACHE_NAME = "dapurkasir-shell-v2";
const SHELL = ["/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // Buang cache versi lama, kalau tidak halaman hasil deploy baru tidak pernah muncul.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only cache GET requests for static assets, NOT API calls
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip API routes, auth routes, and external requests
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/") ||
    url.origin !== self.location.origin
  ) {
    // Network-only for API calls
    return;
  }

  // Halaman HTML selalu ambil dari network dulu supaya versi terbaru langsung kepakai.
  // Cache hanya jadi cadangan saat offline.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === "basic") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Cache-first for static shell assets
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // Only cache successful responses
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});
