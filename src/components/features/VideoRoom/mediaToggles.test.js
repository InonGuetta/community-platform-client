import { test, expect, describe } from "vitest";
import { hasTrackKind, isKindEnabled, toggleTrackKind } from "./mediaToggles";

// The mute button, which is the one control in this application whose failure
// costs something outside the screen: a person who believes they are silent and
// keeps talking. It shipped with no test at all.
//
// A MediaStream is two array-returning methods and a boolean per track, so these
// run over plain objects — no browser, no camera, no permission prompt.

const track = (enabled = true) => ({ enabled });
const stream = ({ audio = [], video = [] } = {}) => ({
  getAudioTracks: () => audio,
  getVideoTracks: () => video,
});

describe("toggling", () => {
  test("mutes a live microphone and reports the new state", () => {
    const mic = track(true);
    const s = stream({ audio: [mic] });

    expect(toggleTrackKind(s, "audio")).toBe(false);
    expect(mic.enabled).toBe(false);
  });

  test("un-mutes again", () => {
    const mic = track(false);
    const s = stream({ audio: [mic] });

    expect(toggleTrackKind(s, "audio")).toBe(true);
    expect(mic.enabled).toBe(true);
  });

  // The failure this file was written for. `getAudioTracks()[0]` mutes one track
  // and leaves the rest transmitting, while the button reports silence — a
  // stream can carry a second microphone, or a screen capture that brought its
  // own audio.
  test("mutes EVERY track of the kind, not only the first", () => {
    const first = track(true);
    const second = track(true);
    const s = stream({ audio: [first, second] });

    toggleTrackKind(s, "audio");

    expect(first.enabled).toBe(false);
    expect(second.enabled).toBe(false);
  });

  // Tracks that started out disagreeing must end up agreeing, or the next press
  // flips them back into disagreement and one of them is live again while the
  // label says muted.
  test("brings tracks that disagree into one state", () => {
    const live = track(true);
    const alreadyMuted = track(false);
    const s = stream({ audio: [live, alreadyMuted] });

    const now = toggleTrackKind(s, "audio");

    expect([live.enabled, alreadyMuted.enabled]).toEqual([now, now]);
  });

  test("audio and video are independent", () => {
    const mic = track(true);
    const cam = track(true);
    const s = stream({ audio: [mic], video: [cam] });

    toggleTrackKind(s, "audio");

    expect(mic.enabled).toBe(false);
    expect(cam.enabled).toBe(true);
  });
});

describe("when there is nothing to toggle", () => {
  // Joining with no camera, or with a refused permission, is a supported path —
  // mediaErrors.js exists for it. null rather than false, because "there is no
  // microphone" and "the microphone is muted" are different things to tell a
  // user, and the caller has to be able to tell them apart.
  test("a stream with no track of that kind answers null", () => {
    expect(toggleTrackKind(stream({ video: [track()] }), "audio")).toBe(null);
    expect(toggleTrackKind(stream({ audio: [track()] }), "video")).toBe(null);
  });

  test("no stream at all does not throw", () => {
    for (const missing of [null, undefined, {}, "not a stream"]) {
      expect(toggleTrackKind(missing, "audio")).toBe(null);
      expect(hasTrackKind(missing, "audio")).toBe(false);
      expect(isKindEnabled(missing, "audio")).toBe(null);
    }
  });

  test("an unknown kind is refused rather than guessed at", () => {
    const s = stream({ audio: [track()] });
    expect(toggleTrackKind(s, "screen")).toBe(null);
    expect(hasTrackKind(s, "screen")).toBe(false);
  });
});

describe("reporting what is there", () => {
  test("hasTrackKind answers what the button should be able to do", () => {
    const s = stream({ audio: [track()] });
    expect(hasTrackKind(s, "audio")).toBe(true);
    expect(hasTrackKind(s, "video")).toBe(false);
  });

  test("isKindEnabled distinguishes muted from absent", () => {
    expect(isKindEnabled(stream({ audio: [track(true)] }), "audio")).toBe(true);
    expect(isKindEnabled(stream({ audio: [track(false)] }), "audio")).toBe(false);
    expect(isKindEnabled(stream({ audio: [] }), "audio")).toBe(null);
  });

  test("the reported state survives a round trip", () => {
    // What the hook stores comes from the toggle's return value, so the two must
    // agree — a drift between them is a label that describes the opposite of the
    // track.
    const s = stream({ audio: [track(true)] });
    const afterToggle = toggleTrackKind(s, "audio");
    expect(isKindEnabled(s, "audio")).toBe(afterToggle);
  });
});
