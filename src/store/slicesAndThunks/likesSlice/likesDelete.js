import { createApiThunk } from "../../createApiThunk";
import { likesApi } from "../../../api/likesApi";

export const unlikeMedia = createApiThunk("likes/remove", "Failed to unlike", async (mediaId) => {
  await likesApi.remove(mediaId);
  return { mediaId };
});
