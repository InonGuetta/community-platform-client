import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchConversation, searchInLesson } from "../../../store/slicesAndThunks/discussionSlice/discussionGet";
import { startConversation, askQuestion } from "../../../store/slicesAndThunks/discussionSlice/discussionPost";
import { clearSearch, clearAskError } from "../../../store/slicesAndThunks/discussionSlice/discussionSlice";
import { selectDiscussionByMediaId } from "../../../store/selectors/discussionSelectors";
import { statuses } from "../../../utilities/constant";

// The "דיון עם AI" tab's logic: every dispatch and selector it needs, so the
// panel and its two panes stay presentation only.

// The two things the tab does, and the switch between them.
export const DISCUSSION_MODES = { search: "search", chat: "chat" };

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
    chat: {
      conversation: lesson.conversation,
      messages: lesson.messages,
      loadStatus: lesson.loadStatus,
      loadError: lesson.loadError,
      asking: lesson.asking,
      askError: lesson.askError,
      ask,
      startNew,
      dismissAskError,
      retryLoad,
    },
  };
};

export default useAIDiscussionController;
