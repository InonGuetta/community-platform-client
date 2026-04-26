import { createAsyncThunk } from "@reduxjs/toolkit";
import axiosInstance from "../../../utilities/axiosInstance";

export const fetchAllMedia = createAsyncThunk("media/fetchAll", async (filters = {}, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get("/media/get-all", { params: filters });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch media");
  }
});

export const fetchOneMedia = createAsyncThunk("media/fetchOne", async (id, { rejectWithValue }) => {
  try {
    const { data } = await axiosInstance.get(`/media/${id}`);
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to fetch media item");
  }
});
