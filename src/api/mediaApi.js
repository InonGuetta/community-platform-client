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
  // One PAGE of the archive (PRD ARCH-1): { items, nextCursor, total? }.
  // `cursor` is whatever the previous page handed back — opaque, never built
  // here — and `total` comes with the first page only.
  getAll: async (filters = {}, { cursor } = {}) =>
    (await axiosInstance.get("/media/get-all", { params: { ...filters, ...(cursor && { cursor }) } })).data,

  getOne: async (id) => (await axiosInstance.get(`/media/${id}`)).data,

  // onUploadProgress is passed through rather than handled here: reporting
  // progress means dispatching, and this layer deliberately knows nothing about
  // Redux. The caller supplies the callback.
  upload: async (formData, onUploadProgress) =>
    (await axiosInstance.post("/media/upload", formData, { onUploadProgress })).data,

  // Every tag in use, with how many items carry it. One endpoint for two
  // consumers — the upload form's autocomplete and the archive's filter — so the
  // two cannot end up showing different vocabularies.
  tags: async () => (await axiosInstance.get("/media/tags")).data,

  // The creator list for the filter menu. Its own call because the listing is
  // filtered server-side now — deriving the menu from the rows on screen would
  // leave it holding only whatever was already chosen.
  creators: async () => (await axiosInstance.get("/media/creators")).data,

  // One lecturer's page (PRD ATTR-10): their totals and courses, counted over
  // what the caller may see. Encoded: names are Hebrew and may hold anything.
  creatorProfile: async (name) =>
    (await axiosInstance.get(`/media/creators/${encodeURIComponent(name)}`)).data,

  // What an item looks like it is about, from its title. Offered right after an
  // upload so the archive does not fill up with untagged items — which is how it
  // reached nineteen items and no tagged rows at all.
  tagSuggestions: async (id) => (await axiosInstance.get(`/media/${id}/tag-suggestions`)).data,

  // Tags the LLM proposed after reading the lesson's summary (PRD ARCH-4) —
  // proposals only, each { id, name, path, reason }, for whoever may tag it.
  // Every call answers with the proposals still open.
  aiTagSuggestions: async (id) => (await axiosInstance.get(`/media/${id}/ai-tag-suggestions`)).data,
  requestAiTagSuggestions: async (id) => (await axiosInstance.post(`/media/${id}/ai-tag-suggestions`)).data,
  approveAiTagSuggestions: async (id, tagIds) =>
    (await axiosInstance.post(`/media/${id}/ai-tag-suggestions/approve`, { tagIds })).data,
  // Some, or — with no list — all of them.
  dismissAiTagSuggestions: async (id, tagIds = null) =>
    (await axiosInstance.delete(`/media/${id}/ai-tag-suggestions`, tagIds ? { params: { tagId: tagIds } } : undefined)).data,

  // A tag that does not exist yet, proposed from an item's tagging dialog with
  // the place in the tree it belongs. A lecturer's waits for an admin and is
  // attached to the item on approval; an admin's is created and attached at once
  // (the answer then has status "approved" and the new tag_id).
  tagProposals: async (id) => (await axiosInstance.get(`/media/${id}/tag-proposals`)).data,
  proposeTag: async (id, { name, parentId }) =>
    (await axiosInstance.post(`/media/${id}/tag-proposals`, { name, parentId })).data,
  withdrawTagProposal: async (id, proposalId) =>
    (await axiosInstance.delete(`/media/${id}/tag-proposals/${proposalId}`)).data,

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

  // The bytes of a lesson, to keep on the device for listening with no network
  // (PRD MOB-2). An audio lesson is its own file; a video is saved as its audio
  // only — for listening that is all of it, at a fraction of the size.
  //
  // fetch rather than axios: this has to report progress as the bytes arrive and
  // be cancellable mid-file, and the retries in axiosInstance would replay a
  // half-finished download of a long lecture from the start. Same-origin, so the
  // session cookie goes with it like with every other media URL here.
  //
  // `onProgress(received, total)` — `total` is null for a video, whose audio is
  // transcoded while it is sent and has no length up front.
  fetchForListening: async (media, { onProgress, signal } = {}) => {
    const isVideo = media.media_type === "video";
    const url = isVideo ? mediaApi.downloadAudioUrl(media.id) : mediaApi.downloadUrl(media.id);
    const response = await fetch(url, { credentials: "same-origin", signal });
    if (!response.ok) {
      const err = new Error(`Download failed with status ${response.status}`);
      err.status = response.status;
      throw err;
    }
    const total = Number(response.headers.get("Content-Length")) || null;
    const type = response.headers.get("Content-Type") || (isVideo ? "audio/mpeg" : "");

    if (!response.body?.getReader) {
      const blob = await response.blob();
      onProgress?.(blob.size, total);
      return blob;
    }
    const reader = response.body.getReader();
    const parts = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parts.push(value);
      received += value.byteLength;
      onProgress?.(received, total);
    }
    return new Blob(parts, { type });
  },
};
