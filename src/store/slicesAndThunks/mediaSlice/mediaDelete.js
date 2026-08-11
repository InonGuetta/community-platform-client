import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";
import { rejectionOf } from "../../../utilities/apiError";

export const deleteMedia = createAsyncThunk("media/delete", async (id, { rejectWithValue }) => {
  try {
    await mediaApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Delete failed"));
  }
});
