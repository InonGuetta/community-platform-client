import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchConversation, searchInLesson, fetchHistory, openHistoryConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionGet";
import { startConversation, askQuestion, resumeConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionPost";
import { clearSearch, clearAskError, closeHistoryConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionSlice";
import { selectDiscussionByMediaId } from "../../../store/selectors/discussionSelectors";
import { statuses } from "../../../utilities/constant";

// The "דיון עם AI" tab's logic: every dispatch and selector it needs, so the
// panel and its two panes stay presentation only.

// The two things the tab does, and the switch between them.
export const DISCUSSION_MODES = { search: "search", chat: "chat", history: "history" };

// Whether the lesson has text to discuss yet, from the transcript the page
// already polls — no request of its own.
//
// Chunks are the test, not status === "done". The chat and the search both
// read transcript_chunks, and a recording has its chunks while the summary is
// still being written (status "analyzing"); waiting for "done" would hide a
// working tab for the minutes the summary takes. Conversely a lesson can be
// "done" with no chunks at all — that is "nothing to discuss", not "wait".
//
//   ready        there is text to search and to answer from
//   processing   the pipeline is still producing it — come back shortly
//   error        the pipeline failed; nothing the student can do here
//   empty        no text and nothing running — never processed
//   unavailable  the transcript itself did not load
//
// `unavailable` is its own state because a missing transcript is not "this
// lesson has no text". Every upload creates its transcript row at once, so a
// null here means the request failed — seen in the browser on an 816-chunk
// book whose transcript read hit a database hiccup and answered 503, and the
// tab told the reader the book had no text.
export const discussionReadiness = (transcript) => {
  if (!transcript) return "unavailable";
  if ((transcript.chunks?.length ?? 0) > 0) return "ready";
  const status = transcript.status;
  if (status === "error") return "error";
  if (["pending", "processing", "analyzing"].includes(status)) return "processing";
  return "empty";
};

const useAIDiscussionController = ({ mediaId, transcript }) => {
  const dispatch = useDispatch();
  const selectLesson = useMemo(() => selectDiscussionByMediaId(mediaId), [mediaId]);
  const lesson = useSelector(selectLesson);

  const [mode, setMode] = useState(DISCUSSION_MODES.chat);
  const readiness = discussionReadiness(transcript);
  const ready = readiness === "ready";

  // The conversation is loaded the first time the chat is actually shown for
  // this lesson — not on page load. Most visits never open this tab, and each
  // one would otherwise cost a request for nothing.
  useEffect(() => {
    if (!mediaId || !ready || mode !== DISCUSSION_MODES.chat) return;
    if (lesson.loadStatus !== statuses.idle) return;
    dispatch(fetchConversation(mediaId));
  }, [dispatch, mediaId, ready, mode, lesson.loadStatus]);

  // The history is fetched when it is shown, and again after anything that
  // changed it (the slice sets its status back to idle).
  useEffect(() => {
    if (!mediaId || !ready || mode !== DISCUSSION_MODES.history) return;
    if (lesson.history.status !== statuses.idle) return;
    dispatch(fetchHistory(mediaId));
  }, [dispatch, mediaId, ready, mode, lesson.history.status]);

  const openConversation = useCallback(
    (conversationId) => dispatch(openHistoryConversation({ mediaId, conversationId })),
    [dispatch, mediaId]
  );
  const closeConversation = useCallback(() => dispatch(closeHistoryConversation(mediaId)), [dispatch, mediaId]);
  const retryHistory = useCallback(() => dispatch(fetchHistory(mediaId)), [dispatch, mediaId]);

  // Back to the chat with this conversation as the current one. If it already
  // IS the current one, there is nothing to resume — just go back to it.
  const continueConversation = useCallback(async (conversationId) => {
    if (conversationId !== lesson.conversation?.id) {
      const action = await dispatch(resumeConversation({ mediaId, conversationId }));
      if (!resumeConversation.fulfilled.match(action)) return false;
    } else {
      dispatch(closeHistoryConversation(mediaId));
    }
    setMode(DISCUSSION_MODES.chat);
    return true;
  }, [dispatch, mediaId, lesson.conversation?.id]);

  const runSearch = useCallback((text) => {
    const query = String(text ?? "").trim();
    if (!query) return;
    dispatch(searchInLesson({ mediaId, query }));
  }, [dispatch, mediaId]);

  const resetSearch = useCallback(() => dispatch(clearSearch(mediaId)), [dispatch, mediaId]);

  // Resolves to whether an answer came back. The composer empties itself the
  // moment a question is sent and puts it back on `false` — the server stores
  // nothing for a failed answer, so the retry must not mean retyping it.
  const ask = useCallback(async (text) => {
    const question = String(text ?? "").trim();
    if (!question || lesson.asking) return false;
    const action = await dispatch(askQuestion({ mediaId, question }));
    return askQuestion.fulfilled.match(action);
  }, [dispatch, mediaId, lesson.asking]);

  const startNew = useCallback(() => dispatch(startConversation(mediaId)), [dispatch, mediaId]);
  const dismissAskError = useCallback(() => dispatch(clearAskError(mediaId)), [dispatch, mediaId]);
  const retryLoad = useCallback(() => dispatch(fetchConversation(mediaId)), [dispatch, mediaId]);

  return {
    mode,
    setMode,
    readiness,
    search: {
      ...lesson.search,
      run: runSearch,
      reset: resetSearch,
    },
    history: {
      ...lesson.history,
      viewing: lesson.viewing,
      currentId: lesson.conversation?.id ?? null,
      open: openConversation,
      close: closeConversation,
      continueConversation,
      retry: retryHistory,
    },
    chat: {
      conversation: lesson.conversation,
      messages: lesson.messages,
      loadStatus: lesson.loadStatus,
      loadError: lesson.loadError,
      asking: lesson.asking,
      askStage: lesson.askStage,
      askError: lesson.askError,
      ask,
      startNew,
      dismissAskError,
      retryLoad,
    },
  };
};

export default useAIDiscussionController;
