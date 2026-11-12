import { createApiThunk } from "../../createApiThunk";
import { savesApi } from "../../../api/savesApi";

// Renaming a list. Not optimistic, unlike the membership toggles: the server can
// refuse the new name — UNIQUE(user_id, title) — and a title that appeared,
// stayed for a moment and then snapped back to the old one would look like the
// edit had been lost rather than rejected. The 409 arrives as a toast the user
// can act on (see ERROR_CODES.PLAYLIST_TITLE_TAKEN), and the row is only redrawn
// once the rename actually happened.
export const renamePlaylist = createApiThunk(
  "saves/renamePlaylist", "Failed to rename list",
  async ({ playlistId, title }) => {
    return await savesApi.renamePlaylist(playlistId, title);
  }
);
