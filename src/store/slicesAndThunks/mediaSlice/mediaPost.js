import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";
import { setUploadProgress } from "../uiSlice";
import { rejectionOf } from "../../../utilities/apiError";

// Progress is reported by dispatching, not by taking a callback in the thunk
// argument: the argument ends up in the action's meta, and a function there
// trips Redux's serializability check. The API layer takes the callback and
// stays unaware of Redux.
export const uploadMedia = createAsyncThunk("media/upload", async (formData, { dispatch, rejectWithValue }) => {
  try {
    return await mediaApi.upload(formData, (event) => {
      if (!event.total) return; // size unknown — leave the bar indeterminate
      dispatch(setUploadProgress(Math.round((event.loaded / event.total) * 100)));
    });
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Upload failed"));
  }
});
