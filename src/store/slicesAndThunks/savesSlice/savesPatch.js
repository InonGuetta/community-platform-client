import { createAsyncThunk } from "@reduxjs/toolkit";
import { savesApi } from "../../../api/savesApi";
import { rejectionOf } from "../../../utilities/apiError";

// Renaming a list. Not optimistic, unlike the membership toggles: the server can
// refuse the new name — UNIQUE(user_id, title) — and a title that appeared,
// stayed for a moment and then snapped back to the old one would look like the
// edit had been lost rather than rejected. The 409 arrives as a toast the user
// can act on (see ERROR_CODES.PLAYLIST_TITLE_TAKEN), and the row is only redrawn
// once the rename actually happened.
export const renamePlaylist = createAsyncThunk(
  "saves/renamePlaylist",
  async ({ playlistId, title }, { rejectWithValue }) => {
    try {
      return await savesApi.renamePlaylist(playlistId, title);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to rename list"));
    }
  }
);
