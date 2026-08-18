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

  // ── Account recovery ──────────────────────────────────────────────────────
  //
  // The first of these answers the same way whether or not the address has an
  // account, so the caller must not branch on its result to tell the user
  // anything — see controllersAuth.forgotPassword.
  forgotPassword: async (email) =>
    (await axiosInstance.post("/auth/forgot-password", { email })).data,

  // Answers with the user: a successful reset opens a session, rather than
  // sending someone back to the login form to type the password they just chose.
  resetPassword: async ({ token, password }) =>
    (await axiosInstance.post("/auth/reset-password", { token, password })).data,

  verifyEmail: async (token) =>
    (await axiosInstance.post("/auth/verify-email", { token })).data,

  // ── The signed-in user's own account ──────────────────────────────────────
  updateProfile: async ({ displayName, avatarUrl }) =>
    (await axiosInstance.patch("/auth/me", { displayName, avatarUrl })).data,

  changePassword: async ({ currentPassword, newPassword }) =>
    (await axiosInstance.post("/auth/change-password", { currentPassword, newPassword })).data,

  // A full-page navigation, not a request: OAuth redirects the browser to
  // Google and back, so it cannot be an XHR. Absolute, since axiosInstance's
  // baseURL plays no part.
  googleLoginUrl: "/api/auth/google",
};
