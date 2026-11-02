// The service worker (PRD MOB-2) — what lets the app OPEN with no network.
//
// It keeps the app itself: index.html, the hashed files under /assets/ that it
// names, the manifest and the icons. With those, a phone with no signal can still
// start the app, whose sign-in check then fails to reach the server and sends it
// to the downloads page (see ProtectedRoute).
//
// What it deliberately does NOT do:
//   - answer anything under /api/ or /socket.io/. A stale lesson list or a stale
//     "who am I" is worse than an honest "no connection".
//   - touch the lessons kept for listening. The page stores those itself, in its
//     own Cache Storage cache, and plays them from there
//     (src/utilities/offlineStore.js). This worker never opens or deletes it.
//
// Registered only in a production build (src/utilities/serviceWorker.js): under
// the dev server it would cache files Vite rewrites on every save.
//
// A plain script, not a module, and not bundled: the browser fetches it by this
// exact URL to check for updates, so it has to keep this name.

const SHELL_CACHE = "app-shell-v1";

// Not named in index.html's <script>/<link> tags under /assets/, but needed to
// show the app and its icon offline.
const SHELL_STATIC = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/favicon.svg",
  "/icons/favicon-32.png",
  "/icons/apple-touch-icon.png",
];

// Every /assets/ file a built index.html loads. Vite names them by content hash,
// so a name is its version: a file that is already cached never needs fetching.
const assetsIn = (html) => {
  const urls = new Set();
  const pattern = /(?:src|href)="(\/assets\/[^"]+)"/g;
  let match;
  while ((match = pattern.exec(html))) urls.add(match[1]);
  return [...urls];
};

const addIfMissing = async (cache, url) => {
  if (await cache.match(url)) return;
  const response = await fetch(url);
  if (response.ok) await cache.put(url, response);
};

// The current index.html and everything it names, stored together — the HTML
// last, so the cache never holds a page whose files are not there yet. Files of
// older builds are dropped: a name that is no longer referenced is never asked
// for again by a page opened from this cache.
const cacheShell = async () => {
  const response = await fetch("/index.html", { cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();
  const assets = assetsIn(html);
  const cache = await caches.open(SHELL_CACHE);

  await Promise.all(assets.map((url) => addIfMissing(cache, url)));
  // The icons are a nicety: one that fails to load must not stop the rest.
  await Promise.all(SHELL_STATIC.map((url) => addIfMissing(cache, url).catch(() => {})));
  await cache.put("/index.html", response);

  const keep = new Set(assets);
  for (const request of await cache.keys()) {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/assets/") && !keep.has(pathname)) await cache.delete(request);
  }
};

self.addEventListener("install", (event) => {
  // A failure here (offline at install time) must not block installing: the
  // shell is cached again on the next page load that reaches the network.
  event.waitUntil(cacheShell().catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    // Only this worker's own older caches. The lessons' cache is the page's.
    for (const name of await caches.keys()) {
      if (name.startsWith("app-shell-") && name !== SHELL_CACHE) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

// A page load: the network first, so a deploy is picked up at once, and the
// cached index.html only when the network fails. A successful load refreshes the
// cache in the background — that is how a new build reaches it.
const navigate = async (event) => {
  try {
    const response = await fetch(event.request);
    if (response.ok) event.waitUntil(cacheShell().catch(() => {}));
    return response;
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    return (await cache.match("/index.html")) || Response.error();
  }
};

// A built file: from the cache when it is there (its name is its version), from
// the network otherwise — and kept, so a lazily loaded chunk that was used once
// online is there offline too.
const cacheFirst = async (request) => {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/socket.io/")) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(event));
  } else if (url.pathname.startsWith("/assets/") || SHELL_STATIC.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});
