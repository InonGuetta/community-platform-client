import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";
import { rejectionOf } from "../../../utilities/apiError";

export const deleteUser = createAsyncThunk("users/delete", async (id, { rejectWithValue }) => {
  try {
    await usersApi.remove(id);
    return { id };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to delete user"));
  }
});
