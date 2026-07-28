import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

// What to do when the server says we are no longer authenticated. Injected
// rather than imported: store.js already reaches this module through its
// slices, so importing the store — or even a single action creator from
// authSlice — back into here would close an import cycle and leave one side
// undefined while the other is still evaluating. A callback keeps this module a
// leaf of the import graph that knows nothing about Redux.
let onUnauthorized = null;
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

// A 401 from the auth endpoints is normal traffic, not an expired session:
// /auth/me is what an anonymous visitor gets on first load (fetchMe.rejected
// already handles that one), and /auth/login answers 401 for wrong credentials.
// Treating those as an expiry would fight the existing handling and would wipe
// state while the user is simply typing their password wrong.
const isAuthRequest = (url = "") => url.startsWith("/auth/");

// Normalize failures so every consumer can safely read error.response.data.message.
// The API always answers errors as JSON { message }, but two cases break that
// assumption and used to surface as a misleading generic error (e.g. "Login failed",
// which reads like wrong credentials):
//   1. No response at all — the backend is down, or the Vite dev-proxy could not
//      reach the API (ECONNREFUSED while the server boots or restarts under --watch).
//   2. A non-JSON body — the Vite proxy answers with a text/plain 500 when it can't
//      connect, so error.response.data is a string and data.message is undefined.
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      error.response = {
        data: {
          message:
            "Cannot reach the server. Make sure it is running, then try again.",
        },
      };
      return Promise.reject(error);
    }

    const { data, status } = error.response;

    // The httpOnly cookie lasts 7 days and expires without the client noticing.
    // Before this, every request afterwards failed while the UI still showed a
    // signed-in user, so the app looked broken rather than logged out. Clearing
    // auth state is all that is needed — ProtectedRoute already redirects to
    // /sign-in once there is no user, so there is no navigation to perform from
    // outside React.
    if (status === 401 && !isAuthRequest(error.config?.url)) {
      onUnauthorized?.();
    }

    if (typeof data !== "object" || data === null) {
      error.response.data = {
        message:
          status >= 500
            ? "The server is temporarily unavailable. Please try again in a moment."
            : "Unexpected server response. Please try again.",
      };
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
