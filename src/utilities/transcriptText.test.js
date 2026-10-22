import { describe, test, expect, vi, beforeEach } from "vitest";
import { transcriptToText } from "./transcriptText";

// A book's page loads its chunks WITHOUT their text (?content=0) — a sefer is
// megabytes, and loading it whole on every visit timed out as a 503.

const get = vi.hoisted(() => vi.fn());
vi.mock("../utilities/axiosInstance", () => ({ default: { get } }));

import { transcriptsApi } from "../api/transcriptsApi";

describe("the transcript as text", () => {
  test("chunks are joined as paragraphs", () => {
    expect(transcriptToText({ chunks: [{ content: "א" }, { content: "ב" }] })).toBe("א\n\nב");
  });

  test("an edited transcript wins over its chunks", () => {
    expect(transcriptToText({ edited_text: "מתוקן", chunks: [{ content: "א" }] })).toBe("מתוקן");
  });

  // Empty, not "undefined\n\nundefined": the download menu fetches the real
  // text exactly when this is empty, and a non-empty string would stop it.
  test("chunks loaded without their text give no text at all", () => {
    expect(transcriptToText({ chunks: [{ id: 1, page_number: 4 }, { id: 2, page_number: 5 }] })).toBe("");
  });
});

describe("asking for a transcript without its text", () => {
  beforeEach(() => get.mockReset().mockResolvedValue({ data: {} }));

  test("by default the full transcript is asked for, as every caller always did", async () => {
    await transcriptsApi.get(7);
    expect(get).toHaveBeenCalledWith("/transcripts/7", undefined);
  });

  test("content: false asks the server to leave the text out", async () => {
    await transcriptsApi.get(20, { content: false });
    expect(get).toHaveBeenCalledWith("/transcripts/20", { params: { content: 0 } });
  });
});
