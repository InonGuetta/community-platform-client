import { createAsyncThunk } from "@reduxjs/toolkit";
import { createApiThunk } from "../../createApiThunk";
import { mediaApi } from "../../../api/mediaApi";
import { rejectionOf } from "../../../utilities/apiError";

// The archive's FIRST page for a filter — replaces whatever the archive held.
export const fetchAllMedia = createApiThunk("media/fetchAll", "Failed to fetch media", async (filters = {}) => {
  return await mediaApi.getAll(filters);
});

// The next page of the SAME filter, appended. The filter, the cursor and the id
// of the list they belong to are read from the slice at the moment of asking,
// so the request is always for the list on screen — and the answer carries
// that id back, so the reducer can drop it if the filter changed meanwhile.
export const fetchMoreMedia = createAsyncThunk("media/fetchMore", async (_, { getState, rejectWithValue }) => {
  const { filters, nextCursor, listRequestId } = getState().media;
  try {
    return { ...(await mediaApi.getAll(filters, { cursor: nextCursor })), listRequestId };
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch more media"));
  }
}, {
  // Nothing to ask for at the end of the list, or while a page is already
  // coming — a scroll event fires many times on the way to the bottom.
  condition: (_, { getState }) => {
    const { nextCursor, loadingMore } = getState().media;
    return Boolean(nextCursor) && !loadingMore;
  },
});

// Its own state in the slice rather than sharing `items` with the archive: both
// are lists of media rows, but the archive is loaded and reloaded by the archive
// page's own filters, and a shelf that borrowed that array would be emptied the
// first time the user searched.
export const fetchContinueWatching = createApiThunk("media/continueWatching", "Failed to fetch continue watching", async () => {
  return await mediaApi.continueWatching();
});

export const fetchOneMedia = createApiThunk("media/fetchOne", "Failed to fetch media item", async (id) => {
  return await mediaApi.getOne(id);
});
