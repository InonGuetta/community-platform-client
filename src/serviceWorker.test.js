import { describe, it, expect, beforeEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { fakeCaches } from "./utilities/offlineStore.fakes";
import { OFFLINE_CACHE } from "./utilities/offlineStore";
import { registerServiceWorker } from "./utilities/serviceWorker";

// The service worker that lets the app open with no network (PRD MOB-2).
//
// public/sw.js is a plain script the browser fetches by URL, never imported by
// the app, so it is run here as the browser runs it: in a context of its own,
// with `self`, `caches` and `fetch` supplied. Everything it does goes through
// those three, which is what makes this a test of the real file.

const SW = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public", "sw.js"),
  "utf8"
);
const ORIGIN = "https://app.test";

const INDEX_HTML = `<!doctype html><html><head>
<script type="module" crossorigin src="/assets/index-abc123.js"></script>
<link rel="stylesheet" crossorigin href="/assets/index-def456.css">
<link rel="manifest" href="/manifest.webmanifest" />
</head><body><div id="root"></div></body></html>`;

const loadWorker = ({ online = true, html = INDEX_HTML } = {}) => {
  const listeners = {};
  const caches = fakeCaches();
  const network = { online, html, requests: [] };
  const fetch = vi.fn(async (input) => {
    const url = typeof input === "string" ? input : input.url;
    network.requests.push(url);
    if (!network.online) throw new TypeError("Failed to fetch");
    const pathname = new URL(url, ORIGIN).pathname;
    if (pathname === "/index.html" || pathname === "/" || !pathname.includes(".")) {
      return new Response(network.html, { headers: { "Content-Type": "text/html" } });
    }
    return new Response(`body of ${pathname}`);
  });
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type, handler) => { listeners[type] = handler; },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(async () => {}) },
  };
  vm.runInNewContext(SW, { self, caches, fetch, Response, URL, Promise, Set });

  const waitFor = [];
  const extendable = () => ({ waitUntil: (p) => waitFor.push(p) });
  const settle = async () => { while (waitFor.length) await waitFor.shift(); };

  const install = async () => { listeners.install(extendable()); await settle(); };
  const activate = async () => { listeners.activate(extendable()); await settle(); };

  // Returns the response the worker gave, or null when it let the browser
  // handle the request itself.
  const request = async (pathname, { mode = "no-cors", method = "GET", origin = ORIGIN } = {}) => {
    let responded = null;
    const event = {
      request: { url: `${origin}${pathname}`, method, mode },
      respondWith: (p) => { responded = p; },
      ...extendable(),
    };
    listeners.fetch(event);
    const response = responded ? await responded : null;
    await settle();
    return response;
  };

  return { caches, network, fetch, install, activate, request, self };
};

const shellPaths = async (caches) =>
  [...(caches.stores.get("app-shell-v1")?.keys() ?? [])].sort();

describe("installing", () => {
  it("keeps index.html and every file it names", async () => {
    const sw = loadWorker();
    await sw.install();
    const kept = await shellPaths(sw.caches);
    expect(kept).toContain("/index.html");
    expect(kept).toContain("/assets/index-abc123.js");
    expect(kept).toContain("/assets/index-def456.css");
    expect(kept).toContain("/manifest.webmanifest");
    expect(kept).toContain("/icons/icon-192.png");
    expect(sw.self.skipWaiting).toHaveBeenCalled();
  });

  it("installs even with no network, and caches the shell on the next load that has one", async () => {
    const sw = loadWorker({ online: false });
    await expect(sw.install()).resolves.toBeUndefined();
    expect(await shellPaths(sw.caches)).toEqual([]);

    sw.network.online = true;
    await sw.request("/archive", { mode: "navigate" });
    expect(await shellPaths(sw.caches)).toContain("/index.html");
  });

  it("drops the files of an older build when a new one is cached", async () => {
    const sw = loadWorker();
    await sw.install();
    sw.network.html = INDEX_HTML.replace("index-abc123.js", "index-new999.js");
    await sw.request("/archive", { mode: "navigate" });
    const kept = await shellPaths(sw.caches);
    expect(kept).toContain("/assets/index-new999.js");
    expect(kept).not.toContain("/assets/index-abc123.js");
    // The stylesheet did not change, so it was neither dropped nor fetched again.
    expect(kept).toContain("/assets/index-def456.css");
    expect(sw.network.requests.filter((u) => u.endsWith("index-def456.css"))).toHaveLength(1);
  });

  it("leaves the saved lessons alone when it activates", async () => {
    const sw = loadWorker();
    await (await sw.caches.open(OFFLINE_CACHE)).put("/offline/media/1", new Response("lesson"));
    await (await sw.caches.open("app-shell-v0")).put("/index.html", new Response("old"));
    await sw.activate();
    expect(sw.caches.stores.has(OFFLINE_CACHE)).toBe(true);
    expect(sw.caches.stores.has("app-shell-v0")).toBe(false);
    expect(sw.self.clients.claim).toHaveBeenCalled();
  });
});

describe("answering requests", () => {
  let sw;
  beforeEach(async () => {
    sw = loadWorker();
    await sw.install();
  });

  it("opens the app from the cache when there is no network", async () => {
    sw.network.online = false;
    const page = await sw.request("/media/12", { mode: "navigate" });
    expect(await page.text()).toContain('<div id="root">');
    const script = await sw.request("/assets/index-abc123.js");
    expect(await script.text()).toBe("body of /assets/index-abc123.js");
  });

  it("prefers the network for a page, so a deploy is seen at once", async () => {
    sw.network.html = "<html>fresh</html>";
    const page = await sw.request("/archive", { mode: "navigate" });
    expect(await page.text()).toBe("<html>fresh</html>");
  });

  it("serves a built file from the cache without asking the network", async () => {
    const before = sw.fetch.mock.calls.length;
    await sw.request("/assets/index-abc123.js");
    expect(sw.fetch.mock.calls.length).toBe(before);
  });

  it("keeps a lazily loaded file the first time it is used online", async () => {
    await sw.request("/assets/PdfViewer-777.js");
    sw.network.online = false;
    expect(await (await sw.request("/assets/PdfViewer-777.js")).text()).toBe("body of /assets/PdfViewer-777.js");
  });

  // Never a cached "who am I" or a cached lesson list.
  it.each([
    ["the API", "/api/auth/me", {}],
    ["the live-session socket", "/socket.io/?EIO=4", {}],
    ["a write", "/assets/x.js", { method: "POST" }],
    ["another site", "/assets/x.js", { origin: "https://cdn.example" }],
  ])("leaves %s to the browser", async (_label, pathname, options) => {
    expect(await sw.request(pathname, options)).toBeNull();
  });
});

describe("registering", () => {
  const fakeEnv = () => {
    const handlers = {};
    return {
      nav: { serviceWorker: { register: vi.fn(async () => ({})) } },
      win: { addEventListener: (type, fn) => { handlers[type] = fn; } },
      handlers,
    };
  };

  it("registers /sw.js after the page has loaded, in a production build", () => {
    const { nav, win, handlers } = fakeEnv();
    expect(registerServiceWorker({ enabled: true, nav, win })).toBe(true);
    expect(nav.serviceWorker.register).not.toHaveBeenCalled();
    handlers.load();
    expect(nav.serviceWorker.register).toHaveBeenCalledWith("/sw.js");
  });

  it("does nothing under the dev server, or in a browser without workers", () => {
    const { nav, win } = fakeEnv();
    expect(registerServiceWorker({ enabled: false, nav, win })).toBe(false);
    expect(registerServiceWorker({ enabled: true, nav: {}, win })).toBe(false);
  });
});
