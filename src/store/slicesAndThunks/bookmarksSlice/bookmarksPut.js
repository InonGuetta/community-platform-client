import { createApiThunk } from "../../createApiThunk";
import { bookmarksApi } from "../../../api/bookmarksApi";

// Editing what a bookmark SAYS. Where it points is not editable — see
// bookmarksApi.update for why.
export const updateBookmark = createApiThunk(
  "bookmarks/update", "Failed to update bookmark",
  async ({ id, note }) => {
    return await bookmarksApi.update(id, note);
  }
);
