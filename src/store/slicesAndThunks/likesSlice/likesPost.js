import { createApiThunk } from "../../createApiThunk";
import { likesApi } from "../../../api/likesApi";

export const likeMedia = createApiThunk("likes/add", "Failed to like", async (mediaId) => {
  await likesApi.add(mediaId);
  return { mediaId };
});
