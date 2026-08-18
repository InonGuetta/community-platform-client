import { createSlice } from "@reduxjs/toolkit";
import { fetchAllMedia, fetchOneMedia, fetchContinueWatching } from "./mediaGet";
import { uploadMedia } from "./mediaPost";
import { updateMedia } from "./mediaPut";
import { deleteMedia } from "./mediaDelete";
import { statuses } from "../../../utilities/constant";

const mediaSlice = createSlice({
  name: "media",
  // continueWatching is a nested { items, status } of its own, not a second array
  // alongside `items`. CollectionPage reads a shelf's slice expecting exactly
  // that shape, and keeping it nested means the shelf's loading spinner is not
  // driven by whatever the archive page happens to be fetching at the time.
  initialState: {
    items: [],
    selectedItem: null,
    status: statuses.idle,
    error: null,
    continueWatching: { items: [], status: statuses.idle },
  },
  reducers: {
    clearSelectedItem(state) { state.selectedItem = null; },
    clearError(state) { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchAllMedia.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items = action.payload; })
      .addCase(fetchAllMedia.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(fetchContinueWatching.pending, (state) => { state.continueWatching.status = statuses.loading; })
      .addCase(fetchContinueWatching.fulfilled, (state, action) => {
        state.continueWatching.status = statuses.succeeded;
        state.continueWatching.items = action.payload;
      })
      .addCase(fetchContinueWatching.rejected, (state, action) => {
        state.continueWatching.status = statuses.failed;
        state.error = action.payload?.message;
      })

      .addCase(fetchOneMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchOneMedia.fulfilled, (state, action) => { state.status = statuses.succeeded; state.selectedItem = action.payload; })
      .addCase(fetchOneMedia.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(uploadMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(uploadMedia.fulfilled, (state, action) => { state.status = statuses.succeeded; state.items.unshift(action.payload); })
      .addCase(uploadMedia.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(updateMedia.fulfilled, (state, action) => {
        const idx = state.items.findIndex((i) => i.id === action.payload.id);
        if (idx !== -1) state.items[idx] = action.payload;
        if (state.selectedItem?.id === action.payload.id) state.selectedItem = action.payload;
      })

      // One case, every list that holds the row. A deleted lecture left on the
      // continue-watching shelf would be a card that 404s when clicked — and a
      // second addCase for this same action is not an option, RTK refuses it.
      .addCase(deleteMedia.fulfilled, (state, action) => {
        state.items = state.items.filter((i) => i.id !== action.payload.id);
        state.continueWatching.items = state.continueWatching.items.filter((i) => i.id !== action.payload.id);
        if (state.selectedItem?.id === action.payload.id) state.selectedItem = null;
      })
      .addCase(deleteMedia.rejected, (state, action) => { state.error = action.payload?.message; });
  },
});

export const { clearSelectedItem, clearError } = mediaSlice.actions;
export default mediaSlice.reducer;
