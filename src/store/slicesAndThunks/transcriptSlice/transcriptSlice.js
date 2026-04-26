import { createSlice } from "@reduxjs/toolkit";
import { fetchTranscript, searchTranscripts } from "./transcriptGet";
import { updateTranscript } from "./transcriptPut";
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
        state.status = statuses.succeeded;
        state.byMediaId[action.payload.media_id] = action.payload;
      })
      .addCase(fetchTranscript.rejected, (state, action) => { state.status = statuses.failed; state.error = action.payload; })

      .addCase(searchTranscripts.fulfilled, (state, action) => { state.searchResults = action.payload; })

      .addCase(updateTranscript.fulfilled, (state, action) => {
        state.byMediaId[action.payload.media_id] = action.payload;
      });
  },
});

export const { clearSearchResults } = transcriptSlice.actions;
export default transcriptSlice.reducer;
