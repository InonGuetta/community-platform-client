import { createSlice } from "@reduxjs/toolkit";

// What this device keeps for listening with no network (PRD MOB-2).
//
// `items` mirrors the list in utilities/offlineStore.js — every thunk answers
// with the whole list after its change, so the two cannot drift. `progress`
// holds the downloads running now, by lesson id: { received, total }, where
// total is null when the server did not say (a video's audio).
const offlineSlice = createSlice({
  name: "offline",
  initialState: { items: [], loaded: false, progress: {} },
  reducers: {
    offlineProgress(state, action) {
      const { id, received, total } = action.payload;
      const entry = state.progress[id];
      if (entry) Object.assign(entry, { received, total: total ?? null });
    },
  },
  extraReducers: (builder) => {
    // Matched by type string, not by importing the thunks: offlineGet.js imports
    // `offlineProgress` from this file, and importing it back would be the kind
    // of cycle imports.test.js exists to stop.
    builder
      .addMatcher(
        (action) => action.type === "offline/save/pending",
        (state, action) => {
          // The title too: the downloads page lists a running download before
          // there is any saved entry to take it from.
          const { id, title } = action.meta.arg;
          state.progress[id] = { received: 0, total: null, title: title || "שיעור" };
        }
      )
      .addMatcher(
        (action) => action.type === "offline/save/fulfilled" || action.type === "offline/save/rejected",
        (state, action) => {
          delete state.progress[action.meta.arg.id];
          if (action.type === "offline/save/fulfilled") state.items = action.payload;
        }
      )
      .addMatcher(
        (action) =>
          ["offline/load/fulfilled", "offline/claim/fulfilled", "offline/remove/fulfilled", "offline/clear/fulfilled"]
            .includes(action.type),
        (state, action) => {
          state.items = action.payload;
          state.loaded = true;
        }
      );
  },
});

export const { offlineProgress } = offlineSlice.actions;
export default offlineSlice.reducer;
