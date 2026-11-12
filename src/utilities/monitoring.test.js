import { describe, it, expect, vi, beforeEach } from "vitest";
import { initMonitoring, captureError, scrubEvent, scrubUrl, scrubText, resetMonitoringForTests } from "./monitoring";

// External error reporting in the browser (PRD NFR-1), with the SDK replaced:
// what it is configured with, and what is stripped before anything is sent.

const fakeSentry = () => {
  const calls = { init: null, captured: [] };
  const Sentry = {
    init: (options) => { calls.init = options; },
    captureException: (error, context) => calls.captured.push([error.message, context]),
    globalHandlersIntegration: () => "globalHandlers",
    dedupeIntegration: () => "dedupe",
  };
  return { calls, load: vi.fn(async () => Sentry) };
};

beforeEach(() => resetMonitoringForTests());

describe("starting", () => {
  it("loads nothing at all without a DSN", async () => {
    const { load } = fakeSentry();
    expect(initMonitoring({ dsn: "", load })).toBe(null);
    captureError(new Error("dropped"));
    expect(load).not.toHaveBeenCalled();
  });

  it("collects nothing on its own: no default integrations, no breadcrumbs, no tracing", async () => {
    const { calls, load } = fakeSentry();
    await initMonitoring({ dsn: "https://k@o.example/1", load });
    expect(calls.init).toMatchObject({
      dsn: "https://k@o.example/1",
      defaultIntegrations: false,
      integrations: ["globalHandlers", "dedupe"],
      tracesSampleRate: 0,
      maxBreadcrumbs: 0,
    });
    expect(calls.init.beforeBreadcrumb({ message: "click" })).toBe(null);
  });

  it("sends an error captured while the SDK was still loading, once it arrives", async () => {
    const { calls, load } = fakeSentry();
    const started = initMonitoring({ dsn: "https://k@o.example/1", load });
    captureError(new Error("early"), { tags: { kind: "render-crash" } });
    await started;
    captureError(new Error("later"));
    expect(calls.captured.map(([m]) => m)).toEqual(["early", "later"]);
    expect(calls.captured[0][1].tags).toEqual({ kind: "render-crash" });
  });
});

describe("what may leave the browser", () => {
  it("never the query string or the fragment — a reset link carries its token there", () => {
    expect(scrubUrl("https://site/reset-password?token=abc#x")).toBe("https://site/reset-password");
    expect(scrubUrl("/archive?q=תשובה")).toBe("/archive");
  });

  it("never the user, headers, cookies, breadcrumbs, or an email or token in a message", () => {
    const event = scrubEvent({
      user: { id: 1, email: "a@b.co" },
      request: { url: "https://site/media/3?t=60", headers: { Cookie: "token=x" }, cookies: { token: "x" } },
      breadcrumbs: [{ message: "x" }],
      message: "failed for a@b.co",
      exception: { values: [{ value: "token eyJa.eyJb.c", stacktrace: { frames: [{ filename: "https://site/assets/i.js?v=1", abs_path: "https://site/x.js#y" }] } }] },
    });
    expect(event.user).toBeUndefined();
    expect(event.request).toEqual({ url: "https://site/media/3" });
    expect(event.breadcrumbs).toEqual([]);
    expect(event.message).toBe("failed for [email]");
    expect(event.exception.values[0].value).toBe("token [token]");
    expect(event.exception.values[0].stacktrace.frames[0]).toEqual({ filename: "https://site/assets/i.js", abs_path: "https://site/x.js" });
    expect(scrubText("pk_test_123abc")).toBe("[key]");
  });
});
