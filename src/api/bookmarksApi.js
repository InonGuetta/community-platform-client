import axiosInstance from "../utilities/axiosInstance";

export const bookmarksApi = {
  // No mediaId means "all of this user's bookmarks"; an empty params object is
  // what the caller passed before and the server treats the filter as optional.
  list: async (mediaId) =>
    (await axiosInstance.get("/bookmarks", { params: mediaId ? { mediaId } : {} })).data,

  create: async (payload) => (await axiosInstance.post("/bookmarks", payload)).data,

  // Only the note. A bookmark's ANCHOR is where the reader put it, and changing
  // it from a list — with the text nowhere in sight — would be editing a place
  // by describing it. Moving one means placing it again.
  update: async (id, note) => (await axiosInstance.put(`/bookmarks/${id}`, { note })).data,

  remove: async (id) => {
    await axiosInstance.delete(`/bookmarks/${id}`);
  },
};
