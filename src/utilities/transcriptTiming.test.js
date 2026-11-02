import { describe, it, expect } from "vitest";
import {
  anchorsFromChunks,
  timeAtWord,
  splitCues,
  buildCues,
  transcriptCues,
  cueIndexAt,
  captionAt,
  toVtt,
  MAX_CUE_WORDS,
} from "./transcriptTiming";

// Captions and the scrolling transcript (PRD MOB-5, MOB-6).

const words = (n, prefix = "מילה") => Array.from({ length: n }, (_, i) => `${prefix}${i + 1}`).join(" ");

describe("the timeline", () => {
  it("is interpolated by word between anchors, and held at the ends", () => {
    const anchors = [[0, 10], [10, 20], [20, 60]];
    expect(timeAtWord(anchors, 0)).toBe(10);
    expect(timeAtWord(anchors, 5)).toBe(15);
    expect(timeAtWord(anchors, 15)).toBe(40);
    expect(timeAtWord(anchors, 99)).toBe(60);
    expect(timeAtWord(anchors, -3)).toBe(10);
    expect(timeAtWord([], 4)).toBe(0);
  });

  // A lesson from before migration 041: one start per chunk and the last end.
  it("is estimated from the chunks when no timing was stored", () => {
    const chunks = [
      { content: words(500), start_time: 0, end_time: 200 },
      { content: words(300), start_time: 205, end_time: 330 },
      { content: "", start_time: 330, end_time: 331 },
    ];
    expect(anchorsFromChunks(chunks)).toEqual([[0, 0], [500, 205], [800, 330]]);
    // A book: chunks with no times at all.
    expect(anchorsFromChunks([{ content: "א ב", start_time: null, end_time: null }])).toEqual([]);
  });
});

describe("cutting the text into cues", () => {
  it("follows sentences and paragraphs", () => {
    const cues = splitCues("שלום לכולם. היום נלמד דף.\nפרק חדש");
    expect(cues.map((c) => c.text)).toEqual(["שלום לכולם.", "היום נלמד דף.", "פרק חדש"]);
    expect(cues.map((c) => [c.startWord, c.endWord])).toEqual([[0, 2], [2, 5], [5, 7]]);
  });

  // Whisper's Hebrew often has no punctuation, and a minute-long caption is
  // unreadable.
  it("cuts a long run with no punctuation into even, short pieces", () => {
    const cues = splitCues(words(30));
    expect(cues).toHaveLength(3);
    expect(cues.every((c) => c.text.split(" ").length <= MAX_CUE_WORDS)).toBe(true);
    expect(cues.map((c) => c.text.split(" ").length)).toEqual([10, 10, 10]);
  });
});

describe("cues with times", () => {
  it("place each cue where its words are said", () => {
    const cues = buildCues("א ב. ג ד.", [[0, 0], [2, 10], [4, 20]]);
    expect(cues).toEqual([
      { text: "א ב.", start: 0, end: 10 },
      { text: "ג ד.", start: 10, end: 20 },
    ]);
  });

  // An edited transcript has a different number of words than the one that was
  // timed; it is laid over the same timeline in proportion.
  it("stretch an edited text over the same timeline", () => {
    const cues = buildCues("א. ב.", [[0, 0], [4, 40]]);
    expect(cues.map((c) => [c.start, c.end])).toEqual([[0, 20], [20, 40]]);
  });

  it("from a transcript: stored timing is precise, chunks are an estimate", () => {
    const chunks = [{ content: "א ב ג ד", start_time: 0, end_time: 8 }];
    expect(transcriptCues({ chunks, timing: [[0, 0], [2, 3], [4, 8]] }).precise).toBe(true);
    const estimated = transcriptCues({ chunks, timing: null });
    expect(estimated.precise).toBe(false);
    expect(estimated.cues[0]).toMatchObject({ text: "א ב ג ד", start: 0, end: 8 });
  });

  it("use the lecturer's edited text when there is one", () => {
    const transcript = { chunks: [{ content: "שגיאה", start_time: 0, end_time: 5 }], edited_text: "תיקון", timing: null };
    expect(transcriptCues(transcript).cues[0].text).toBe("תיקון");
  });

  it("are nothing for a book or an unfinished transcript", () => {
    expect(transcriptCues(null)).toBeNull();
    expect(transcriptCues({ chunks: [] })).toBeNull();
    expect(transcriptCues({ chunks: [{ content: "א", start_time: null }] })).toBeNull();
  });
});

describe("following the player", () => {
  const cues = [
    { text: "א", start: 0, end: 4 },
    { text: "ב", start: 5, end: 9 },
    { text: "ג", start: 30, end: 34 },
  ];

  it("finds the cue being said", () => {
    expect(cueIndexAt(cues, 0)).toBe(0);
    expect(cueIndexAt(cues, 6)).toBe(1);
    expect(cueIndexAt(cues, 20)).toBe(1);
    expect(cueIndexAt(cues, 99)).toBe(2);
    expect(cueIndexAt(cues, -1)).toBeNull();
    expect(cueIndexAt([], 3)).toBeNull();
  });

  it("shows no caption over a long silence", () => {
    expect(captionAt(cues, 6)).toBe("ב");
    expect(captionAt(cues, 10)).toBe("ב");
    expect(captionAt(cues, 20)).toBeNull();
  });
});

describe("the captions file", () => {
  it("is WebVTT, with times and no overlapping cues", () => {
    const vtt = toVtt([
      { text: "שלום", start: 0, end: 2.5 },
      { text: "עולם", start: 2, end: 3725.25 },
    ]);
    expect(vtt).toBe(
      "WEBVTT\n\n1\n00:00:00.000 --> 00:00:02.000\nשלום\n\n2\n00:00:02.000 --> 01:02:05.250\nעולם\n"
    );
  });

  it("says when the times are estimated", () => {
    expect(toVtt([{ text: "א", start: 0, end: 1 }], { precise: false })).toMatch(/^WEBVTT\n\nNOTE\nהזמנים משוערים/);
  });
});
