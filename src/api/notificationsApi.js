import axiosInstance from "../utilities/axiosInstance";

// The bell (server: routes/routersNotifications.js). One GET answers the whole
// navbar — the latest notifications, the unread count, and for an admin the
// number of role requests waiting — because it is polled on every open tab.
export const notificationsApi = {
  list: async () => (await axiosInstance.get("/notifications")).data,

  markRead: async (id) => {
    await axiosInstance.post(`/notifications/${id}/read`);
  },

  markAllRead: async () => {
    await axiosInstance.post("/notifications/read-all");
  },

  // NOTIF-6. Which mail this user can get, and which of it is switched off —
  // and, per category, whether it also goes by SMS (`sms`: a boolean, or null
  // where no SMS goes; `phoneVerified`), migration 054.
  preferences: async () => (await axiosInstance.get("/notifications/preferences")).data,

  // One channel at a time: "email" or "sms".
  setPreference: async (category, channel, on) => {
    await axiosInstance.put("/notifications/preferences", { category, [channel]: on });
  },

  // From the link in a mail — no session needed; the token is the credential.
  // `all` turns off every category rather than the one the link names.
  unsubscribe: async (token, { all = false } = {}) =>
    (await axiosInstance.post("/notifications/unsubscribe", { token, all })).data,
};
