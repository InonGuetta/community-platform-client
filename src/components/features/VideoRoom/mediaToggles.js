// Muting and un-muting, as a rule rather than as three lines inside a hook.
//
// Extracted for the same reason peerMesh.js and stageGeometry.js were: what
// matters here is not React, it is what happens to the tracks — and that could
// not be checked without a browser, a camera and a microphone. A MediaStream is
// two array-returning methods and a boolean per track, so the rule can be driven
// over a plain object instead.
//
// It earns its own file because of what it is. A mute button that does not mute
// is not a UI bug: somebody believes they are silent and keeps talking. That is
// the one control in this application where being wrong has a cost outside the
// screen, and it was the only one with no test at all.

const TRACK_GETTER = {
  audio: "getAudioTracks",
  video: "getVideoTracks",
};

// Defensive about the stream because it genuinely may not exist: joining with no
// camera or a refused permission is a supported path (see mediaErrors.js), and
// the controls are rendered either way.
const tracksOf = (stream, kind) => {
  const getter = TRACK_GETTER[kind];
  const tracks = getter && typeof stream?.[getter] === "function" ? stream[getter]() : null;
  return Array.isArray(tracks) ? tracks : [];
};

// Whether there is anything of this kind to turn on or off at all.
//
// The caller needs this to tell the truth in the UI. Without it a user who
// joined with no microphone still saw an enabled, unmuted-looking mic button:
// pressing it did nothing, and the icon went on claiming they were live.
export const hasTrackKind = (stream, kind) => tracksOf(stream, kind).length > 0;

// Whether it is currently live. null when there is nothing of that kind, which
// is a different answer from false and is why this does not return a bare
// boolean.
export const isKindEnabled = (stream, kind) => {
  const tracks = tracksOf(stream, kind);
  if (tracks.length === 0) return null;
  // Every track is set together below, so the first one speaks for all of them.
  return Boolean(tracks[0].enabled);
};

// Flip every track of the kind, and answer with the state they are now in.
//
// EVERY track, not `getAudioTracks()[0]` — which is what this was. One stream
// can carry more than one track of a kind (a second microphone, a screen capture
// that brought its own audio), and toggling only the first mutes one while the
// other keeps transmitting, with the button reporting silence. That is precisely
// the failure this file exists to make impossible, and it costs one loop.
//
// Returns null when there was nothing to toggle, so the caller can leave its
// state alone instead of flipping a label that describes nothing. The previous
// code returned early here and left the indicator on its stale value.
//
// `enabled` rather than stop(): a stopped track cannot be restarted, so
// un-muting would mean asking for the device again — a permission prompt every
// time — and every peer would have to renegotiate. `enabled` is instant, silent
// on the wire, and reversible.
export const toggleTrackKind = (stream, kind) => {
  const tracks = tracksOf(stream, kind);
  if (tracks.length === 0) return null;

  const next = !tracks[0].enabled;
  for (const track of tracks) track.enabled = next;
  return next;
};
