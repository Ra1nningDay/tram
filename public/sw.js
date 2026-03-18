const VERSION = "tram-pwa-v1";
const STATIC_CACHE = `static-${VERSION}`;
const DATA_CACHE = `data-${VERSION}`;
const RUNTIME_CACHE = `runtime-${VERSION}`;
const MAP_CACHE = `map-${VERSION}`;
const OFFLINE_PAGE = "/offline.html";
const MAX_RUNTIME_ENTRIES = 60;
const MAX_MAP_ENTRIES = 120;

const PRECACHE_URLS = [
  OFFLINE_PAGE,
  "/manifest.webmanifest",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/maskable-icon-512x512.png",
  "/apple-touch-icon.png",
  "/data/tram_1.csv",
  "/data/tram_2.csv",
  "/data/tram_3.csv",
  "/api/route",
  "/api/stops",
];

const MAP_HOSTS = new Set(["tiles.openfreemap.org", "basemaps.cartocdn.com"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await Promise.allSettled(
        PRECACHE_URLS.map(async (url) => {
          const request = new Request(url, { cache: "reload" });
          const response = await fetch(request);
          if (canCache(response)) {
            await cache.put(request, response);
          }
        }),
      );

      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const expectedCaches = new Set([
        STATIC_CACHE,
        DATA_CACHE,
        RUNTIME_CACHE,
        MAP_CACHE,
      ]);

      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (!expectedCaches.has(cacheName)) {
            return caches.delete(cacheName);
          }

          return Promise.resolve();
        }),
      );

      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (url.origin === self.location.origin) {
    if (isPublicDataRequest(url.pathname)) {
      event.respondWith(networkFirst(request, DATA_CACHE));
      return;
    }

    if (isStaticAssetRequest(url.pathname)) {
      event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
      return;
    }
  }

  if (MAP_HOSTS.has(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, MAP_CACHE, MAX_MAP_ENTRIES));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      const windowClients = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of windowClients) {
        if ("focus" in client) {
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow("/");
      }

      return undefined;
    })(),
  );
});

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (!isSuccessfulDocument(response)) {
      throw new Error(`Navigation failed with status ${response.status}`);
    }

    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, response.clone());
    await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
    return response;
  } catch {
    const cachedPage = await caches.match(request, { ignoreSearch: true });
    if (cachedPage) {
      return cachedPage;
    }

    const offlineResponse = await caches.match(OFFLINE_PAGE, { ignoreSearch: true });
    if (offlineResponse) {
      return offlineResponse;
    }

    return Response.error();
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (!canCache(response)) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    await cache.put(request, response.clone());
    return response;
  } catch {
    const cachedResponse = await cache.match(request, { ignoreSearch: false });
    if (cachedResponse) {
      return cachedResponse;
    }

    return Response.error();
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (canCache(response)) {
        await cache.put(request, response.clone());
        await trimCache(cacheName, maxEntries);
      }

      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    void networkResponsePromise;
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  return Response.error();
}

function isPublicDataRequest(pathname) {
  return (
    pathname === "/api/route" ||
    pathname === "/api/stops" ||
    pathname === "/api/vehicles" ||
    pathname.startsWith("/api/stops/") ||
    pathname.startsWith("/data/")
  );
}

function isStaticAssetRequest(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/apple-touch-icon.png" ||
    pathname === "/icon-192x192.png" ||
    pathname === "/icon-512x512.png" ||
    pathname === "/maskable-icon-512x512.png"
  );
}

function canCache(response) {
  return response && (response.ok || response.type === "opaque");
}

function isSuccessfulDocument(response) {
  return response && response.ok && response.status < 400;
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const requests = await cache.keys();

  if (requests.length <= maxEntries) {
    return;
  }

  await Promise.all(
    requests.slice(0, requests.length - maxEntries).map((request) => cache.delete(request)),
  );
}
