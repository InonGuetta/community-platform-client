import { createApiThunk } from "../../createApiThunk";
import { notificationsApi } from "../../../api/notificationsApi";

export const markNotificationRead = createApiThunk("inbox/markRead", "Failed to mark the notification read", async (id) => {
  await notificationsApi.markRead(id);
  return id;
});

export const markAllNotificationsRead = createApiThunk("inbox/markAllRead", "Failed to mark notifications read", async () => {
  await notificationsApi.markAllRead();
  return true;
});
