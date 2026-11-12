import { createApiThunk } from "../../createApiThunk";
import { bookmarksApi } from "../../../api/bookmarksApi";

export const createBookmark = createApiThunk("bookmarks/create", "Failed to create bookmark", async (payload) => {
  return await bookmarksApi.create(payload);
});
