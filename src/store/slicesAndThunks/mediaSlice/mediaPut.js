import { createApiThunk } from "../../createApiThunk";
import { mediaApi } from "../../../api/mediaApi";

export const updateMedia = createApiThunk("media/update", "Update failed", async ({ id, ...payload }) => {
  return await mediaApi.update(id, payload);
});
