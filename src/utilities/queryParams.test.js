import { describe, it, expect } from "vitest";
import { serializeParams } from "./queryParams";

// The shape a list has on the wire, pinned.
//
// This is the quietest failure in the application and it had already happened:
// axios spells an array as `tagIds[]=1&tagIds[]=2`, Express 5's default query
// parser leaves the brackets in the NAME, and the server's `req.query.tagIds`
// came back undefined. The request was well formed, the answer was 200, and the
// archive came back unfiltered — a filter that appears to do nothing, with no
// error anywhere to look for.
//
// The server reads the repeated form and its tests assert it. This is the other
// half of that agreement, and the reason it is worth a test of its own: nothing
// else in either repository would notice the day the serializer is dropped.

describe("lists on the wire", () => {
  it("repeats the key instead of bracketing it", () => {
    expect(serializeParams({ tagIds: [1, 2] })).toBe("tagIds=1&tagIds=2");
  });

  it("never emits the bracketed form axios would produce by default", () => {
    expect(serializeParams({ tagIds: [1, 2] })).not.toContain("[]");
    expect(serializeParams({ tagIds: [1, 2] })).not.toContain("%5B%5D");
  });

  it("sends the two tag lists as two separate parameters", () => {
    expect(serializeParams({ tagIds: [2], excludeTagIds: [5, 6] })).toBe(
      "tagIds=2&excludeTagIds=5&excludeTagIds=6"
    );
  });

  it("leaves a single value alone", () => {
    expect(serializeParams({ type: "video", creator: "הרב כהן" })).toBe(
      `type=video&creator=${encodeURIComponent("הרב כהן")}`
    );
  });
});

describe("what is left out", () => {
  // An absent parameter means "no filter". Sending `creator=` would ask the
  // server to compare against an empty string instead.
  it("omits undefined and null rather than sending them empty", () => {
    expect(serializeParams({ type: "video", creator: undefined, search: null })).toBe("type=video");
  });

  it("omits an empty list entirely", () => {
    expect(serializeParams({ tagIds: [], type: "audio" })).toBe("type=audio");
  });

  it("has nothing to say about an empty request", () => {
    expect(serializeParams({})).toBe("");
    expect(serializeParams()).toBe("");
  });
});

describe("encoding", () => {
  it("encodes Hebrew and spaces in a value", () => {
    expect(serializeParams({ search: "פרשת וירא" })).toBe(
      `search=${encodeURIComponent("פרשת וירא")}`
    );
  });

  // & and = inside a value would otherwise read as another parameter.
  it("encodes the characters that separate parameters", () => {
    expect(serializeParams({ search: "a&b=c" })).toBe("search=a%26b%3Dc");
  });

  it("keeps a boolean and a number readable", () => {
    expect(serializeParams({ published: true, limit: 12 })).toBe("published=true&limit=12");
  });
});
