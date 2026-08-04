import { createAsyncThunk } from "@reduxjs/toolkit";
import { usersApi } from "../../../api/usersApi";

export const fetchAllUsers = createAsyncThunk("users/fetchAll", async (_, { rejectWithValue }) => {
  try {
    return await usersApi.getAll();
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch users");
  }
});

export const fetchUserById = createAsyncThunk("users/fetchById", async (id, { rejectWithValue }) => {
  try {
    return await usersApi.getOne(id);
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch user");
  }
});
