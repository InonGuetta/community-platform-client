import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isUploadOpen: false,
    isEditMediaOpen: false,
    isDeleteOpen: false,
    itemToDelete: null,
    deleteDialogType: null,
    isTranscriptEditorOpen: false,
    selectedMediaForTranscript: null,
    isSessionRoomOpen: false,
    activeSessionRoom: null,
  },
  reducers: {
    openUpload(state) { state.isUploadOpen = true; },
    closeUpload(state) { state.isUploadOpen = false; },

    openEditMedia(state) { state.isEditMediaOpen = true; },
    closeEditMedia(state) { state.isEditMediaOpen = false; },

    openDeleteDialog(state, action) {
      state.isDeleteOpen = true;
      state.itemToDelete = action.payload.item;
      state.deleteDialogType = action.payload.type;
    },
    closeDeleteDialog(state) {
      state.isDeleteOpen = false;
      state.itemToDelete = null;
      state.deleteDialogType = null;
    },

    openTranscriptEditor(state, action) {
      state.isTranscriptEditorOpen = true;
      state.selectedMediaForTranscript = action.payload;
    },
    closeTranscriptEditor(state) {
      state.isTranscriptEditorOpen = false;
      state.selectedMediaForTranscript = null;
    },

    openSessionRoom(state, action) {
      state.isSessionRoomOpen = true;
      state.activeSessionRoom = action.payload;
    },
    closeSessionRoom(state) {
      state.isSessionRoomOpen = false;
      state.activeSessionRoom = null;
    },
  },
});

export const {
  openUpload, closeUpload,
  openEditMedia, closeEditMedia,
  openDeleteDialog, closeDeleteDialog,
  openTranscriptEditor, closeTranscriptEditor,
  openSessionRoom, closeSessionRoom,
} = uiSlice.actions;

export default uiSlice.reducer;
