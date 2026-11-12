import { createApiThunk } from "../../createApiThunk";
import { bookmarksApi } from "../../../api/bookmarksApi";

export const deleteBookmark = createApiThunk("bookmarks/delete", "Failed to delete bookmark", async (id) => {
  await bookmarksApi.remove(id);
  return { id };
});
