import { createAsyncThunk } from "@reduxjs/toolkit";
import { savesApi } from "../../../api/savesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const saveMedia = createAsyncThunk("saves/add", async (mediaId, { rejectWithValue }) => {
  try {
    await savesApi.add(mediaId);
    return { mediaId };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to save"));
  }
});

// Takes `{ title, mediaId }` rather than a bare title: a list made from the save
// menu is made in order to hold the lecture in front of the user, and the server
// does both in one transaction. As two requests, a failure of the second left an
// empty list behind that nobody had asked for.
export const createPlaylist = createAsyncThunk(
  "saves/createPlaylist",
  async ({ title, mediaId }, { rejectWithValue }) => {
    try {
      return await savesApi.createPlaylist(title, mediaId);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to create list"));
    }
  }
);

// The server saves the item generally as well as filing it (see the service's
// addToPlaylist), so `mediaId` comes back in the payload for the reducer to add
// to `ids` — otherwise the button would stay dark on a lecture that is now
// sitting in one of the user's lists.
export const addMediaToPlaylist = createAsyncThunk(
  "saves/addItem",
  async ({ playlistId, mediaId }, { rejectWithValue }) => {
    try {
      await savesApi.addToPlaylist(playlistId, mediaId);
      return { playlistId, mediaId };
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to add to list"));
    }
  }
);
