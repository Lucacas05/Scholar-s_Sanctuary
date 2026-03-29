const CACHE_NAME = "lumina-shell-v1";
const CORE_ROUTES = ["/", "/offline", "/manifest.webmanifest"];
const STATIC_PATHS = [
  "/favicon.ico",
  "/favicon.svg",
  "/pwa-192.png",
  "/pwa-512.png",
  "/pwa-maskable-512.png",
  "/apple-touch-icon.png",
  "/site/placeholder-landscape.svg",
  "/site/placeholder-avatar.svg",
];

async function cacheRequest(cache, url) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (response.ok) {
    await cache.put(url, response.clone());
  }
  return response;
}

async function extractAssetUrls(route) {
  const response = await fetch(route, { credentials: "same-origin" });
  if (!response.ok) {
    return [];
  }

  const html = await response.text();
  const assetMatches = html.matchAll(
    /(?:href|src)="(\/(?:_astro|site)\/[^"]+|\/(?:favicon|apple-touch-icon|pwa-)[^"]+)"/g,
  );

  return [...new Set([...assetMatches].map((match) => match[1]))];
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        [...CORE_ROUTES, ...STATIC_PATHS].map((url) =>
          cacheRequest(cache, url).catch(() => null),
        ),
      );
      const routeAssets = await extractAssetUrls("/").catch(() => []);
      await Promise.all(
        routeAssets.map((url) => cacheRequest(cache, url).catch(() => null)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const payload = event.data;
  if (
    !payload ||
    payload.type !== "CACHE_URLS" ||
    !Array.isArray(payload.urls)
  ) {
    return;
  }

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urls = payload.urls.filter(
        (url) =>
          typeof url === "string" &&
          url.startsWith("/") &&
          !url.startsWith("/api/"),
      );
      await Promise.all(
        urls.map((url) => cacheRequest(cache, url).catch(() => null)),
      );
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (url.pathname === "/" || url.pathname === "/offline") {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            (await cache.match("/offline"))
          );
        }
      })(),
    );
    return;
  }

  if (
    url.pathname.startsWith("/_astro/") ||
    url.pathname.startsWith("/site/") ||
    url.pathname.startsWith("/pwa-") ||
    url.pathname === "/favicon.svg" ||
    url.pathname === "/favicon.ico" ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }

        try {
          const response = await fetch(request);
          if (response.ok) {
            await cache.put(request, response.clone());
          }
          return response;
        } catch {
          if (url.pathname.includes("avatar")) {
            return (
              (await cache.match("/site/placeholder-avatar.svg")) ||
              Response.error()
            );
          }
          return (
            (await cache.match("/site/placeholder-landscape.svg")) ||
            Response.error()
          );
        }
      })(),
    );
  }
});
