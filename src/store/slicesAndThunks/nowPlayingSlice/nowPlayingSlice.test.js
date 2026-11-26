import { test, expect } from "vitest";
import reducer, { playInBar, closeBar, handOverToPage, clearHandover, isPlayableInBar } from "./nowPlayingSlice";
import { bottomChromeFor, DOCK_CLEARANCE, DOCK_OFFSET, NOW_PLAYING_HEIGHT } from "../../../components/layout/shellGeometry";

// The bottom player's state (D-145): what is in the bar, and what it left for
// the lesson page that took it over.

const audio = { id: 7, media_type: "audio", title: "שיעור", creator_name: "הרב", duration_seconds: 3600, tags: [{ id: 1 }] };
const video = { id: 8, media_type: "video", title: "שיחה" };
const book = { id: 9, media_type: "text", title: "ספר" };

const initial = reducer(undefined, { type: "@@init" });

test("starts closed", () => {
  expect(initial).toEqual({ item: null, handover: null });
});

test("opens with the fields the bar shows, not the whole row", () => {
  const state = reducer(initial, playInBar(audio));
  expect(state.item).toMatchObject({ id: 7, media_type: "audio", title: "שיעור", creator_name: "הרב", duration_seconds: 3600 });
  expect(state.item.tags).toBeUndefined();
});

test("another item replaces the one playing", () => {
  const state = reducer(reducer(initial, playInBar(audio)), playInBar(video));
  expect(state.item.id).toBe(8);
});

test("refuses a book — a book is read, not played", () => {
  expect(isPlayableInBar(book)).toBe(false);
  expect(reducer(initial, playInBar(book)).item).toBeNull();
  // ...and does not close what is already playing.
  expect(reducer(reducer(initial, playInBar(audio)), playInBar(book)).item.id).toBe(7);
});

test("closes", () => {
  expect(reducer(reducer(initial, playInBar(audio)), closeBar()).item).toBeNull();
});

test("a handover closes the bar and leaves where it was for the page", () => {
  const playing = reducer(initial, playInBar(audio));
  const state = reducer(playing, handOverToPage({ position: 754, playing: true, rate: 1.5 }));
  expect(state.item).toBeNull();
  expect(state.handover).toEqual({ id: 7, position: 754, playing: true, rate: 1.5 });
  expect(reducer(state, clearHandover()).handover).toBeNull();
});

test("a handover with nothing in the bar leaves nothing", () => {
  expect(reducer(initial, handOverToPage({ position: 5 })).handover).toBeNull();
});

test("opening a new item forgets an untaken handover", () => {
  const handedOver = reducer(reducer(initial, playInBar(audio)), handOverToPage({ position: 9 }));
  expect(reducer(handedOver, playInBar(video)).handover).toBeNull();
});

test("the foot of the screen grows by the bar, and the dock stands on it", () => {
  const closed = bottomChromeFor(null);
  expect(closed.barOpen).toBe(false);
  expect(closed.dockOffset).toEqual(DOCK_OFFSET);
  expect(closed.clearance).toEqual({ xs: DOCK_CLEARANCE, md: DOCK_CLEARANCE });

  const open = bottomChromeFor("audio");
  expect(open.dockOffset).toEqual({ xs: DOCK_OFFSET.xs + NOW_PLAYING_HEIGHT.xs, md: DOCK_OFFSET.md + NOW_PLAYING_HEIGHT.md });
  expect(open.clearance.md).toBe(DOCK_CLEARANCE + NOW_PLAYING_HEIGHT.md);
  expect(open.dockBottom.md).toBeGreaterThan(NOW_PLAYING_HEIGHT.md);

  // Beside a docked video window, a page's foot clears the window too.
  expect(bottomChromeFor("video").clearance.md).toBeGreaterThan(open.clearance.md);
});
