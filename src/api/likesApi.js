import axiosInstance from "../utilities/axiosInstance";

export const likesApi = {
  // The full liked media rows, for the likes page's card grid.
  list: async () => (await axiosInstance.get("/likes")).data,

  // Just the ids, for anything that only needs to know whether a button is lit.
  listIds: async () => (await axiosInstance.get("/likes", { params: { ids: 1 } })).data,

  add: async (mediaId) => (await axiosInstance.post("/likes", { mediaId })).data,

  remove: async (mediaId) => (await axiosInstance.delete(`/likes/${mediaId}`)).data,
};
