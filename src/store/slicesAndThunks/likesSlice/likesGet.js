import { createApiThunk } from "../../createApiThunk";
import { likesApi } from "../../../api/likesApi";

// The likes page's own data: full media rows to render as cards.
export const fetchLikedMedia = createApiThunk("likes/fetchMedia", "Failed to fetch liked media", async () => {
  return await likesApi.list();
});

// Only the ids, for screens that render a like button and need to know whether
// it is already on — the media page today, and the archive cards later.
export const fetchLikedIds = createApiThunk("likes/fetchIds", "Failed to fetch likes", async () => {
  return await likesApi.listIds();
});
