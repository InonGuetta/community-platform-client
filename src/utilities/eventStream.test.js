import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { readEventStream } from "./eventStream";

// The streamed "דיון עם AI" answer, read by hand from fetch. The network cuts
// the stream wherever it likes — between events, inside one, inside a Hebrew
// character — and every one of those must read the same.

const bytes = (s) => new TextEncoder().encode(s);
const streamOf = (chunks) =>
  new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(typeof c === "string" ? bytes(c) : c);
      controller.close();
    },
  });

const event = (name, data) => `event: ${name}\ndata: ${JSON.stringify(data)}\n\n`;
const DONE = { conversation: { id: 17 }, messages: [{ id: 1 }, { id: 2 }] };

describe("reading the answer as it arrives", () => {
  test("pieces go to onDelta in order, and `done` is the result", async () => {
    const onDelta = vi.fn();
    const result = await readEventStream(
      streamOf([event("delta", { text: "תשובה " }), event("delta", { text: "[1]." }), event("done", DONE)]),
      onDelta
    );
    expect(onDelta.mock.calls.map((c) => c[0])).toEqual(["תשובה ", "[1]."]);
    expect(result).toEqual(DONE);
  });

  test("an event cut across two network chunks is read whole", async () => {
    const whole = event("delta", { text: "שלום" }) + event("done", DONE);
    const onDelta = vi.fn();
    await readEventStream(streamOf([whole.slice(0, 17), whole.slice(17)]), onDelta);
    expect(onDelta).toHaveBeenCalledWith("שלום");
  });

  // A Hebrew letter is two bytes in UTF-8; a chunk boundary can fall between them.
  test("a Hebrew character split between chunks is not corrupted", async () => {
    const all = bytes(event("delta", { text: "שלום" }) + event("done", DONE));
    const middleOfLetter = all.indexOf(0xd7) + 1;
    const onDelta = vi.fn();
    await readEventStream(streamOf([all.slice(0, middleOfLetter), all.slice(middleOfLetter)]), onDelta);
    expect(onDelta).toHaveBeenCalledWith("שלום");
  });

  test("CRLF line endings read the same", async () => {
    const crlf = (event("delta", { text: "א" }) + event("done", DONE)).replace(/\n/g, "\r\n");
    const onDelta = vi.fn();
    expect(await readEventStream(streamOf([crlf]), onDelta)).toEqual(DONE);
    expect(onDelta).toHaveBeenCalledWith("א");
  });
});

describe("how an answer can fail", () => {
  test("an error event is thrown in axios's shape, with the server's code", async () => {
    await expect(readEventStream(streamOf([event("delta", { text: "x" }), event("error", { code: "AI_ANSWER_FAILED", message: "m" })])))
      .rejects.toEqual({ response: { status: 502, data: { code: "AI_ANSWER_FAILED", message: "m" } } });
  });

  // The connection dropped: no `done`, no `error`. That is a failed answer,
  // not a silent success with half a sentence on screen.
  test("a stream that ends without `done` is a failed answer", async () => {
    await expect(readEventStream(streamOf([event("delta", { text: "חצי" })]), () => {}))
      .rejects.toMatchObject({ response: { data: { code: "AI_ANSWER_FAILED" } } });
  });
});

describe("asking through fetch", () => {
  const fetchMock = vi.fn();
  const reportUnauthorized = vi.hoisted(() => vi.fn());
  vi.mock("./axiosInstance", () => ({ default: {}, reportUnauthorized }));

  beforeEach(() => {
    fetchMock.mockReset();
    reportUnauthorized.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  test("posts the question with the session cookie, and reads the stream", async () => {
    const { discussionApi } = await import("../api/discussionApi");
    fetchMock.mockResolvedValue({ ok: true, status: 200, body: streamOf([event("done", DONE)]) });
    expect(await discussionApi.askStream(42, "מה העיקר?")).toEqual(DONE);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/discussion/42/messages/stream");
    expect(init).toMatchObject({ method: "POST", credentials: "include", body: JSON.stringify({ question: "מה העיקר?" }) });
  });

  test("a refusal is thrown in axios's shape, with its status and code", async () => {
    const { discussionApi } = await import("../api/discussionApi");
    fetchMock.mockResolvedValue({ ok: false, status: 409, json: async () => ({ code: "AI_NOT_READY" }) });
    await expect(discussionApi.askStream(42, "x")).rejects.toEqual({ response: { status: 409, data: { code: "AI_NOT_READY" } } });
    expect(reportUnauthorized).not.toHaveBeenCalled();
  });

  // The same as every other request: an expired session ends the session.
  test("a 401 reports the expired session", async () => {
    const { discussionApi } = await import("../api/discussionApi");
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
    await expect(discussionApi.askStream(42, "x")).rejects.toBeTruthy();
    expect(reportUnauthorized).toHaveBeenCalled();
  });
});
