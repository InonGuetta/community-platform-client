import { createApiThunk } from "../../createApiThunk";
import { sessionsApi } from "../../../api/sessionsApi";

export const fetchActiveSessions = createApiThunk("sessions/fetchActive", "Failed to fetch sessions", async () => {
  return await sessionsApi.listActive();
});

export const fetchUpcomingSessions = createApiThunk("sessions/fetchUpcoming", "Failed to fetch upcoming sessions", async () => {
  return await sessionsApi.listUpcoming();
});

export const fetchSessionById = createApiThunk("sessions/fetchById", "Failed to fetch session", async (id) => {
  return await sessionsApi.getOne(id);
});
