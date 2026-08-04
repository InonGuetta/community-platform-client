import axiosInstance from "../utilities/axiosInstance";

// Session endpoints. There is no token to pass: the server sets an httpOnly
// cookie that the browser attaches automatically (axiosInstance is created with
// withCredentials), which is also why "who am I" has to be a request rather
// than something read from storage.
export const authApi = {
  me: async () => (await axiosInstance.get("/auth/me")).data,

  login: async ({ email, password }) =>
    (await axiosInstance.post("/auth/login", { email, password })).data,

  register: async ({ email, password, displayName }) =>
    (await axiosInstance.post("/auth/register", { email, password, displayName })).data,

  // Returns nothing useful — the point is the cleared cookie.
  logout: async () => {
    await axiosInstance.post("/auth/logout");
  },

  // A full-page navigation, not a request: OAuth redirects the browser to
  // Google and back, so it cannot be an XHR. Absolute, since axiosInstance's
  // baseURL plays no part.
  googleLoginUrl: "/api/auth/google",
};
