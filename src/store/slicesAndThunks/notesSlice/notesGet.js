import { createAsyncThunk } from "@reduxjs/toolkit";
import { notesApi } from "../../../api/notesApi";
import { rejectionOf } from "../../../utilities/apiError";

// The notebook's list — light: a preview per note, no bodies (PRD NOTE-17).
export const fetchNotes = createAsyncThunk("notes/fetch", async (_, { rejectWithValue }) => {
  try {
    return await notesApi.list();
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch notes"));
  }
});

// The bodies of these notes, merged into the list. Asks only for the ones not
// already loaded, so the card that scrolls back into view does not ask again.
export const fetchNoteBodies = createAsyncThunk("notes/fetchBodies", async (ids, { getState, rejectWithValue }) => {
  const loaded = new Set(getState().notes.items.filter((n) => typeof n.body === "string").map((n) => n.id));
  const missing = [...new Set(ids)].filter((id) => !loaded.has(id));
  if (missing.length === 0) return [];
  try {
    return await notesApi.byIds(missing);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch notes"));
  }
});

// One lesson's notes, whole — the lesson page's "הערות אישיות". Replaces the
// list: that page shows these and nothing else, and the notebook page fetches
// its own list on arrival.
export const fetchNotesAboutMedia = createAsyncThunk("notes/fetchAboutMedia", async (mediaId, { rejectWithValue }) => {
  try {
    return await notesApi.aboutMedia(mediaId);
  } catch (err) {
    return rejectWithValue(rejectionOf(err, "Failed to fetch notes"));
  }
});
