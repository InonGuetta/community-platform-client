import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import axiosInstance, { setUnauthorizedHandler, normalizeError, shouldRetry, RETRY_DELAYS_MS } from "./axiosInstance";

// The normalizer registered by the module, driven directly — no network.
const rejected = normalizeError;

let fired = 0;
beforeEach(() => {
  fired = 0;
  setUnauthorizedHandler(() => { fired++; });
});

const send = (status, url, data = { message: "Unauthorized" }) =>
  rejected({ config: { url }, response: { status, data } }).catch((err) => err);

test("a 401 on a normal request reports the session as expired", async () => {
  const err = await send(401, "/media/get-all");
  expect(fired).toBe(1);
  // Still rejects, so the calling thunk can handle it as before.
  expect(err.response.status).toBe(401);
});

// A 401 from these is ordinary traffic: /auth/me is what an anonymous visitor
// gets on first load, and /auth/login answers 401 for a wrong password. Wiping
// session state while someone mistypes their password would be worse than the
// bug this fixes.
describe("auth endpoints are not treated as an expiry", () => {
  test.each(["/auth/login", "/auth/me", "/auth/logout", "/auth/register"])("%s does not fire", async (url) => {
    await send(401, url, { message: "Invalid credentials" });
    expect(fired).toBe(0);
  });
});

test.each([400, 403, 404, 409, 500, 503])("a %i does not clear the session", async (status) => {
  await send(status, "/media/get-all", { message: "x" });
  expect(fired).toBe(0);
});

describe("failures that are not the server's answer", () => {
  test("no response at all becomes a readable message and is not an expiry", async () => {
    const err = await rejected({ config: { url: "/media/get-all" }, message: "Network Error" }).catch((e) => e);
    expect(err.response.data.message).toMatch(/Cannot reach the server/);
    expect(fired).toBe(0);
  });

  test("a non-JSON body is normalised to an object", async () => {
    const err = await send(500, "/media/get-all", "<html>proxy error</html>");
    expect(typeof err.response.data).toBe("object");
    expect(err.response.data.message).toBeTruthy();
  });

  // The failures invented HERE still have to carry a code, because the Hebrew
  // the user sees is keyed on it. This is the case that was actually broken:
  // the unreachable-server text was reworded, the translation was keyed on the
  // old prose, and the specific Hebrew silently stopped applying. The wording
  // below is deliberately not asserted — that it is free to change is the point.
  test.each([
    ["no response at all", { config: { url: "/media/get-all" }, message: "Network Error" }, "NETWORK_UNREACHABLE"],
    ["a non-JSON 5xx body", { config: { url: "/x" }, response: { status: 503, data: "<html>down</html>" } }, "SERVER_UNAVAILABLE"],
    ["a non-JSON 4xx body", { config: { url: "/x" }, response: { status: 400, data: "nope" } }, "BAD_RESPONSE"],
  ])("%s is stamped with %s", async (_label, input, code) => {
    const err = await rejected(input).catch((e) => e);
    expect(err.response.data.code).toBe(code);
  });

  // A body the API did send keeps its own code — the normaliser only fills in
  // for responses that never carried one.
  test("a real API error keeps the server's code", async () => {
    const err = await send(404, "/media/9", { message: "Media not found", code: "MEDIA_NOT_FOUND" });
    expect(err.response.data.code).toBe("MEDIA_NOT_FOUND");
  });

  // A retried request is normalised by the inner pass; the outer one must not
  // treat the same 401 as a second expiry.
  test("an already-normalised error is left alone", async () => {
    const err = await send(401, "/media/get-all");
    await rejected(err).catch(() => {});
    expect(fired).toBe(1);
  });
});

test("concurrent 401s are harmless", async () => {
  await Promise.all([send(401, "/media/1"), send(401, "/bookmarks"), send(401, "/notes")]);
  // The action is idempotent, so firing once per failed request is fine.
  expect(fired).toBe(3);
});

test("nothing throws when no handler has been wired up", async () => {
  setUnauthorizedHandler(null);
  const err = await send(401, "/media/1");
  expect(err.response.status).toBe(401);
});

