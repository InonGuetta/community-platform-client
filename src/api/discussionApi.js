import axiosInstance from "../utilities/axiosInstance";

// The "דיון עם AI" tab on a lesson page. Everything is scoped to ONE lesson by
// the id in the path; the server answers only from that lesson's text.
//
// There is no conversation id anywhere in here, deliberately: the server always
// uses the signed-in user's latest conversation on the lesson, so there is
// nothing for the client to pass that could point at someone else's.
export const discussionApi = {
  // Smart search inside the lesson — passages only, no generated answer.
  search: async (mediaId, q) =>
    (await axiosInstance.get(`/discussion/${mediaId}/search`, { params: { q } })).data,

  // { conversation | null, messages }
  getConversation: async (mediaId) =>
    (await axiosInstance.get(`/discussion/${mediaId}/conversation`)).data,

  // "שיחה חדשה". { conversation, messages: [] }
  startConversation: async (mediaId) =>
    (await axiosInstance.post(`/discussion/${mediaId}/conversation`)).data,

  // { conversation, messages: [question, answer] }
  ask: async (mediaId, question) =>
    (await axiosInstance.post(`/discussion/${mediaId}/messages`, { question })).data,
};
