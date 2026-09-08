import { describe, it, expect } from "vitest";
import { readFilters, writeFilters, EMPTY_FILTERS } from "./archiveFilterParams";

// A URL is typed, edited, truncated and forwarded by people and by chat clients,
// so every value here arrives from outside the application. The rule this file
// pins is that an unusable one becomes "no filter" — never an error, and never a
// request the server has to refuse. A shared link that opens an empty archive
// with a 400 in the console is a link that gets reported as "the site is broken".

const read = (query) => readFilters(new URLSearchParams(query));
const write = (filters) => writeFilters(filters).toString();

describe("reading a filter out of an address", () => {
  it("reads every filter the panel holds", () => {
    const filters = read("type=video&q=וירא&creator=הרב כהן&tags=2,5&not=7&from=2026-01-01&to=2026-02-01");
    expect(filters).toEqual({
      typeFilter: "video",
      searchQuery: "וירא",
      creatorFilter: "הרב כהן",
      tagIds: [2, 5],
      excludedTagIds: [7],
      dates: { uploadedAfter: "2026-01-01", uploadedBefore: "2026-02-01" },
    });
  });

  it("reads an address with nothing in it as no filter at all", () => {
    expect(read("")).toEqual(EMPTY_FILTERS);
  });

  // The two lists are separate parameters because they are separate questions.
  it("keeps the chosen and the excluded apart", () => {
    const filters = read("tags=2&not=5");
    expect(filters.tagIds).toEqual([2]);
    expect(filters.excludedTagIds).toEqual([5]);
  });
});

describe("values a person or a chat client mangled", () => {
  it("drops a media type that does not exist", () => {
    expect(read("type=banana").typeFilter).toBe("");
  });

  it("drops tag ids that are not ids", () => {
    expect(read("tags=2,abc,-4,0,5").tagIds).toEqual([2, 5]);
  });

  it("survives a list that was cut off mid-way", () => {
    expect(read("tags=2,").tagIds).toEqual([2]);
    expect(read("tags=").tagIds).toEqual([]);
  });

  // The server answers 400 on a date it cannot parse, and a link that errors is
  // worse than one that shows more than it should.
  it("drops a date that is not a date", () => {
    expect(read("from=yesterday&to=2026-13").dates).toEqual({
      uploadedAfter: "",
      uploadedBefore: "",
    });
  });

  it("has nothing to say about parameters it does not know", () => {
    expect(read("utm_source=whatsapp&page=3")).toEqual(EMPTY_FILTERS);
  });
});

describe("writing a filter into an address", () => {
  it("leaves out everything that is not set", () => {
    expect(write({ ...EMPTY_FILTERS, typeFilter: "audio" })).toBe("type=audio");
  });

  it("says nothing at all for an unfiltered archive", () => {
    expect(write(EMPTY_FILTERS)).toBe("");
    expect(write(undefined)).toBe("");
  });

  it("joins each list of ids into one parameter", () => {
    expect(write({ ...EMPTY_FILTERS, tagIds: [2, 5], excludedTagIds: [7] })).toBe("tags=2%2C5&not=7");
  });
});

// The property that matters most, because the URL is written FROM state that was
// read FROM the URL: if the two disagreed anywhere, the address would rewrite
// itself on every render, and the browser's history — or the render loop — would
// be the first thing to notice.
describe("an address survives the round trip", () => {
  const cases = [
    "",
    "type=video",
    "q=פרשת וירא",
    "tags=2%2C5&not=7",
    "type=audio&q=מוסר&creator=הרב כהן&tags=2&not=9&from=2026-01-01&to=2026-03-31",
  ];

  for (const query of cases) {
    it(`is unchanged by being read and written again: "${query}"`, () => {
      const once = write(read(query));
      expect(write(read(once))).toBe(once);
    });
  }

  it("normalises a mangled address to a clean one, and then holds still", () => {
    const cleaned = write(read("type=banana&tags=2,abc&from=never"));
    expect(cleaned).toBe("tags=2");
    expect(write(read(cleaned))).toBe(cleaned);
  });
});
