import { describe, it, expect } from "vitest";
import { creatorLabels, creatorPrefixes } from "../../utilities/constant";

// Attribution on the client: the wording each media type gets.
//
// The list of creators used to be derived here too, from the media in the store.
// That selector is gone — the archive filters server-side now, so the store
// holds a filtered subset and the list comes from its own endpoint. What is left
// is the part that is still pure logic.

// One column, two words. Getting this backwards shows "שם המרצה" over a book,
// which is the kind of wrong that looks like a typo rather than a bug and so
// survives a long time.
describe("the wording follows the media type", () => {
  it("calls it a lecturer for audio and video", () => {
    expect(creatorLabels.audio).toBe("שם המרצה");
    expect(creatorLabels.video).toBe("שם המרצה");
    expect(creatorPrefixes.audio).toBe("מרצה");
  });

  it("calls it an author for a document", () => {
    expect(creatorLabels.text).toBe("שם המחבר");
    expect(creatorPrefixes.text).toBe("מחבר");
  });

  // Both maps are read as `map[media_type] || map.video`, so every stored
  // media_type must have an entry or a whole type silently falls back.
  it("covers every media type", () => {
    for (const type of ["video", "audio", "text"]) {
      expect(creatorLabels[type]).toBeTruthy();
      expect(creatorPrefixes[type]).toBeTruthy();
    }
  });
});
