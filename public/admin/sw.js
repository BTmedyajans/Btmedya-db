const CACHE="btmedya-admin-v5";
const CORE=[
  "/admin/",
  "/admin/index.html",
  "/admin/agency-os/",
  "/admin/agency-os/index.html",
  "/admin/app.html",
  "/admin/manifest.webmanifest",
  "/admin/pwa-install.js",
  "/admin/admin-overrides.css",
  "/admin/mobile-admin.css",
  "/admin/mobile-upload.css",
  "/apple-touch-icon.png",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
  "/assets/icon-512-maskable.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== location.origin || !url.pathname.startsWith("/admin/")) return;
  if (request.method !== "GET") return;

  // Never cache authenticated/API responses or user-specific admin data.
  if (url.pathname.startsWith("/api/")) return;

  // Only cache known static/shell assets. Other admin pages remain network-first.
  const isCore = CORE.includes(url.pathname) || CORE.some(path => path.includes("?") && path === url.pathname + url.search);
  if (!isCore) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
