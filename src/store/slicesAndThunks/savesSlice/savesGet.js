import { createApiThunk } from "../../createApiThunk";
import { savesApi } from "../../../api/savesApi";

// The full saved rows, for a screen that renders cards.
export const fetchSavedMedia = createApiThunk("saves/fetchMedia", "Failed to fetch saved media", async () => {
  return await savesApi.list();
});

// Only the ids, for screens that render a save button and need to know whether
// it is already on.
export const fetchSavedIds = createApiThunk("saves/fetchIds", "Failed to fetch saves", async () => {
  return await savesApi.listIds();
});

// Fetched when the save menu opens rather than on mount: the lists are only ever
// looked at through that menu, and the `contains` flags they carry are about one
// specific lecture — so holding them from an earlier open would mean showing
// ticks that belong to a different item.
export const fetchPlaylists = createApiThunk(
  "saves/fetchPlaylists", "Failed to fetch lists",
  // An object rather than a bare mediaId, because there are now two callers
  // asking two different questions of the same endpoint: the save menu wants the
  // names and which of them hold one lecture, the saved page wants the names and
  // what is inside each.
  async (options = {}) => {
    return await savesApi.listPlaylists(options);
  }
);

// One list and what is in it, for the page that opens a single list. Kept apart
// from `playlists` in the store: those rows describe the lists themselves and
// are what the save menu ticks, while this is a screenful of media rows that
// happens to be reachable directly by URL.
export const fetchPlaylist = createApiThunk(
  "saves/fetchPlaylist", "Failed to fetch list",
  async (playlistId) => {
    return await savesApi.getPlaylist(playlistId);
  }
);
