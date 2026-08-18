import axiosInstance from "../utilities/axiosInstance";

// Absolute paths, for the URLs the BROWSER fetches rather than axios: a
// <video src>, an <a download>, a ReactPlayer url. Those cannot go through
// axiosInstance — the browser issues them itself, which is the whole point for
// media (it is what makes Range requests and seeking work). They still need to
// be here: they are server routes, and a route rename has to be findable in one
// place whether or not axios is the one calling it.
//
// The "/api" prefix is explicit because axiosInstance's baseURL does not apply.
const API_ROOT = "/api";

// Note the verb-in-path routes (get-all, upload, update/:id, delete/:id). That
// is what the server exposes today; it is inconsistent with notes/bookmarks and
// is collected here so changing it later is a one-file job.
export const mediaApi = {
  getAll: async (filters = {}) =>
    (await axiosInstance.get("/media/get-all", { params: filters })).data,

  getOne: async (id) => (await axiosInstance.get(`/media/${id}`)).data,

  // onUploadProgress is passed through rather than handled here: reporting
  // progress means dispatching, and this layer deliberately knows nothing about
  // Redux. The caller supplies the callback.
  upload: async (formData, onUploadProgress) =>
    (await axiosInstance.post("/media/upload", formData, { onUploadProgress })).data,

  update: async (id, payload) =>
    (await axiosInstance.put(`/media/update/${id}`, payload)).data,

  remove: async (id) => {
    await axiosInstance.delete(`/media/delete/${id}`);
  },

  // The lectures this user has started and not finished, newest first. Built
  // from the same watch positions the player has been recording all along —
  // until now they were only ever read back one lecture at a time, to resume it.
  continueWatching: async () =>
    (await axiosInstance.get("/media/continue-watching")).data,

  // Playback position, per user per item. Both sides of the resume feature.
  getProgress: async (id) => (await axiosInstance.get(`/media/${id}/progress`)).data,

  saveProgress: async (id, positionSeconds) =>
    (await axiosInstance.post(`/media/${id}/progress`, { positionSeconds })).data,

  // ── URLs handed to the browser, not fetched here ──────────────────────────
  streamUrl: (id) => `${API_ROOT}/media/${id}/stream`,
  downloadUrl: (id) => `${API_ROOT}/media/${id}/download`,

  // Video only: the server strips the video track and returns an MP3. Nothing is
  // stored twice, so this is a transcode on request — the download starts as the
  // bytes are produced rather than after a wait.
  downloadAudioUrl: (id) => `${API_ROOT}/media/${id}/download/audio`,

  // The one case that streams through axios instead: a document is converted to
  // HTML server-side and rendered into an iframe from an object URL, so the
  // bytes have to arrive here rather than at an element. responseType "blob"
  // stops axios trying to parse them.
  fetchBlob: async (id) =>
    (await axiosInstance.get(`/media/${id}/stream`, { responseType: "blob" })).data,
};
