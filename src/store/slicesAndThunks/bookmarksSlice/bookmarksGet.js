import { createApiThunk } from "../../createApiThunk";
import { bookmarksApi } from "../../../api/bookmarksApi";

export const fetchBookmarks = createApiThunk("bookmarks/fetch", "Failed to fetch bookmarks", async (mediaId) => {
  return await bookmarksApi.list(mediaId);
});
