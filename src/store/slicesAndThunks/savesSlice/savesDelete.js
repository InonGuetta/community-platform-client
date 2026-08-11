import { createAsyncThunk } from "@reduxjs/toolkit";
import { savesApi } from "../../../api/savesApi";
import { rejectionOf } from "../../../utilities/apiError";

// Unsaving also clears the lecture out of the user's lists — the server does
// both in one transaction, and the reducer mirrors it so the menu does not go on
// showing a tick for a list the item has just left.
export const unsaveMedia = createAsyncThunk("saves/remove", async (mediaId, { rejectWithValue }) => {
  try {
    await savesApi.remove(mediaId);
    return { mediaId };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to unsave"));
  }
});

export const deletePlaylist = createAsyncThunk(
  "saves/deletePlaylist",
  async (playlistId, { rejectWithValue }) => {
    try {
      await savesApi.deletePlaylist(playlistId);
      return { playlistId };
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to delete list"));
    }
  }
);

// Taking a lecture out of one list leaves it saved: the user said where to file
// it, not whether to keep it.
export const removeMediaFromPlaylist = createAsyncThunk(
  "saves/removeItem",
  async ({ playlistId, mediaId }, { rejectWithValue }) => {
    try {
      await savesApi.removeFromPlaylist(playlistId, mediaId);
      return { playlistId, mediaId };
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to remove from list"));
    }
  }
);
