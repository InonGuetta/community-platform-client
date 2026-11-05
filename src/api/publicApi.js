import axiosInstance from "../utilities/axiosInstance";

// A lesson its manager made public (PRD COM-3b, COM-4): what a guest with the
// link may open, with no account. The server answers only while the lesson is
// public AND published; anything else is a 404.
const API_ROOT = "/api";

export const publicApi = {
  // { id, title, description, media_type, duration_seconds, creator_name,
  //   course_title, created_at, ai_summary, ai_key_points }
  getLesson: async (id) => (await axiosInstance.get(`/public/media/${id}`)).data,

  // Handed to the browser, like mediaApi.streamUrl: the player fetches it itself.
  streamUrl: (id) => `${API_ROOT}/public/media/${id}/stream`,

  // The link that is shared. Served by the API as a small page of Open Graph
  // tags — WhatsApp's preview reads those, and runs no JavaScript — which then
  // sends a person on to the guest page, /l/:id.
  shareUrl: (id, origin = typeof window !== "undefined" ? window.location.origin : "") =>
    `${origin}${API_ROOT}/public/share/${id}`,
};
