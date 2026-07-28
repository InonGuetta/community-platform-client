import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

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
