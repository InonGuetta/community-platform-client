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
    const filters = read("type=video&q=וירא&creator=הרב כהן&tags=2,5&not=7&from=2026-01-01&to=2026-02-01&sort=liked&len=medium");
    expect(filters).toEqual({
      selectedTypes: ["video"],
      searchQuery: "וירא",
      creatorFilter: "הרב כהן",
      tagIds: [2, 5],
      excludedTagIds: [7],
      dates: { uploadedAfter: "2026-01-01", uploadedBefore: "2026-02-01" },
      sortOrder: "liked",
      durationRange: "medium",
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
    expect(read("type=banana").selectedTypes).toEqual([]);
    expect(read("type=video,banana").selectedTypes).toEqual(["video"]);
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
    expect(write({ ...EMPTY_FILTERS, selectedTypes: ["audio"] })).toBe("type=audio");
  });

  // The toggle is a multi-select; several types travel as one parameter.
  it("writes several media types comma-joined, and reads them back", () => {
    const address = write({ ...EMPTY_FILTERS, selectedTypes: ["video", "audio"] });
    expect(address).toBe("type=video%2Caudio");
    expect(read(address).selectedTypes).toEqual(["video", "audio"]);
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

describe("the sort order in the address", () => {
  it("is newest first when the address says nothing", () => {
    expect(read("").sortOrder).toBe("newest");
  });

  it("drops an order that does not exist rather than sending it", () => {
    expect(read("sort=banana").sortOrder).toBe("newest");
  });

  // The archive as it opens is still a clean URL.
  it("leaves the default out of the address, and writes any other", () => {
    expect(write({ ...EMPTY_FILTERS })).toBe("");
    expect(write({ ...EMPTY_FILTERS, sortOrder: "title" })).toBe("sort=title");
  });

  it("round-trips with the filters beside it", () => {
    const filters = { ...EMPTY_FILTERS, selectedTypes: ["audio"], sortOrder: "creator" };
    expect(read(write(filters))).toEqual(filters);
  });
});

describe("the length range in the address", () => {
  it("is named, not given in seconds, and drops a name it does not know", () => {
    expect(read("len=short").durationRange).toBe("short");
    expect(read("len=900").durationRange).toBe("");
    expect(read("").durationRange).toBe("");
  });

  it("is written only when one is chosen", () => {
    expect(write({ ...EMPTY_FILTERS })).toBe("");
    expect(write({ ...EMPTY_FILTERS, durationRange: "xlong" })).toBe("len=xlong");
  });
});
