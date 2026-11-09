import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { readFile, stat } from "node:fs/promises";
const source = await readFile(
  new URL("../offline/sw-template.js", import.meta.url),
  "utf8",
);
function worker(version = "one", cacheStore = new Map()) {
  const origin = "https://academy.example";
  const events = {};
  const calls = [];
  let fail = "";
  let signedIn = true;
  let redirect = "";
  let pageVersion = version;
  let failBodyOnce = "";
  const key = (p) => new URL(typeof p === "string" ? p : p.url, origin).href;
  class SameOriginRequest extends Request {
    constructor(p, options) {
      super(key(p), options);
    }
  }
  const clone = (r) => {
    const copy = r.clone();
    if (r.redirected) {
      Object.defineProperty(copy, "redirected", { value: true });
      Object.defineProperty(copy, "url", { value: r.url });
    }
    return copy;
  };
  const caches = {
    async keys() {
      return [...cacheStore.keys()];
    },
    async delete(n) {
      return cacheStore.delete(n);
    },
    async open(n) {
      if (!cacheStore.has(n)) cacheStore.set(n, new Map());
      const entries = cacheStore.get(n);
      return {
        async match(p) {
          return entries.has(key(p)) ? clone(entries.get(key(p))) : undefined;
        },
        async put(p, r) {
          if (r.headers.get("Vary") === "*")
            throw new TypeError("Vary wildcard cannot be cached");
          entries.set(key(p), clone(r));
        },
        async addAll(paths) {
          for (const p of paths)
            entries.set(
              key(p),
              new Response("fallback", {
                headers: { "content-type": "text/html" },
              }),
            );
        },
      };
    },
    async match(p) {
      for (const entries of cacheStore.values())
        if (entries.has(key(p))) return clone(entries.get(key(p)));
    },
  };
  const fetch = async (req) => {
    const u = new URL(key(req));
    calls.push(u.pathname + u.search);
    if (u.pathname === fail || fail === "all") throw Error("Offline");
    if (!signedIn)
      return new Response("sign in", {
        headers: { "content-type": "text/html" },
      });
    if (u.pathname === failBodyOnce) {
      failBodyOnce = "";
      return new Response(
        new ReadableStream({
          start(controller) {
            controller.error(new Error("Interrupted file body"));
          },
        }),
        { headers: { "content-type": "text/javascript" } },
      );
    }
    const response = new Response(
      u.pathname.endsWith("index.html")
        ? `<!doctype html><html data-offline-app="chess-infinity">offline training<link href="/offline/app.css?v=${pageVersion}"><script src="/offline/app.js?v=${pageVersion}"></script></html>`
        : "asset " + u.pathname,
      {
        headers: {
          "content-type": u.pathname.endsWith(".js")
            ? "text/javascript"
            : u.pathname.endsWith(".css")
              ? "text/css"
              : u.pathname.endsWith(".txt")
                ? "text/plain"
                : "text/html",
        },
      },
    );
    if (redirect && u.pathname.endsWith("index.html")) {
      Object.defineProperty(response, "redirected", { value: true });
      Object.defineProperty(response, "url", {
        value: new URL(redirect, origin).href,
      });
    }
    return response;
  };
  vm.runInNewContext(source.replaceAll("__OFFLINE_VERSION__", version), {
    self: {
      location: { origin },
      addEventListener: (n, fn) => (events[n] = fn),
      skipWaiting() {},
      clients: { claim() {} },
    },
    caches,
    fetch,
    Request: SameOriginRequest,
    Response,
    URL,
    Date,
    Promise,
    Error,
    AbortController,
    setTimeout,
    clearTimeout,
  });
  return {
    cacheStore,
    calls,
    setFail: (p) => (fail = p),
    setBodyFailure: (p) => (failBodyOnce = p),
    setSignedIn: (v) => (signedIn = v),
    setRedirect: (v) => (redirect = v),
    setPageVersion: (v) => (pageVersion = v),
    async install() {
      let task;
      events.install({ waitUntil: (p) => (task = p) });
      await task;
    },
    async message(type) {
      let task;
      const messages = [];
      events.message({
        data: { type },
        ports: [{ postMessage: (m) => messages.push(m) }],
        waitUntil: (p) => (task = p),
      });
      await task;
      return messages;
    },
    async navigate(path) {
      let task;
      events.fetch({
        request: { url: key(path), method: "GET", mode: "navigate" },
        respondWith: (p) => (task = p),
      });
      const response = await task;
      if (response.redirected)
        throw new TypeError("Redirected response rejected for navigation");
      return response;
    },
    async fetch(path) {
      let task;
      events.fetch({
        request: new SameOriginRequest(path),
        respondWith: (p) => (task = p),
      });
      return task ? await task : null;
    },
  };
}
test("offline pack becomes ready only after every validated training file is cached", async () => {
  const w = worker();
  assert.equal((await w.message("PACK_STATUS")).at(-1).available, false);
  const messages = await w.message("DOWNLOAD_OFFLINE_PACK");
  assert.deepEqual(
    messages.filter((m) => m.type === "progress").map((m) => m.completed),
    [1, 2, 3, 4],
  );
  assert.equal(messages.at(-1).ready, true);
  assert.equal(w.calls.length, 4);
  assert.equal((await w.navigate("/offline/index.html")).status, 200);
  const calls = w.calls.length;
  await w.fetch("/offline/app.js?v=one");
  assert.equal(w.calls.length, calls);
  assert.equal(await w.fetch("/api/progress"), null);
});
test("partial downloads and sign-in HTML never produce a ready pack", async () => {
  const w = worker();
  w.setFail("/offline/app.css");
  assert.ok((await w.message("DOWNLOAD_OFFLINE_PACK")).at(-1).error);
  assert.equal((await w.message("PACK_STATUS")).at(-1).available, false);
  const gated = worker();
  gated.setSignedIn(false);
  assert.ok((await gated.message("DOWNLOAD_OFFLINE_PACK")).at(-1).error);
  assert.equal((await gated.message("PACK_STATUS")).at(-1).ready, false);
});
test("a failed update keeps the previous pack usable and offline navigation falls back to it", async () => {
  const old = worker();
  await old.message("DOWNLOAD_OFFLINE_PACK");
  const next = worker("two", old.cacheStore);
  next.setFail("/offline/app.js");
  assert.ok((await next.message("DOWNLOAD_OFFLINE_PACK")).at(-1).error);
  let status = (await next.message("PACK_STATUS")).at(-1);
  assert.equal(status.ready, false);
  assert.equal(status.available, true);
  next.setFail("all");
  assert.match(await (await next.navigate("/")).text(), /offline training/);
  assert.equal(
    (await next.message("REMOVE_OFFLINE_PACK")).at(-1).available,
    false,
  );
});
test("missing cached assets invalidate readiness rather than falsely claiming offline availability", async () => {
  const w = worker();
  await w.message("DOWNLOAD_OFFLINE_PACK");
  w.cacheStore
    .get("chess-infinity-pack-one")
    .delete("https://academy.example/offline/app.css?v=one");
  const status = (await w.message("PACK_STATUS")).at(-1);
  assert.equal(status.ready, false);
  assert.equal(status.available, false);
});
test("manifest uses app icons and authenticated requests; generated offline files exist", async () => {
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(manifest.display, "fullscreen");
  assert.deepEqual(manifest.display_override, ["fullscreen", "standalone"]);
  assert.equal(manifest.scope, "/");
  for (const icon of manifest.icons) {
    const f = await stat(new URL("../public" + icon.src, import.meta.url));
    assert.ok(f.size > 100);
  }
  const layout = await readFile(
    new URL("../app/layout.tsx", import.meta.url),
    "utf8",
  );
  assert.match(layout, /crossOrigin="use-credentials"/);
  const html = await readFile(
    new URL("../public/offline/index.html", import.meta.url),
    "utf8",
  );
  assert.match(html, /data-offline-app="chess-infinity"/);
  for (const file of ["app.js", "app.css", "LICENSES.txt"])
    assert.ok(
      (await stat(new URL("../public/offline/" + file, import.meta.url))).size >
        100,
    );
});

