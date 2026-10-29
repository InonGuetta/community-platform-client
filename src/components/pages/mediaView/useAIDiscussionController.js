import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchConversation, searchInLesson, fetchHistory, openHistoryConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionGet";
import { startConversation, askQuestion, resumeConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionPost";
import { deleteConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionDelete";
import { clearSearch, clearAskError, closeHistoryConversation } from "../../../store/slicesAndThunks/discussionSlice/discussionSlice";
import { createNote } from "../../../store/slicesAndThunks/notesSlice/notesPost";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { selectDiscussionByMediaId, selectDiscussionQuota } from "../../../store/selectors/discussionSelectors";
import { statuses } from "../../../utilities/constant";
import { answerNote, questionBefore, conversationText } from "../../../utilities/discussionNote";

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

// What saving one answer to the notebook is at, by the answer's id.
export const SAVE_STATES = { saving: "saving", saved: "saved", failed: "failed" };

const useAIDiscussionController = ({ mediaId, transcript, media }) => {
  const dispatch = useDispatch();
  const selectLesson = useMemo(() => selectDiscussionByMediaId(mediaId), [mediaId]);
  const lesson = useSelector(selectLesson);
  const quota = useSelector(selectDiscussionQuota);

  // Answers saved to the notebook in this visit. Only to say so on the answer —
  // the note itself is in the notebook; a second visit offers saving again, and
  // a second save is a second note, which is what pressing it again means.
  const [savedAnswers, setSavedAnswers] = useState({});

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

  // Deleted from the history. Resolves to whether it was.
  const removeConversation = useCallback(async (conversationId) => {
    const action = await dispatch(deleteConversation({ mediaId, conversationId }));
    return deleteConversation.fulfilled.match(action);
  }, [dispatch, mediaId]);

  // One answer, saved as a note in this lesson's notebook (PRD ASK-4).
  // `messages` is the conversation it is in — the chat's, or one open in the
  // history — so the question it answers can be found before it.
  const saveAnswer = useCallback(async (messages, answerId) => {
    const answer = messages.find((m) => m.id === answerId);
    const question = questionBefore(messages, answerId);
    if (!answer || question === null) return false;
    setSavedAnswers((prev) => ({ ...prev, [answerId]: SAVE_STATES.saving }));
    const action = await dispatch(createNote(answerNote({
      question,
      answer: answer.content,
      citations: answer.citations,
      mediaId,
      mediaTitle: media?.title,
      mediaType: media?.media_type,
    })));
    const saved = createNote.fulfilled.match(action);
    setSavedAnswers((prev) => ({ ...prev, [answerId]: saved ? SAVE_STATES.saved : SAVE_STATES.failed }));
    // Said out loud as well as on the answer: the notebook is further down
    // the page, out of sight of the chat.
    if (saved) dispatch(notify({ message: "התשובה נשמרה במחברת של השיעור", severity: "success" }));
    return saved;
  }, [dispatch, mediaId, media?.title, media?.media_type]);

  // "העתק שיחה": the whole conversation on screen — the chat's, or one open
  // in the history — as plain text with its sources (conversationText).
  // navigator.clipboard is missing on an insecure origin and can be refused by
  // the browser; either way the reader is told rather than left guessing.
  const copyConversation = useCallback(async (messages) => {
    try {
      await navigator.clipboard.writeText(conversationText(messages, { mediaTitle: media?.title }));
      dispatch(notify({ message: "השיחה הועתקה", severity: "success" }));
      return true;
    } catch {
      dispatch(notify({ message: "לא ניתן להעתיק את השיחה בדפדפן הזה", severity: "warning" }));
      return false;
    }
  }, [dispatch, media?.title]);

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
      remove: removeConversation,
      copy: copyConversation,
      deletingId: lesson.deletingId,
      deleteError: lesson.deleteError,
    },
    notebook: { saved: savedAnswers, save: saveAnswer },
    chat: {
      conversation: lesson.conversation,
      messages: lesson.messages,
      loadStatus: lesson.loadStatus,
      loadError: lesson.loadError,
      asking: lesson.asking,
      askStage: lesson.askStage,
      askError: lesson.askError,
      quota,
      copy: copyConversation,
      ask,
      startNew,
      dismissAskError,
      retryLoad,
    },
  };
};

export default useAIDiscussionController;
