import { createSlice } from "@reduxjs/toolkit";
import { fetchTranscript, searchTranscripts } from "./transcriptGet";
import { updateTranscript, fixHebrewTranscript, generateKeyPointHeadings } from "./transcriptPut";
import { statuses } from "../../../utilities/constant";

const transcriptSlice = createSlice({
  name: "transcript",
  initialState: { byMediaId: {}, searchResults: [], status: statuses.idle, error: null },
  reducers: {
    clearSearchResults(state) { state.searchResults = []; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTranscript.pending, (state) => { state.status = statuses.loading; })
      .addCase(fetchTranscript.fulfilled, (state, action) => {
        console.log(`[FE:slice] fetchTranscript.fulfilled → store mediaId=${action.payload.media_id} status=${action.payload.status}`);
        state.status = statuses.succeeded;
        state.byMediaId[action.payload.media_id] = action.payload;
      })
      .addCase(fetchTranscript.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(searchTranscripts.fulfilled, (state, action) => { state.searchResults = action.payload; })

      .addCase(updateTranscript.fulfilled, (state, action) => {
        console.log(`[FE:slice] updateTranscript.fulfilled → store mediaId=${action.payload.media_id}`);
        state.byMediaId[action.payload.media_id] = action.payload;
      })
      .addCase(updateTranscript.rejected, (state, action) => {
        console.log(`[FE:slice] updateTranscript.rejected → ${action.payload}`);
        state.error = action.payload;
      })

      .addCase(fixHebrewTranscript.fulfilled, (state, action) => {
        console.log(`[FE:slice] fixHebrewTranscript.fulfilled → store mediaId=${action.payload.media_id}`);
        const prev = state.byMediaId[action.payload.media_id] || {};
        // Keep existing chunks (for navigation); only the edited_text changed.
        state.byMediaId[action.payload.media_id] = { ...prev, ...action.payload };
      })

      .addCase(generateKeyPointHeadings.fulfilled, (state, action) => {
        console.log(`[FE:slice] generateKeyPointHeadings.fulfilled → store mediaId=${action.payload.media_id}`);
        const prev = state.byMediaId[action.payload.media_id] || {};
        // RETURNING * gives the transcript row without chunks; merge so the
        // existing chunks (used for navigation) survive.
        state.byMediaId[action.payload.media_id] = { ...prev, ...action.payload };
      })
      .addCase(generateKeyPointHeadings.rejected, (state, action) => {
        console.log(`[FE:slice] generateKeyPointHeadings.rejected → ${action.payload}`);
        state.error = action.payload;
      });
  },
});

export const { clearSearchResults } = transcriptSlice.actions;
export default transcriptSlice.reducer;
