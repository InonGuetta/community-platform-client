import axiosInstance from "../utilities/axiosInstance";

export const adminApi = {
  stats: async () => (await axiosInstance.get("/admin/stats")).data,
  queueStatus: async () => (await axiosInstance.get("/admin/queue-status")).data,
  systemHealth: async () => (await axiosInstance.get("/admin/system-health")).data,

  // The dashboard refreshes all three together every 30s and renders them as one
  // view, so a partial result is not useful — Promise.all is the right shape and
  // belongs here rather than repeated at the call site.
  overview: async () => {
    const [stats, queueStatus, health] = await Promise.all([
      adminApi.stats(),
      adminApi.queueStatus(),
      adminApi.systemHealth(),
    ]);
    return { stats, queueStatus, health };
  },
};
