import axiosInstance from "../utilities/axiosInstance";

// Only the REST half of live sessions. Everything that happens once a room is
// open — joining, signalling, ending — travels over the socket instead, and is
// named in utilities/socketEvents.js.
export const sessionsApi = {
  listActive: async () => (await axiosInstance.get("/sessions/active")).data,

  getOne: async (id) => (await axiosInstance.get(`/sessions/${id}`)).data,

  create: async (payload) => (await axiosInstance.post("/sessions/create", payload)).data,
};
