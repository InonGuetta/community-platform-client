import { createSlice } from "@reduxjs/toolkit";
import { fetchTranscript, searchTranscripts } from "./transcriptGet";
import { updateTranscript, fixHebrewTranscript, generateKeyPointHeadings } from "./transcriptPut";
import { statuses } from "../../../utilities/constant";

// Every one of these endpoints returns the transcript row via RETURNING *,
// which does NOT include the chunks — those are fetched separately and are what
// the chapter list and the editor's fallback text are built from. So the
// response has to be merged over what is already stored, never assigned over
// it. Two of the three reducers did this and the third did not, which is
// exactly the drift this helper exists to prevent.
//
// Merging is safe for deliberate clears: a key present in the payload wins even
// when its value is null. Only keys the response omits survive.
const mergeTranscript = (state, payload) => {
  const previous = state.byMediaId[payload.media_id] || {};
  state.byMediaId[payload.media_id] = { ...previous, ...payload };
};

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
        state.status = statuses.succeeded;
        state.byMediaId[action.payload.media_id] = action.payload;
      })
      .addCase(fetchTranscript.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload?.message; })

      .addCase(searchTranscripts.fulfilled, (state, action) => { state.searchResults = action.payload; })

      // Was an assignment, which dropped the chunks on every save.
      .addCase(updateTranscript.fulfilled, (state, action) => {
        mergeTranscript(state, action.payload);
      })
      .addCase(updateTranscript.rejected, (state, action) => {
        state.error = action.payload?.message;
      })

      .addCase(fixHebrewTranscript.fulfilled, (state, action) => {
        mergeTranscript(state, action.payload);
      })

      .addCase(generateKeyPointHeadings.fulfilled, (state, action) => {
        mergeTranscript(state, action.payload);
      })
      .addCase(generateKeyPointHeadings.rejected, (state, action) => {
        state.error = action.payload?.message;
      });
  },
});

export const { clearSearchResults } = transcriptSlice.actions;
export default transcriptSlice.reducer;
