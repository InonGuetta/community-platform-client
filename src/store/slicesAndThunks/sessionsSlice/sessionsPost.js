import { createApiThunk } from "../../createApiThunk";
import { sessionsApi } from "../../../api/sessionsApi";

export const createSession = createApiThunk("sessions/create", "Failed to create session", async (payload) => {
  return await sessionsApi.create(payload);
});

// Asking the server for a room token. Deliberately NOT stored in the slice: it
// is a credential with a lifetime of one room, and Redux state is inspectable,
// serialised into devtools and kept for the life of the tab. The room page holds
// it in component state and drops it on unmount.
export const joinSession = createApiThunk("sessions/join", "Could not join the session", async (id) => {
  return await sessionsApi.join(id);
});

export const startSession = createApiThunk("sessions/start", "Could not start the session", async (id) => {
  return await sessionsApi.start(id);
});
