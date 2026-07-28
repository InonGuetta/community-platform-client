import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";
import { setUploadProgress } from "../uiSlice";

// Progress is reported by dispatching, not by taking a callback in the thunk
// argument: the argument ends up in the action's meta, and a function there
// trips Redux's serializability check.
export const uploadMedia = createAsyncThunk("media/upload", async (formData, { dispatch, rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.post("/media/upload", formData, {
      onUploadProgress: (event) => {
        if (!event.total) return; // size unknown — leave the bar indeterminate
        dispatch(setUploadProgress(Math.round((event.loaded / event.total) * 100)));
      },
    });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Upload failed");
  }
});
