const CACHE_NAME = "fernotech-offline-v2";
const OFFLINE_URL = "/hors-ligne.html";
const OFFLINE_SCRIPT = "/offline-app.js";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([OFFLINE_URL, OFFLINE_SCRIPT])),
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
            .filter((key) => key.startsWith("fernotech-offline-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  if (
    request.method === "GET" &&
    requestUrl.origin === self.location.origin &&
    requestUrl.pathname === OFFLINE_SCRIPT
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedScript = await cache.match(OFFLINE_SCRIPT);
        if (cachedScript) {
          return cachedScript;
        }
        return fetch(request);
      }),
    );
    return;
  }
  if (request.method !== "GET" || request.mode !== "navigate") {
    return;
  }
  event.respondWith(
    fetch(request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const offlinePage = await cache.match(OFFLINE_URL);
      if (!offlinePage) {
        throw new Error("La page hors ligne n’est pas disponible.");
      }
      return offlinePage;
    }),
  );
});
