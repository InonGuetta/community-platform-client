import { createApiThunk } from "../../createApiThunk";
import { mediaApi } from "../../../api/mediaApi";
import { setUploadProgress } from "../uiSlice";

// Progress is reported by dispatching, not by taking a callback in the thunk
// argument: the argument ends up in the action's meta, and a function there
// trips Redux's serializability check. The API layer takes the callback and
// stays unaware of Redux.
export const uploadMedia = createApiThunk("media/upload", "Upload failed", async (formData, { dispatch }) => {
  return await mediaApi.upload(formData, (event) => {
    if (!event.total) return; // size unknown — leave the bar indeterminate
    dispatch(setUploadProgress(Math.round((event.loaded / event.total) * 100)));
  });
});
