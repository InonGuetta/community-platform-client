// The ui slice: which dialogs are open, and how far the upload has got.
export const selectUiState = (state) => state.ui;
export const selectUploadProgress = (state) => state.ui.uploadProgress;
