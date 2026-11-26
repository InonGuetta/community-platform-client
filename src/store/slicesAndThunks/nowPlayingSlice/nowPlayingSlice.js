import { createSlice } from "@reduxjs/toolkit";
import { mediaTypes } from "../../../utilities/constant";

// The bottom player (D-145): which lesson is playing in the bar at the foot of
// the screen, kept across navigation — the bar itself is mounted once, in the
// app's shell, and reads it from here.
//
//   item      the lesson in the bar, or null when the bar is closed. Only the
//             fields the bar shows and the lock screen names — not the whole
//             row, which the archive may update or drop while it plays.
//   handover  set when the lesson's own page opens while the bar was playing
//             it: where it was, whether it was playing and at what speed. The
//             page takes it once and clears it (useMediaViewPageController),
//             so one lesson never plays in two elements at once.
//
// No thunks: nothing here talks to the server. The position is saved by the
// bar through usePlaybackProgress, the same hook the lesson page saves with.

const PLAYABLE = new Set([mediaTypes.audio, mediaTypes.video]);

// Text and books are read, not played — the hero opens their page instead.
export const isPlayableInBar = (item) => Boolean(item) && PLAYABLE.has(item.media_type);

const barItemOf = (item) => ({
  id: item.id,
  media_type: item.media_type,
  title: item.title ?? "",
  creator_name: item.creator_name ?? null,
  thumbnail_url: item.thumbnail_url ?? null,
  duration_seconds: item.duration_seconds ?? null,
  course_title: item.course_title ?? null,
});

const nowPlayingSlice = createSlice({
  name: "nowPlaying",
  initialState: { item: null, handover: null },
  reducers: {
    // Opens the bar, or replaces what is in it. A text item is refused here
    // too, not only by the hero, so no caller can put a book in a media bar.
    playInBar(state, action) {
      if (!isPlayableInBar(action.payload)) return;
      state.item = barItemOf(action.payload);
      state.handover = null;
    },
    closeBar(state) {
      state.item = null;
    },
    // The lesson's page has opened: the bar steps aside and hands it over.
    handOverToPage(state, action) {
      if (!state.item) return;
      const { position = 0, playing = false, rate = 1 } = action.payload || {};
      state.handover = { id: state.item.id, position, playing, rate };
      state.item = null;
    },
    clearHandover(state) {
      state.handover = null;
    },
  },
});

export const { playInBar, closeBar, handOverToPage, clearHandover } = nowPlayingSlice.actions;
export default nowPlayingSlice.reducer;
