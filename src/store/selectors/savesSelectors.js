// What the saves slice holds, read in one place — the general save (ids), the
// user's own lists, and the one list a page has open.
//
// Plain reads, not createSelector: each returns a value already in the store,
// so there is nothing to compute and nothing to memoise.

// The ids of everything saved, for lighting the save button on a lecture.
export const selectSavedIds = (state) => state.saves.ids;

// The user's lists. The same array serves two screens with different
// questions: the save menu asks with a lecture (`contains` describes it), the
// personal page asks for what is inside each list (`items`). See
// savesApi.listPlaylists.
export const selectPlaylists = (state) => state.saves.playlists;
export const selectPlaylistsStatus = (state) => state.saves.playlistsStatus;

// Which lecture the lists' `contains` flags describe — the last one they were
// loaded for. The save menu shows its ticks only when this is its own lecture.
export const selectPlaylistsForMediaId = (state) => state.saves.playlistsForMediaId;

// The list a page of its own has open: `{ playlist, items, status }`.
export const selectOpenPlaylist = (state) => state.saves.openList;
