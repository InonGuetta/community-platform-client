import axiosInstance from "../utilities/axiosInstance";

export const notesApi = {
  // The notebook's list, LIGHT (PRD NOTE-17): each note with a `preview` and no
  // `body`. With `q`, only the notes whose title, whole text or lesson match.
  list: async ({ q } = {}) => (await axiosInstance.get("/notes", { params: q ? { q } : {} })).data,

  // Whole notes, body included — the cards on screen, or an export.
  byIds: async (ids) => (await axiosInstance.get("/notes", { params: { ids: ids.join(",") } })).data,

  // One lesson's notes, whole: attached to it, or quoting it with a source
  // chip. Decided on the server now — it used to need every body here.
  aboutMedia: async (mediaId) => (await axiosInstance.get("/notes", { params: { aboutMediaId: mediaId } })).data,

  create: async (payload) => (await axiosInstance.post("/notes", payload)).data,

  update: async (id, { title, body }) =>
    (await axiosInstance.put(`/notes/${id}`, { title, body })).data,

  // The whole notebook's order, front to back, rather than "move this one
  // there": the client is the side that knows the arrangement — it is rendering
  // it — and sending the list makes the request idempotent.
  reorder: async (ids) => (await axiosInstance.put("/notes/order", { ids })).data,

  remove: async (id) => {
    await axiosInstance.delete(`/notes/${id}`);
  },
};
