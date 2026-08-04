import axiosInstance from "../utilities/axiosInstance";

// The four POSTs here start server-side work rather than creating a resource:
// trigger queues the whole pipeline, the other two are on-demand LLM passes over
// a transcript that already exists. They answer immediately; the result arrives
// through the status field the client polls on.
export const transcriptsApi = {
  get: async (mediaId) => (await axiosInstance.get(`/transcripts/${mediaId}`)).data,

  // mode: "hybrid" (default) | "semantic" | "keyword" — fused on the server.
  search: async ({ q, mode = "hybrid" }) =>
    (await axiosInstance.get("/transcripts/search", { params: { q, mode } })).data,

  update: async (mediaId, payload) =>
    (await axiosInstance.put(`/transcripts/${mediaId}`, payload)).data,

  fixHebrew: async (mediaId) =>
    (await axiosInstance.post(`/transcripts/${mediaId}/fix-hebrew`)).data,

  keyPointHeadings: async (mediaId) =>
    (await axiosInstance.post(`/transcripts/${mediaId}/key-point-headings`)).data,

  trigger: async (mediaId) =>
    (await axiosInstance.post(`/transcripts/${mediaId}/trigger`)).data,
};
