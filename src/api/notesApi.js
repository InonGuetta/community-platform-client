import axiosInstance from "../utilities/axiosInstance";

export const notesApi = {
  list: async () => (await axiosInstance.get("/notes")).data,

  create: async (payload) => (await axiosInstance.post("/notes", payload)).data,

  update: async (id, { title, body }) =>
    (await axiosInstance.put(`/notes/${id}`, { title, body })).data,

  remove: async (id) => {
    await axiosInstance.delete(`/notes/${id}`);
  },
};