// ── Retrying what the server never processed ────────────────────────────────
// The failure the API server's boot gap produces: the request is refused by a
// gateway (502/503/504) or by nothing at all, so no handler ran and replaying
// it cannot double anything.
describe("shouldRetry", () => {
  const err = (status, config = { method: "get", url: "/media/1" }) => ({
    config,
    ...(status ? { response: { status } } : {}),
  });

  // What the Vite proxy answers with when nothing is listening on :3001.
  const unreachable = (config = { method: "get", url: "/media/1" }) => ({
    config,
    response: { status: 503, data: { message: "API server unavailable", code: "API_UNAVAILABLE" } },
  });

  test.each([502, 503, 504])("a %i from a gateway is retried", (status) => {
    expect(shouldRetry(err(status), 0)).toBe(true);
  });

  test("no response at all is retried", () => {
    expect(shouldRetry(err(null), 0)).toBe(true);
  });

  // These are the server's own answer about a request it did process.
  test.each([400, 401, 403, 404, 409, 429, 500])("a %i is not retried", (status) => {
    expect(shouldRetry(err(status), 0)).toBe(false);
  });

  test("stops once the schedule is spent", () => {
    expect(shouldRetry(unreachable(), RETRY_DELAYS_MS.length - 1)).toBe(true);
    expect(shouldRetry(unreachable(), RETRY_DELAYS_MS.length)).toBe(false);
  });

  // A 5xx the API answered itself still counts against /auth/login's
  // 10-per-minute limiter, so it gets the short end of the schedule; one the
  // API never saw costs nothing and gets all of it.
  describe("only failures the server never saw use the whole schedule", () => {
    test("a proxy 503 keeps retrying to the end", () => {
      expect(shouldRetry(unreachable(), 2)).toBe(true);
    });

    test("no response at all keeps retrying to the end", () => {
      expect(shouldRetry(err(null), 2)).toBe(true);
    });

    test("a 5xx that may be the API's own answer stops early", () => {
      expect(shouldRetry(err(503), 1)).toBe(true);
      expect(shouldRetry(err(503), 2)).toBe(false);
    });
  });

  test("a cancelled request is not retried", () => {
    expect(shouldRetry({ ...err(null), __CANCEL__: true }, 0)).toBe(false);
  });

  test("an error with no config cannot be replayed", () => {
    expect(shouldRetry({ response: { status: 503 } }, 0)).toBe(false);
  });

  describe("only requests that are safe to repeat", () => {
    const post = (url) => err(503, { method: "post", url });

    test.each(["/auth/login", "/auth/logout"])("%s is replayed", (url) => {
      expect(shouldRetry(post(url), 0)).toBe(true);
    });

    // A replay after a lost response would answer "Email already in use",
    // which is more misleading than the error it replaced.
    test("/auth/register is not replayed", () => {
      expect(shouldRetry(post("/auth/register"), 0)).toBe(false);
    });

    test("an arbitrary POST is not replayed", () => {
      expect(shouldRetry(post("/media/upload"), 0)).toBe(false);
    });

    test.each(["put", "delete", "head", "options"])("%s is idempotent and is replayed", (method) => {
      expect(shouldRetry(err(503, { method, url: "/notes/1" }), 0)).toBe(true);
    });

    test("the method defaults to GET when axios has not filled it in", () => {
      expect(shouldRetry(err(503, { url: "/media/1" }), 0)).toBe(true);
    });
  });
});

// End to end through the real interceptor chain, with the adapter standing in
// for the network. This is what the boot gap actually looks like to the app.
describe("a login through a server that is still booting", () => {
  const originalAdapter = axiosInstance.defaults.adapter;
  const WHOLE_SCHEDULE_MS = RETRY_DELAYS_MS.reduce((a, b) => a + b, 0);
  let attempts;

  // Stands in for the Vite proxy answering 503 while nothing listens on :3001.
  const unavailableUntil = (successfulAttempt) => (config) => {
    attempts++;
    if (attempts < successfulAttempt) {
      return Promise.reject(Object.assign(new Error("Request failed with status code 503"), {
        config,
        response: { status: 503, statusText: "Service Unavailable", headers: {}, config, data: { message: "API server unavailable", code: "API_UNAVAILABLE" } },
      }));
    }
    return Promise.resolve({ status: 200, statusText: "OK", headers: {}, config, data: { user: { id: 1 } } });
  };

  beforeEach(() => {
    attempts = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    axiosInstance.defaults.adapter = originalAdapter;
  });

  test("succeeds once the server comes up, without the caller seeing an error", async () => {
    axiosInstance.defaults.adapter = unavailableUntil(3);

    const pending = axiosInstance.post("/auth/login", { email: "a@b.c", password: "x" });
    await vi.advanceTimersByTimeAsync(WHOLE_SCHEDULE_MS);

    const response = await pending;
    expect(response.data.user.id).toBe(1);
    expect(attempts).toBe(3);
  });

  test("gives up after the schedule and reports something a user can act on", async () => {
    axiosInstance.defaults.adapter = unavailableUntil(Infinity);

    const settled = axiosInstance.post("/auth/login", { email: "a@b.c", password: "x" }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(WHOLE_SCHEDULE_MS);

    const err = await settled;
    expect(err.response.status).toBe(503);
    expect(err.response.data.message).toBeTruthy();
    expect(attempts).toBe(RETRY_DELAYS_MS.length + 1);
  });

  test("a request that is not safe to replay is sent exactly once", async () => {
    axiosInstance.defaults.adapter = unavailableUntil(Infinity);

    const settled = axiosInstance.post("/auth/register", { email: "a@b.c" }).catch((e) => e);
    await vi.advanceTimersByTimeAsync(WHOLE_SCHEDULE_MS);

    await settled;
    expect(attempts).toBe(1);
  });
});
