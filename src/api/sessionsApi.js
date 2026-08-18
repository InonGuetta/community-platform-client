import axiosInstance from "../utilities/axiosInstance";

// Only the REST half of live sessions. Everything that happens once a room is
// open — joining, signalling, ending — travels over the socket instead, and is
// named in utilities/socketEvents.js.
export const sessionsApi = {
  listActive: async () => (await axiosInstance.get("/sessions/active")).data,

  // Scheduled and not yet opened. A separate call rather than a flag on the one
  // above, because the two lists are ordered oppositely and shown in different
  // places — soonest-first for what is coming, newest-first for what is running.
  listUpcoming: async () => (await axiosInstance.get("/sessions/upcoming")).data,

  getOne: async (id) => (await axiosInstance.get(`/sessions/${id}`)).data,

  create: async (payload) => (await axiosInstance.post("/sessions/create", payload)).data,

  // The only call that returns a room token, and the server decides whether this
  // caller gets one. Everything else about a session comes back with the token
  // stripped, so the client cannot hold, log or leak a credential for a room it
  // is not in — see publicSession on the server.
  //
  // POST because it is the act of entering, not a description of anything: a URL
  // that hands out a live credential ends up in a history and a proxy log.
  join: async (id) => (await axiosInstance.post(`/sessions/${id}/join`)).data,

  // Opening a scheduled room. Host-only; the server enforces it in the WHERE
  // clause of the update.
  start: async (id) => (await axiosInstance.post(`/sessions/${id}/start`)).data,
};
