import { createApiThunk } from "../../createApiThunk";
import { mediaApi } from "../../../api/mediaApi";

export const deleteMedia = createApiThunk("media/delete", "Delete failed", async (id) => {
  await mediaApi.remove(id);
  return { id };
});
