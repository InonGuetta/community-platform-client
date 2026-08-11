import { createAsyncThunk } from "@reduxjs/toolkit";
import { coursesApi } from "../../../api/coursesApi";
import { rejectionOf } from "../../../utilities/apiError";

export const updateCourse = createAsyncThunk(
  "courses/update",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      return await coursesApi.update(id, payload);
    } catch (err) {
      return rejectWithValue(rejectionOf(err, "Failed to update course"));
    }
  }
);
