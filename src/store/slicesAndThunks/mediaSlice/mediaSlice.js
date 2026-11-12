import { createSlice } from "@reduxjs/toolkit";
import { fetchAllMedia, fetchMoreMedia, fetchOneMedia, fetchContinueWatching } from "./mediaGet";
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
  // The archive is paged (PRD ARCH-1). `items` is every page loaded so far,
  // `nextCursor` asks for the next one (null at the end), `total` is how many
  // rows the filter matches in all, from the first page. `filters` is the
  // filter those pages belong to, and `listRequestId` the request that started
  // them: an answer for any other request — an older filter that was still in
  // flight when the reader typed — is dropped, so a slow response can never put
  // the wrong list on screen or append to the right one.
  initialState: {
    items: [],
    nextCursor: null,
    total: null,
    filters: {},
    listRequestId: null,
    loadingMore: false,
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
      .addCase(fetchAllMedia.pending, (state, action) => {
        state.status = statuses.loading;
        state.listRequestId = action.meta.requestId;
        state.filters = action.meta.arg ?? {};
        state.loadingMore = false;
      })
      .addCase(fetchAllMedia.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.listRequestId) return;
        state.status = statuses.succeeded;
        state.items = action.payload.items ?? [];
        state.nextCursor = action.payload.nextCursor ?? null;
        state.total = action.payload.total ?? state.items.length;
      })
      .addCase(fetchAllMedia.rejected, (state, action) => {
        if (action.meta.requestId !== state.listRequestId) return;
        state.status = statuses.failed;
        state.error = action.payload?.message;
      })

      .addCase(fetchMoreMedia.pending, (state) => { state.loadingMore = true; })
      .addCase(fetchMoreMedia.fulfilled, (state, action) => {
        state.loadingMore = false;
        if (action.payload.listRequestId !== state.listRequestId) return;
        // Offset paging can repeat a card when something is uploaded mid-scroll
        // (see getMediaPage on the server); the second copy is dropped.
        const seen = new Set(state.items.map((item) => item.id));
        state.items.push(...(action.payload.items ?? []).filter((item) => !seen.has(item.id)));
        state.nextCursor = action.payload.nextCursor ?? null;
      })
      .addCase(fetchMoreMedia.rejected, (state, action) => {
        state.loadingMore = false;
        state.error = action.payload?.message;
      })

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
      .addCase(uploadMedia.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        state.items.unshift(action.payload);
        if (state.total !== null) state.total += 1;
      })
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
        const before = state.items.length;
        state.items = state.items.filter((i) => i.id !== action.payload.id);
        if (state.total !== null && state.items.length < before) state.total = Math.max(0, state.total - 1);
        state.continueWatching.items = state.continueWatching.items.filter((i) => i.id !== action.payload.id);
        if (state.selectedItem?.id === action.payload.id) state.selectedItem = null;
      })
      .addCase(deleteMedia.rejected, (state, action) => { state.error = action.payload?.message; });
  },
});

export const { clearSelectedItem, clearError } = mediaSlice.actions;
export default mediaSlice.reducer;
