import { createApiThunk } from "../../createApiThunk";
import { savesApi } from "../../../api/savesApi";

export const saveMedia = createApiThunk("saves/add", "Failed to save", async (mediaId) => {
  await savesApi.add(mediaId);
  return { mediaId };
});

// Takes `{ title, mediaId }` rather than a bare title: a list made from the save
// menu is made in order to hold the lecture in front of the user, and the server
// does both in one transaction. As two requests, a failure of the second left an
// empty list behind that nobody had asked for.
export const createPlaylist = createApiThunk(
  "saves/createPlaylist", "Failed to create list",
  async ({ title, mediaId }) => {
    return await savesApi.createPlaylist(title, mediaId);
  }
);

// The server saves the item generally as well as filing it (see the service's
// addToPlaylist), so `mediaId` comes back in the payload for the reducer to add
// to `ids` — otherwise the button would stay dark on a lecture that is now
// sitting in one of the user's lists.
export const addMediaToPlaylist = createApiThunk(
  "saves/addItem", "Failed to add to list",
  async ({ playlistId, mediaId }) => {
    await savesApi.addToPlaylist(playlistId, mediaId);
    return { playlistId, mediaId };
  }
);
