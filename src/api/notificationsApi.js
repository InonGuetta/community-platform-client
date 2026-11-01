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
};
