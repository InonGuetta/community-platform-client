import { createAsyncThunk } from "@reduxjs/toolkit";
import { coursesApi } from "../../../api/coursesApi";

export const updateCourse = createAsyncThunk(
  "courses/update",
  async ({ id, ...payload }, { rejectWithValue }) => {
    try {
      return await coursesApi.update(id, payload);
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Failed to update course");
    }
  }
);
