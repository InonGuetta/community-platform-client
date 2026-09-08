import axiosInstance from "../utilities/axiosInstance";

// Admin-only user management. Verb-in-path like media, except for GET /users/:id
// — which is the sort of drift that is only visible once the routes sit together.
export const usersApi = {
  getAll: async () => (await axiosInstance.get("/users/get-all-users")).data,

  getOne: async (id) => (await axiosInstance.get(`/users/${id}`)).data,

  create: async (payload) => (await axiosInstance.post("/users/create-user", payload)).data,

  update: async (id, payload) =>
    (await axiosInstance.put(`/users/update-user/${id}`, payload)).data,

  remove: async (id) => {
    await axiosInstance.delete(`/users/delete-user/${id}`);
  },

  // ── Role approval ─────────────────────────────────────────────────────────
  //
  // Admin-only, like everything else in this file — routersUsers guards the
  // whole router. "/pending" is a literal segment and is declared before "/:id"
  // on the server; reordering there makes this 400 rather than 404, which is the
  // confusing failure to remember if this ever stops working.
  pending: async () => (await axiosInstance.get("/users/pending")).data,

  approve: async (id) => (await axiosInstance.post(`/users/${id}/approve`)).data,

  // `reason` is optional and is what the refusal email quotes. Sent even when
  // empty so the body shape does not change between the two cases.
  reject: async (id, reason) =>
    (await axiosInstance.post(`/users/${id}/reject`, { reason: reason || null })).data,
};
