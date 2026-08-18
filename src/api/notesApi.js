import axiosInstance from "../utilities/axiosInstance";

export const notesApi = {
  list: async () => (await axiosInstance.get("/notes")).data,

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
