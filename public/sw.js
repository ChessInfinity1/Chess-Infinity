const VERSION = "a845d0936ede";
const CORE = "chess-infinity-core-" + VERSION;
const PACK = "chess-infinity-pack-" + VERSION;
const MARKER = "/offline/__ready__";
const FILES = [
  "/offline/index.html",
  "/offline/app.js?v=" + VERSION,
  "/offline/app.css?v=" + VERSION,
  "/offline/LICENSES.txt",
];
const CORE_FILES = [
  "/offline-unavailable.html",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
];
async function cleanTrainingResponse(response) {
  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: {
      "Content-Type":
        response.headers.get("Content-Type") || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
async function fetchFile(path, timeout = 25000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(
      new Request(path, {
        credentials: "include",
        cache: "reload",
        signal: controller.signal,
      }),
    );
    await response.clone().arrayBuffer();
    return response;
  } finally {
    clearTimeout(timer);
  }
}
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CORE);
      // Optional icons and the reconnect page must never prevent worker activation.
      await Promise.allSettled(
        CORE_FILES.map(async (path) => {
          const response = await fetchFile(path, 5000);
          if (!response.ok) return;
          const type = response.headers.get("Content-Type") || "";
          if (path.endsWith(".html")) {
            if (
              !type.includes("text/html") ||
              !(await response.clone().text()).includes(
                'data-offline-fallback="chess-infinity"',
              )
            )
              return;
          } else if (!type.startsWith("image/")) return;
          await cache.put(path, await cleanTrainingResponse(response));
        }),
      );
      await self.skipWaiting();
    })(),
  );
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (n) =>
                (n.startsWith("chess-infinity-core-") && n !== CORE) ||
                n === "chess-infinity-static-v1",
            )
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
async function readyPack() {
  const names = await caches.keys();
  const candidates = [
    PACK,
    ...names
      .filter((n) => n.startsWith("chess-infinity-pack-") && n !== PACK)
      .reverse(),
  ];
  for (const name of candidates) {
    if (!names.includes(name)) continue;
    const cache = await caches.open(name);
    const marker = await cache.match(MARKER);
    if (marker) {
      const data = await marker.json();
      if (
        Array.isArray(data.files) &&
        (await Promise.all(data.files.map((path) => cache.match(path)))).every(
          Boolean,
        )
      )
        return { name, cache };
    }
  }
  return null;
}
async function status() {
  const names = await caches.keys();
  const own = names.includes(PACK) ? await caches.open(PACK) : null;
  return {
    ready: !!(
      own &&
      (await own.match(MARKER)) &&
      (await Promise.all(FILES.map((path) => own.match(path)))).every(Boolean)
    ),
    available: !!(await readyPack()),
    version: VERSION,
    files: FILES.length,
  };
}
function validAsset(path, response) {
  if (!response.ok) return false;
  if (response.redirected) {
    const final = new URL(response.url);
    if (
      path !== "/offline/index.html" ||
      final.origin !== self.location.origin ||
      final.pathname !== "/offline/"
    )
      return false;
  }
  const type = response.headers.get("content-type") || "";
  if (path.includes(".js")) return type.includes("javascript");
  if (path.includes(".css")) return type.includes("text/css");
  if (path.endsWith(".txt")) return type.includes("text/plain");
  return type.includes("text/html");
}
self.addEventListener("message", (event) => {
  const port = event.ports && event.ports[0];
  if (!port) return;
  const send = (data) => port.postMessage(data);
  event.waitUntil(
    (async () => {
      try {
        switch (event.data && event.data.type) {
          case "PACK_STATUS":
            send(await status());
            break;
          case "REMOVE_OFFLINE_PACK":
            for (const n of await caches.keys())
              if (n.startsWith("chess-infinity-pack-")) await caches.delete(n);
            send(await status());
            break;
          case "DOWNLOAD_OFFLINE_PACK": {
            if ((await status()).ready) {
              send(await status());
              break;
            }
            const cache = await caches.open(PACK);
            for (let i = 0; i < FILES.length; i++) {
              const path = FILES[i];
              let response;
              for (let attempt = 0; attempt < 2; attempt++) {
                try {
                  response = await fetchFile(path);
                  if (
                    attempt === 0 &&
                    [408, 429, 502, 503, 504].includes(response.status)
                  )
                    throw new Error("Temporary connection error");
                  break;
                } catch (error) {
                  if (attempt === 1)
                    throw new Error(
                      "The download was interrupted. Reconnect, then tap Retry download. Your practice records are safe.",
                    );
                  send({
                    type: "progress",
                    completed: i,
                    total: FILES.length,
                    retrying: true,
                  });
                }
              }
              if (!validAsset(path, response))
                throw new Error(
                  "A training file could not be downloaded. Open the app in your browser, sign in if asked, then retry.",
                );
              if (path.endsWith("index.html")) {
                const html = await response.clone().text();
                if (!html.includes('data-offline-app="chess-infinity"'))
                  throw new Error(
                    "Sign in to the academy before downloading offline practice.",
                  );
                if (
                  !html.includes("app.js?v=" + VERSION) ||
                  !html.includes("app.css?v=" + VERSION)
                )
                  throw new Error(
                    "A new app version is available. Reload the academy and try the download again.",
                  );
              }
              // Fresh Responses remove redirect metadata and cookie-varying gateway headers.
              // Redirected cached HTML is rejected for navigation requests by Fetch.
              await cache.put(path, await cleanTrainingResponse(response));
              send({ type: "progress", completed: i + 1, total: FILES.length });
            }
            await cache.put(
              MARKER,
              new Response(
                JSON.stringify({
                  version: VERSION,
                  files: FILES,
                  preparedAt: new Date().toISOString(),
                }),
                { headers: { "Content-Type": "application/json" } },
              ),
            );
            for (const n of await caches.keys())
              if (n.startsWith("chess-infinity-pack-") && n !== PACK)
                await caches.delete(n);
            send(await status());
            break;
          }
          default:
            throw new Error("Unsupported offline request.");
        }
      } catch (error) {
        send({
          error:
            error.name === "QuotaExceededError"
              ? "Your browser storage is full. Free some space, then retry the download. Practice records are kept."
              : error.message || "Offline setup failed. Please try again.",
        });
      }
    })(),
  );
});
async function matchingPackAsset(request) {
  const names = await caches.keys();
  for (const name of names.filter((n) =>
    n.startsWith("chess-infinity-pack-"),
  )) {
    const cache = await caches.open(name);
    if (!(await cache.match(MARKER))) continue;
    const response = await cache.match(request);
    if (response)
      return response.redirected ? cleanTrainingResponse(response) : response;
  }
  return null;
}
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        if (
          url.pathname === "/offline/index.html" ||
          url.pathname === "/offline/"
        ) {
          const pack = await readyPack();
          if (pack) {
            const response = await pack.cache.match("/offline/index.html");
            if (response)
              return response.redirected
                ? cleanTrainingResponse(response)
                : response;
          }
        }
        try {
          return await fetch(request);
        } catch {
          const pack = await readyPack();
          if (pack) {
            const response = await pack.cache.match("/offline/index.html");
            if (response)
              return response.redirected
                ? cleanTrainingResponse(response)
                : response;
          }
          return (
            (await (async () => {
              const fallback = await caches.match("/offline-unavailable.html");
              return fallback?.redirected
                ? cleanTrainingResponse(fallback)
                : fallback;
            })()) ||
            new Response("Reconnect to open Chess Infinity.", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
          );
        }
      })(),
    );
    return;
  }
  if (url.pathname.startsWith("/offline/")) {
    event.respondWith(
      matchingPackAsset(request).then((response) => response || fetch(request)),
    );
    return;
  }
  if (
    url.pathname.startsWith("/engine/") ||
    /^\/(favicon\.svg|icon-\d+\.png)$/.test(url.pathname)
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CORE);
        const found = await cache.match(request);
        if (found) return found;
        const response = await fetch(request);
        const type = response.headers.get("content-type") || "";
        if (
          response.ok &&
          !response.redirected &&
          (type.includes("javascript") ||
            type.includes("wasm") ||
            type.startsWith("image/"))
        )
          await cache.put(request, response.clone());
        return response;
      })(),
    );
  }
  // API calls, authenticated HTML, account metadata, and tokens are never cached.
});
