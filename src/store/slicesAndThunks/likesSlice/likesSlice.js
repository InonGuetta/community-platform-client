import { createSlice } from "@reduxjs/toolkit";
import { fetchLikedMedia, fetchLikedIds } from "./likesGet";
import { likeMedia } from "./likesPost";
import { unlikeMedia } from "./likesDelete";
import { statuses } from "../../../utilities/constant";

// `ids` is the source of truth for "is this liked" and `items` for the likes
// page's cards. They are kept as two fields rather than deriving one from the
// other because they are loaded by different screens: the media page never
// fetches the full rows, so deriving ids from items would leave the button dark
// on a lecture the user has in fact liked.
const likesSlice = createSlice({
  name: "likes",
  initialState: { items: [], ids: [], status: statuses.idle, error: null },
  reducers: {
    clearLikes(state) { state.items = []; state.ids = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLikedMedia.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchLikedMedia.fulfilled, (state, action) => {
        state.status = statuses.succeeded;
        state.items = action.payload;
        // The full list is authoritative about ids too, so a page that loads it
        // does not also need the ids request.
        state.ids = action.payload.map((m) => m.id);
      })
      .addCase(fetchLikedMedia.rejected, (state, action) => {
        state.status = statuses.failed;
        state.error = action.payload;
      })

      .addCase(fetchLikedIds.fulfilled, (state, action) => { state.ids = action.payload; })

      // Optimistic: the button flips on press and the request follows. A like is
      // trivially reversible and the server call is idempotent, so waiting for a
      // round trip would only make the button feel broken on a slow connection.
      .addCase(likeMedia.pending, (state, action) => {
        if (!state.ids.includes(action.meta.arg)) state.ids.push(action.meta.arg);
      })
      .addCase(likeMedia.rejected, (state, action) => {
        state.ids = state.ids.filter((id) => id !== action.meta.arg);
      })

      .addCase(unlikeMedia.pending, (state, action) => {
        state.ids = state.ids.filter((id) => id !== action.meta.arg);
      })
      // The card is dropped only once the server confirms, unlike the button
      // state above. Removing it optimistically would mean having to put it back
      // on failure, and by then the row is gone from the store with nothing left
      // to restore it from.
      .addCase(unlikeMedia.fulfilled, (state, action) => {
        state.items = state.items.filter((m) => m.id !== action.payload.mediaId);
      })
      .addCase(unlikeMedia.rejected, (state, action) => {
        if (!state.ids.includes(action.meta.arg)) state.ids.push(action.meta.arg);
      });
  },
});

export const { clearLikes } = likesSlice.actions;
export default likesSlice.reducer;
