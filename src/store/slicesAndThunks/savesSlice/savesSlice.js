import { createSlice } from "@reduxjs/toolkit";
import { fetchSavedMedia, fetchSavedIds, fetchPlaylists, fetchPlaylist } from "./savesGet";
import { saveMedia, createPlaylist, addMediaToPlaylist } from "./savesPost";
import { renamePlaylist } from "./savesPatch";
import { unsaveMedia, deletePlaylist, removeMediaFromPlaylist } from "./savesDelete";
import { statuses } from "../../../utilities/constant";

// The tick and the count move together — a list that says "3 שיעורים" while
// showing an unticked row for the item just removed is the kind of small lie
// that makes the whole menu untrustworthy.
const setContains = (state, playlistId, contains) => {
  const playlist = state.playlists.find((p) => p.id === playlistId);
  if (!playlist || playlist.contains === contains) return;
  playlist.contains = contains;
  playlist.item_count = Math.max(0, (playlist.item_count ?? 0) + (contains ? 1 : -1));
};

// Three things, one slice, because they are one feature: `ids` is the source of
// truth for "is this saved" (what the button reads), `items` is the full rows for
// a screen that lists them, and `playlists` is the user's own lists with a
// `contains` flag for the lecture the menu was opened on.
//
// The lists live here rather than in a slice of their own because they are not
// independent of the saves: filing a lecture in a list also saves it, and
// unsaving it removes it from every list. Two slices would mean one reducer
// having to reach into the other's state to keep that true.
//
// `playlistsForMediaId` is what makes the `contains` flags readable at all.
// There is ONE list array in the store but the flags on it describe ONE lecture,
// and without recording which, the menu drew the previous lecture's ticks while
// the new request was still in flight — and a click in that window sent the
// opposite operation, because it decided add-or-remove from a stale flag. It is
// set only on a SUCCESSFUL load, so it names the lecture the flags actually came
// from, never the one they were merely requested for.
const savesSlice = createSlice({
  name: "saves",
  initialState: {
    items: [],
    ids: [],
    status: statuses.idle,
    playlists: [],
    playlistsStatus: statuses.idle,
    playlistsForMediaId: null,
    // The one list a user has opened, with the media rows inside it. Separate
    // from `playlists` above, which describes the lists themselves — that array
    // is what the save menu ticks and it carries no contents.
    openList: { playlist: null, items: [], status: statuses.idle },
    error: null,
  },
  reducers: {
    clearSaves(state) {
      state.items = [];
      state.ids = [];
      state.playlists = [];
      state.playlistsForMediaId = null;
      state.openList = { playlist: null, items: [], status: statuses.idle };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSavedMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchSavedMedia.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        state.items = action.payload;
        // The full list is authoritative about ids too, so a screen that loads
        // it does not also need the ids request.
        state.ids = action.payload.map((m) => m.id);
      })
      .addCase(fetchSavedMedia.rejected, (state, action) => {
        state.status = statuses.failed;
        state.error = action.payload?.message;
      })

      .addCase(fetchSavedIds.fulfilled, (state, action) => { state.ids = action.payload; })

      // Optimistic, for the same reason likes are: a save is trivially
      // reversible and the server call is idempotent, so waiting for a round
      // trip would only make the button feel broken on a slow connection.
      .addCase(saveMedia.pending, (state, action) => {
        if (!state.ids.includes(action.meta.arg)) state.ids.push(action.meta.arg);
      })
      .addCase(saveMedia.rejected, (state, action) => {
        state.ids = state.ids.filter((id) => id !== action.meta.arg);
      })

      .addCase(unsaveMedia.pending, (state, action) => {
        state.ids = state.ids.filter((id) => id !== action.meta.arg);
      })
      .addCase(unsaveMedia.fulfilled, (state, action) => {
        const { mediaId } = action.payload;
        // The card is dropped only once the server confirms, unlike the button
        // state above: removing it optimistically would mean having to put it
        // back on failure, and by then the row is gone with nothing to restore
        // it from.
        state.items = state.items.filter((m) => m.id !== mediaId);
        // Mirrors what the server did in the same transaction — the lecture is
        // out of every one of this user's lists now.
        //
        // Guarded on ownership: `contains` means "holds the lecture the rows
        // were loaded for". Clearing those flags after unsaving a DIFFERENT
        // lecture would untick lists that still hold theirs, and drop counts
        // that were never wrong.
        if (state.playlistsForMediaId === mediaId) {
          for (const p of state.playlists) {
            if (p.contains) {
              p.contains = false;
              p.item_count = Math.max(0, (p.item_count ?? 1) - 1);
            }
          }
        }
      })
      .addCase(unsaveMedia.rejected, (state, action) => {
        if (!state.ids.includes(action.meta.arg)) state.ids.push(action.meta.arg);
      })

      // ── The user's own lists ────────────────────────────────────────────────

      .addCase(fetchPlaylists.pending, (state) => { state.playlistsStatus = statuses.loading; })
      .addCase(fetchPlaylists.fulfilled, (state, action) => {
        state.playlistsStatus = statuses.succeeded;
        state.playlists = action.payload;
        // Only here, and only with the id these rows were actually loaded for.
        state.playlistsForMediaId = action.meta.arg;
      })
      .addCase(fetchPlaylists.rejected, (state) => {
        state.playlistsStatus = statuses.failed;
        // The rows on hand describe some other lecture, or nothing at all. Saying
        // so is what stops the menu from offering them as this lecture's answer.
        state.playlistsForMediaId = null;
      })

      // Newest first, matching the server's ordering — a list just created is
      // the one the user is about to tick. It arrives already holding the
      // lecture (item_count 1, contains true), because the server filed it in
      // the same transaction that created it.
      .addCase(createPlaylist.fulfilled, (state, action) => {
        state.playlists.unshift(action.payload);
        const { mediaId } = action.meta.arg;
        if (mediaId && !state.ids.includes(mediaId)) state.ids.push(mediaId);
      })

      // The contents of one opened list. The previous list's rows are cleared on
      // `pending` rather than left in place: they are a different list's
      // lectures under a heading that has already changed, and on a slow request
      // that is a page which reads as wrong rather than as loading.
      .addCase(fetchPlaylist.pending, (state) => {
        state.openList = { playlist: null, items: [], status: statuses.loading };
      })
      .addCase(fetchPlaylist.fulfilled, (state, action) => {
        const { items, ...playlist } = action.payload;
        state.openList = { playlist, items, status: statuses.succeeded };
      })
      .addCase(fetchPlaylist.rejected, (state) => {
        state.openList = { playlist: null, items: [], status: statuses.failed };
      })

      // Only the title moves. The row on hand carries `contains` for whichever
      // lecture the menu was opened on, and the server — which was not asked
      // about a lecture — cannot know it, so replacing the row wholesale would
      // untick a list the user is looking at.
      .addCase(renamePlaylist.fulfilled, (state, action) => {
        const playlist = state.playlists.find((p) => p.id === action.payload.id);
        if (playlist) playlist.title = action.payload.title;
        // The same list may also be the one open on the saved-content page,
        // where the title is the heading.
        if (state.openList.playlist?.id === action.payload.id) {
          state.openList.playlist.title = action.payload.title;
        }
      })

      .addCase(deletePlaylist.fulfilled, (state, action) => {
        state.playlists = state.playlists.filter((p) => p.id !== action.payload.playlistId);
      })

      // Both membership toggles are optimistic on pending, so a tick lands under
      // the finger rather than a round trip later, and are undone if the request
      // fails. `arg` is the {playlistId, mediaId} the thunk was called with.
      .addCase(addMediaToPlaylist.pending, (state, action) => {
        setContains(state, action.meta.arg.playlistId, true);
        // Filing a lecture saves it — see the server's addToPlaylist.
        if (!state.ids.includes(action.meta.arg.mediaId)) state.ids.push(action.meta.arg.mediaId);
      })
      .addCase(addMediaToPlaylist.rejected, (state, action) => {
        setContains(state, action.meta.arg.playlistId, false);
      })

      .addCase(removeMediaFromPlaylist.pending, (state, action) => {
        setContains(state, action.meta.arg.playlistId, false);
      })
      .addCase(removeMediaFromPlaylist.rejected, (state, action) => {
        setContains(state, action.meta.arg.playlistId, true);
      });
  },
});

export const { clearSaves } = savesSlice.actions;
export default savesSlice.reducer;
