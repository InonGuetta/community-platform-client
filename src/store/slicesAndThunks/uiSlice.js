import { createSlice } from "@reduxjs/toolkit";

const uiSlice = createSlice({
  name: "ui",
  initialState: {
    isUploadOpen: false,
    // 0-100 while an upload is in flight. Lives here rather than in mediaSlice
    // because the upload thunk has to dispatch it: mediaSlice already imports
    // that thunk, so putting the action there would create an import cycle and
    // leave the thunk undefined when createSlice builds its reducers.
    uploadProgress: 0,
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
    openUpload(state) { state.isUploadOpen = true; state.uploadProgress = 0; },
    closeUpload(state) { state.isUploadOpen = false; state.uploadProgress = 0; },
    setUploadProgress(state, action) { state.uploadProgress = action.payload; },

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
  openUpload, closeUpload, setUploadProgress,
  openEditMedia, closeEditMedia,
  openDeleteDialog, closeDeleteDialog,
  openTranscriptEditor, closeTranscriptEditor,
  openSessionRoom, closeSessionRoom,
} = uiSlice.actions;

export default uiSlice.reducer;
