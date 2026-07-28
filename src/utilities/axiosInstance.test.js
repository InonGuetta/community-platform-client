import { test, expect, describe, beforeEach } from "vitest";
import axiosInstance, { setUnauthorizedHandler } from "./axiosInstance";

// The interceptor registered by the module, driven directly — no network.
const rejected = axiosInstance.interceptors.response.handlers[0].rejected;

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
