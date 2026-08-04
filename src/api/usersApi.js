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
};
