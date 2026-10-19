import { test, expect } from "vitest";
import reducer from "./savesSlice";
import { fetchPlaylists } from "./savesGet";

// fetchPlaylists takes an options object. The slice once stored that whole
// object as `playlistsForMediaId`, the save menu compared it to a number, the
// comparison never matched, and the menu spun forever without showing a list.
const loaded = (arg) =>
  reducer(undefined, fetchPlaylists.fulfilled([{ id: 1, title: "שיעורי מוסר" }], "req", arg));

test("the rows are marked with the lecture they were loaded for", () => {
  expect(loaded({ mediaId: 7 }).playlistsForMediaId).toBe(7);
});

test("rows loaded for the saved page describe no lecture", () => {
  expect(loaded({ withItems: true }).playlistsForMediaId).toBeNull();
});
