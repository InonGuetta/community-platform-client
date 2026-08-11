import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";
import { rejectionOf } from "../../../utilities/apiError";

export const fetchAllUsers = createAsyncThunk("users/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await usersApi.getAll();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch users"));
  }
});

export const fetchUserById = createAsyncThunk("users/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await usersApi.getOne(id);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch user"));
  }
});
