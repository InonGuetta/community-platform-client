import { createAsyncThunk } from "@reduxjs/toolkit";
import { savesApi } from "../../../api/savesApi";
import { rejectionOf } from "../../../utilities/apiError";

// The full saved rows, for a screen that renders cards.
export const fetchSavedMedia = createAsyncThunk("saves/fetchMedia", async (_, { rejectWithValue }) => {
  try {
    return await savesApi.list();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch saved media"));
  }
});

// Only the ids, for screens that render a save button and need to know whether
// it is already on.
export const fetchSavedIds = createAsyncThunk("saves/fetchIds", async (_, { rejectWithValue }) => {
  try {
    return await savesApi.listIds();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch saves"));
  }
});

// Fetched when the save menu opens rather than on mount: the lists are only ever
// looked at through that menu, and the `contains` flags they carry are about one
// specific lecture — so holding them from an earlier open would mean showing
// ticks that belong to a different item.
export const fetchPlaylists = createAsyncThunk(
  "saves/fetchPlaylists",
  // An object rather than a bare mediaId, because there are now two callers
  // asking two different questions of the same endpoint: the save menu wants the
  // names and which of them hold one lecture, the saved page wants the names and
  // what is inside each.
  async (options = {}, { rejectWithValue }) => {
    try {
      return await savesApi.listPlaylists(options);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to fetch lists"));
    }
  }
);

// One list and what is in it, for the page that opens a single list. Kept apart
// from `playlists` in the store: those rows describe the lists themselves and
// are what the save menu ticks, while this is a screenful of media rows that
// happens to be reachable directly by URL.
export const fetchPlaylist = createAsyncThunk(
  "saves/fetchPlaylist",
  async (playlistId, { rejectWithValue }) => {
    try {
      return await savesApi.getPlaylist(playlistId);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to fetch list"));
    }
  }
);
