import { describe, test, expect, vi } from "vitest";
import { placeOf, canOpenPlace, openPlace } from "./discussionPlace";
import { headlineSegments } from "./searchHeadline";

describe("where a passage is", () => {
  // 0 is the first second of every recording. Treating it as "no time" would
  // turn the opening of a shiur into an unclickable "קטע 1".
  test("a recording's passage at 0:00 is a time, not a missing one", () => {
    expect(placeOf({ start_time: 0, page_number: null, chunk_index: 0 }))
      .toEqual({ kind: "time", seconds: 0, label: "0:00" });
  });

  test("past the hour, the label carries the hour", () => {
    expect(placeOf({ start_time: 3725 }).label).toBe("1:02:05");
  });

  test("a book's passage is its page", () => {
    expect(placeOf({ start_time: null, page_number: 47, chunk_index: 3 }))
      .toEqual({ kind: "page", page: 47, label: "עמ' 47" });
  });

  test("text with neither is labelled by position, and opens nothing", () => {
    const place = placeOf({ start_time: null, page_number: null, chunk_index: 4 });
    expect(place).toEqual({ kind: "none", label: "קטע 5" });
    expect(canOpenPlace(place, { onSeek: () => {}, onOpenPage: () => {} })).toBe(false);
  });
});

describe("opening a passage", () => {
  test("a time seeks, and only when there is a player", () => {
    const onSeek = vi.fn();
    const place = placeOf({ start_time: 754 });
    expect(canOpenPlace(place, {})).toBe(false);
    expect(canOpenPlace(place, { onOpenPage: () => {} })).toBe(false);
    expect(canOpenPlace(place, { onSeek })).toBe(true);
    openPlace(place, { onSeek });
    expect(onSeek).toHaveBeenCalledWith(754);
  });

  test("a page opens the reader, and only when there is one", () => {
    const onOpenPage = vi.fn();
    const place = placeOf({ start_time: null, page_number: 47 });
    expect(canOpenPlace(place, { onSeek: () => {} })).toBe(false);
    openPlace(place, { onOpenPage });
    expect(onOpenPage).toHaveBeenCalledWith(47);
  });
});

describe("the search snippet", () => {
  test("matched words become bold segments, the rest stays text", () => {
    expect(headlineSegments("אמר <b>תשובה</b> היא <b>חזרה</b>")).toEqual([
      { text: "אמר ", bold: false },
      { text: "תשובה", bold: true },
      { text: " היא ", bold: false },
      { text: "חזרה", bold: true },
    ]);
  });

  // The snippet is transcript text. Anything that looks like markup in it is
  // content to be shown, never HTML to be run.
  test("other tags are left as the literal text they are", () => {
    const segments = headlineSegments('<img src=x onerror="alert(1)"> <b>מילה</b>');
    expect(segments[0]).toEqual({ text: '<img src=x onerror="alert(1)"> ', bold: false });
    expect(segments[1]).toEqual({ text: "מילה", bold: true });
  });

  test("a hit found by meaning alone is one plain segment", () => {
    expect(headlineSegments("פתיחת השיעור")).toEqual([{ text: "פתיחת השיעור", bold: false }]);
    expect(headlineSegments("")).toEqual([]);
  });
});
