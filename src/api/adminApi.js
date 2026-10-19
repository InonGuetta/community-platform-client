import axiosInstance from "../utilities/axiosInstance";

export const adminApi = {
  stats: async () => (await axiosInstance.get("/admin/stats")).data,
  queueStatus: async () => (await axiosInstance.get("/admin/queue-status")).data,
  systemHealth: async () => (await axiosInstance.get("/admin/system-health")).data,

  // What failed and what never got queued — the detail behind the failed COUNT
  // the queue panel has always shown.
  pipelineTrouble: async () => (await axiosInstance.get("/admin/pipeline-trouble")).data,

  // Queues real transcription jobs, each of which is a Whisper bill — hence a
  // POST, and hence a confirmation in the UI before it is called.
  reconcile: async () => (await axiosInstance.post("/admin/reconcile")).data,

  donations: async (status) =>
    (await axiosInstance.get("/admin/donations", { params: status ? { status } : {} })).data,

  // New tags lecturers asked for. Approve may correct the name and the place:
  // pass `parentId` (null for a root) only to move it.
  tagProposals: async () => (await axiosInstance.get("/admin/tag-proposals")).data,
  approveTagProposal: async (id, changes = {}) =>
    (await axiosInstance.post(`/admin/tag-proposals/${id}/approve`, changes)).data,
  rejectTagProposal: async (id, reason) =>
    (await axiosInstance.post(`/admin/tag-proposals/${id}/reject`, { reason })).data,

  // The dashboard refreshes these together every 30s and renders them as one
  // view, so a partial result is not useful — Promise.all is the right shape and
  // belongs here rather than repeated at the call site.
  overview: async () => {
    const [stats, queueStatus, health, trouble, donations] = await Promise.all([
      adminApi.stats(),
      adminApi.queueStatus(),
      adminApi.systemHealth(),
      adminApi.pipelineTrouble(),
      adminApi.donations(),
    ]);
    return { stats, queueStatus, health, trouble, donations };
  },
};
