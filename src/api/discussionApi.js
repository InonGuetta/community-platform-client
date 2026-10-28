import axiosInstance, { reportUnauthorized } from "../utilities/axiosInstance";
import { readEventStream } from "../utilities/eventStream";

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

  // History: the caller's earlier conversations on the lesson, newest first —
  // [{ id, created_at, updated_at, questions, first_question }].
  listConversations: async (mediaId) =>
    (await axiosInstance.get(`/discussion/${mediaId}/conversations`)).data,

  // One of them, to read. { conversation, messages }. The server looks the id
  // up together with the signed-in user, so only the caller's own is found.
  getConversationById: async (mediaId, conversationId) =>
    (await axiosInstance.get(`/discussion/${mediaId}/conversations/${conversationId}`)).data,

  // "המשך את השיחה הזו" — the next question goes into it. { conversation, messages }
  resumeConversation: async (mediaId, conversationId) =>
    (await axiosInstance.post(`/discussion/${mediaId}/conversations/${conversationId}/resume`)).data,

  // "שיחה חדשה". { conversation, messages: [] }
  startConversation: async (mediaId) =>
    (await axiosInstance.post(`/discussion/${mediaId}/conversation`)).data,

  // A question, answered as it is written. Resolves to
  // { conversation, messages: [question, answer] } — the stored exchange —
  // after calling onDelta(text) with each piece the server lets through, and
  // onStage(stage) as it moves from finding the passages to writing.
  //
  // fetch rather than axiosInstance: axios in a browser cannot read a body
  // while it is still arriving. What axiosInstance would have done for this
  // request is done here by hand — the same /api base, the session cookie, an
  // expired session reported to the same handler — and a refusal is thrown in
  // axios's error shape, so the thunk's rejectionOf reads it unchanged.
  askStream: async (mediaId, question, { onDelta, onStage, signal } = {}) => {
    const res = await fetch(`/api/discussion/${mediaId}/messages/stream`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ question }),
      signal,
    });
    if (!res.ok) {
      if (res.status === 401) reportUnauthorized();
      const data = await res.json().catch(() => ({}));
      throw { response: { status: res.status, data } };
    }
    return readEventStream(res.body, onDelta, onStage);
  },
};