test("hosting canonical HTML redirect is accepted, while sign-in and cross-origin redirects are rejected", async () => {
  const canonical = worker();
  canonical.setRedirect("/offline/");
  assert.equal(
    (await canonical.message("DOWNLOAD_OFFLINE_PACK")).at(-1).ready,
    true,
  );
  assert.match(
    await (await canonical.navigate("/offline/")).text(),
    /offline training/,
  );
  for (const url of [
    "/signin-with-chatgpt",
    "https://unrelated.example/offline/",
  ]) {
    const gated = worker();
    gated.setRedirect(url);
    assert.ok((await gated.message("DOWNLOAD_OFFLINE_PACK")).at(-1).error);
    assert.equal((await gated.message("PACK_STATUS")).at(-1).available, false);
  }
});

test("a version mismatch during deployment is never marked as a complete offline download", async () => {
  const w = worker();
  w.setPageVersion("newer-deployment");
  assert.match(
    (await w.message("DOWNLOAD_OFFLINE_PACK")).at(-1).error,
    /new app version/,
  );
  assert.equal((await w.message("PACK_STATUS")).at(-1).ready, false);
});

test("optional missing install assets do not block service-worker activation", async () => {
  const w = worker();
  w.setFail("all");
  await w.install();
  assert.equal((await w.message("PACK_STATUS")).at(-1).ready, false);
});
test("cached redirected training HTML is normalized before use for manual-mode navigation", async () => {
  const w = worker();
  w.setRedirect("/offline/");
  assert.equal((await w.message("DOWNLOAD_OFFLINE_PACK")).at(-1).ready, true);
  const response = await w.navigate("/offline/");
  assert.equal(response.redirected, false);
  assert.equal(response.headers.get("content-type"), "text/html");
  assert.match(await response.text(), /offline training/);
});

test("a training-file body interrupted after headers is retried before readiness is reported", async () => {
  const w = worker();
  w.setBodyFailure("/offline/app.js");
  const messages = await w.message("DOWNLOAD_OFFLINE_PACK");
  assert.equal(messages.at(-1).ready, true);
  assert.equal(
    w.calls.filter((p) => p.startsWith("/offline/app.js")).length,
    2,
  );
  assert.ok(messages.some((m) => m.retrying));
});
