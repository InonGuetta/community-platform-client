import { createAsyncThunk } from "@reduxjs/toolkit";
import { mediaApi } from "../../../api/mediaApi";
import { rejectionOf } from "../../../utilities/apiError";

export const updateMedia = createAsyncThunk("media/update", async ({ id, ...payload }, { rejectWithValue }) => {
  try {
    return await mediaApi.update(id, payload);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Update failed"));
  }
});
