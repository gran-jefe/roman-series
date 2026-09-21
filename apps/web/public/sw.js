// Roman Series service worker — app-shell caching only.
//
// Deliberately does NOT cache API responses (/api/*, Supabase, Firebase).
// This is an exam-prep app: cached questions, scores, or subscription
// status going stale would be actively harmful. We only cache static,
// content-hashed build assets and a small offline fallback page so the
// app installs, opens instantly on repeat visits, and degrades gracefully
// (rather than a browser error screen) when there's no network.

const CACHE_VERSION = "v2";
const SHELL_CACHE = `roman-series-shell-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

const NEVER_CACHE_PATTERNS = [
  /\/api\//,
  /supabase\.co/,
  /googleapis\.com/,
  /firebaseio\.com/,
  /firebaseapp\.com/,
  /paystack\.co/,
];

function isNeverCache(url) {
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(url));
}

function isStaticAsset(url) {
  return (
    url.includes("/_next/static/") ||
    url.includes("/icons/") ||
    url.includes("/assets/") ||
    url.endsWith(".png") ||
    url.endsWith(".jpg") ||
    url.endsWith(".svg") ||
    url.endsWith(".woff") ||
    url.endsWith(".woff2") ||
    url.endsWith("/manifest.webmanifest") ||
    url.endsWith("/favicon.png")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll([OFFLINE_URL]))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("roman-series-shell-") && key !== SHELL_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = request.url;
  if (isNeverCache(url)) return; // let the browser handle it, no SW interception

  // Page navigations: network-first so users always see fresh content,
  // falling back to a cached copy or the offline page when unreachable.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache genuinely successful, non-opaque responses — caching
          // a transient 404/500 would otherwise "poison" that URL and keep
          // serving the failure forever, even after the server recovers.
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // Hashed/static build assets: cache-first, since content-hashed URLs
  // never change meaning once published.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
