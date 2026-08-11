import axiosInstance from "../utilities/axiosInstance";

// Saving is a separate axis from liking — see the server's 016 migration for why
// they are not one table — so it gets its own client too rather than growing
// likesApi into "the endorsements API".
export const savesApi = {
  // The full saved media rows, for a screen that renders cards.
  list: async () => (await axiosInstance.get("/saves")).data,

  // Just the ids, for the save button's own state.
  listIds: async () => (await axiosInstance.get("/saves", { params: { ids: 1 } })).data,

  add: async (mediaId) => (await axiosInstance.post("/saves", { mediaId })).data,

  remove: async (mediaId) => (await axiosInstance.delete(`/saves/${mediaId}`)).data,

  // The user's own lists. `mediaId` asks the server to mark which of them
  // already hold that lecture — the save menu cannot draw a checkbox without
  // both halves, so they travel together rather than as two requests.
  listPlaylists: async (mediaId) =>
    (await axiosInstance.get("/saves/playlists", { params: mediaId ? { mediaId } : undefined })).data,

  // One list with the media rows inside it, for the page that opens it. The
  // title comes back too — that page is reachable by URL alone and has a heading
  // to draw before anything else has loaded.
  getPlaylist: async (playlistId) =>
    (await axiosInstance.get(`/saves/playlists/${playlistId}`)).data,

  // `mediaId` creates the list with that lecture already filed in it, in one
  // request — the server does both in a single transaction, so there is no
  // window where the list exists empty.
  createPlaylist: async (title, mediaId) =>
    (await axiosInstance.post("/saves/playlists", { title, mediaId })).data,

  // The title is the only editable thing about a list, so this is a PATCH of it
  // rather than a replacement of the list.
  renamePlaylist: async (playlistId, title) =>
    (await axiosInstance.patch(`/saves/playlists/${playlistId}`, { title })).data,

  deletePlaylist: async (playlistId) =>
    (await axiosInstance.delete(`/saves/playlists/${playlistId}`)).data,

  addToPlaylist: async (playlistId, mediaId) =>
    (await axiosInstance.post(`/saves/playlists/${playlistId}/items`, { mediaId })).data,

  removeFromPlaylist: async (playlistId, mediaId) =>
    (await axiosInstance.delete(`/saves/playlists/${playlistId}/items/${mediaId}`)).data,
};
