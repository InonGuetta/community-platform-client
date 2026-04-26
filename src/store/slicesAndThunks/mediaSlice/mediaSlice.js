import { createSlice } from "@reduxjs/toolkit";
import { fetchAllMedia, fetchOneMedia } from "./mediaGet";
import { uploadMedia } from "./mediaPost";
import { updateMedia } from "./mediaPut";
import { deleteMedia } from "./mediaDelete";
import { statuses } from "../../../utilities/constant";

const mediaSlice = createSlice({
  name: "media",
  initialState: { items: [], selectedItem: null, status: statuses.idle, error: null },
  reducers: {
    clearSelectedItem(state) { state.selectedItem = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchAllMedia.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items = action.payload; })
      .addCase(fetchAllMedia.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(fetchOneMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchOneMedia.fulfilled, (state, action) => { state.status = statuses.succeeded; state.selectedItem = action.payload; })
      .addCase(fetchOneMedia.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(uploadMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(uploadMedia.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items.unshift(action.payload); })
      .addCase(uploadMedia.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(updateMedia.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedItem?.id === action.payload.id) state.selectedItem = action.payload;
      })

      .addCase(deleteMedia.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload.id);
        if (state.selectedItem?.id === action.payload.id) state.selectedItem = null;
      });
  },
});

export const { clearSelectedItem, clearError } = mediaSlice.actions;
export default mediaSlice.reducer;
