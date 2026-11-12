import { createApiThunk } from "../../createApiThunk";
import { notificationsApi } from "../../../api/notificationsApi";

// Polled by the navbar. Silent on failure — it is not in the toast middleware's
// list, deliberately: a dropped connection would otherwise say so once a minute
// about a bell nobody asked to look at.
export const fetchInbox = createApiThunk("inbox/fetch", "Failed to fetch notifications", async () => {
  return await notificationsApi.list();
});
