import { createApiThunk } from "../../createApiThunk";
import { savesApi } from "../../../api/savesApi";

// Unsaving also clears the lecture out of the user's lists — the server does
// both in one transaction, and the reducer mirrors it so the menu does not go on
// showing a tick for a list the item has just left.
export const unsaveMedia = createApiThunk("saves/remove", "Failed to unsave", async (mediaId) => {
  await savesApi.remove(mediaId);
  return { mediaId };
});

export const deletePlaylist = createApiThunk(
  "saves/deletePlaylist", "Failed to delete list",
  async (playlistId) => {
    await savesApi.deletePlaylist(playlistId);
    return { playlistId };
  }
);

// Taking a lecture out of one list leaves it saved: the user said where to file
// it, not whether to keep it.
export const removeMediaFromPlaylist = createApiThunk(
  "saves/removeItem", "Failed to remove from list",
  async ({ playlistId, mediaId }) => {
    await savesApi.removeFromPlaylist(playlistId, mediaId);
    return { playlistId, mediaId };
  }
);
