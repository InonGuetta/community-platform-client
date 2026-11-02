import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";
import {
  generateKeyPointHeadings,
  triggerTranscriptPipeline,
} from "../../../store/slicesAndThunks/transcriptSlice/transcriptPut";
import { selectTranscriptByMediaId } from "../../../store/selectors/transcriptSelectors";
import { selectUser } from "../../../store/selectors/authSelectors";
import { canManageMedia } from "../../../utilities/permissions";
import { mediaTypes } from "../../../utilities/constant";
import { nextPollDelay, hasExceededPollWindow } from "../../../utilities/pollingSchedule";
import { isAiActionBusy, aiActionOutcome, AI_ACTION_FIELDS } from "../../../utilities/aiActionState";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { hebrewForError } from "../../../utilities/apiError";

// Everything behind the summary / chapters / transcript panels: fetching the
// transcript, watching it while the workers run, the two on-demand AI actions,
// and who is allowed to trigger them.
//
// Lives apart from useMediaViewPageController because the media page is no
// longer the only place these panels appear — the notebook floats the same
// block under its source preview. The polling loop below is the reason this is
// a shared hook and not a copy: it carries a backoff, a ceiling and a
// visibility listener, none of which survive being duplicated by hand.
//
// Takes the media OBJECT as well as the id: the page reads it from the shared
// mediaSlice and the notebook dialog fetches its own, and the id alone cannot
// answer "is this a document" or "may this viewer edit it".

// 'analyzing' is included so polling continues through the AI step. Without it
// the page stopped watching the moment transcription finished, and the summary
// — written afterwards by the LLM worker — never appeared without a reload.
const IN_FLIGHT_STATUSES = new Set(["pending", "processing", "analyzing"]);

const useMediaInsights = (mediaId, media) => {
  const dispatch = useDispatch();

  // This is a selector FACTORY: calling it inline built a fresh createSelector
  // on every render, so its memoisation never applied. Memoising per id keeps
  // one instance alive, which then returns a stable reference while the
  // underlying value is unchanged.
  const selectTranscript = useMemo(() => selectTranscriptByMediaId(mediaId), [mediaId]);
  const transcript = useSelector(selectTranscript);

  // A book is loaded WITHOUT its chunks' text. A sefer's text is megabytes, and
  // reading it on every visit ran past the server's query timeout as a 503 —
  // so the summary and the discussion tab of the book never loaded. Nothing on
  // this page reads a book's chunk text: what it needs is that the chunks
  // exist, and their pages. The download menu fetches the text on its click.
  const bookPage = media?.media_type === mediaTypes.text;
  const transcriptRequest = useCallback(
    (id) => (bookPage ? { mediaId: id, content: false } : id),
    [bookPage]
  );

  // Text media is included now that books get summarised too. A document with
  // no summary yet simply has no transcripts row, so this 404s and the thunk
  // rejects — which is the correct "nothing here yet" and is already handled.
  //
  // The id check is what makes this safe on the media page, where `media` comes
  // from the shared slice and can still be the previously viewed item for a
  // render or two after the route changes.
  useEffect(() => {
    if (media?.id && String(media.id) === String(mediaId)) {
      dispatch(fetchTranscript(transcriptRequest(mediaId))).catch(() => {});
    }
  }, [dispatch, mediaId, media?.id, transcriptRequest]);

  // True once polling has given up — see pollingSchedule.js for why that can
  // happen while the row still says 'processing'.
  const [pollingStalled, setPollingStalled] = useState(false);
  // Bumping this restarts the poll after the user asks to check again.
  const [pollAttemptEpoch, setPollAttemptEpoch] = useState(0);

  const retryPolling = useCallback(() => setPollAttemptEpoch((n) => n + 1), []);

  useEffect(() => {
    setPollingStalled(false);
  }, [mediaId]);

  // While the workers are running, the transcript row sits in 'pending' or
  // 'processing'. Poll until it reaches 'done' / 'error', with the gap growing
  // so a long job is not hammered, and a hard ceiling so a wedged worker cannot
  // keep this running forever.
  //
  // A self-scheduling timeout rather than setInterval: the delay changes between
  // ticks, and this way a slow response can never overlap the next request.
  // Also while either AI action is queued or running (PRD PIPE-5): they are
  // done by the LLM worker now, and the row is how the page learns the result.
  const hebrewFixStatus = transcript?.[AI_ACTION_FIELDS.hebrewFix.status];
  const headingsStatus = transcript?.[AI_ACTION_FIELDS.headings.status];
  const aiBusy = isAiActionBusy(hebrewFixStatus) || isAiActionBusy(headingsStatus);

  useEffect(() => {
    if (!mediaId || !transcript || !(IN_FLIGHT_STATUSES.has(transcript.status) || aiBusy)) return;

    let timer = null;
    let attempt = 0;
    let cancelled = false;
    const startedAt = Date.now();

    const schedule = () => {
      if (cancelled) return;
      if (hasExceededPollWindow(startedAt)) {
        setPollingStalled(true);
        return;
      }
      // Nothing is watching a hidden tab, and browsers throttle these anyway.
      // Leaving `timer` null lets the visibility listener pick it back up.
      if (document.hidden) return;
      timer = setTimeout(tick, nextPollDelay(attempt++));
    };

    const tick = async () => {
      timer = null;
      if (cancelled) return;
      await dispatch(fetchTranscript(transcriptRequest(mediaId)));
      schedule();
    };

    // Coming back to the tab should show the current state immediately rather
    // than after another backed-off wait.
    const handleVisibilityChange = () => {
      if (cancelled || document.hidden || timer !== null) return;
      tick();
    };

    schedule();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // Depends on transcript?.status, deliberately NOT on transcript. Every poll
    // returns a new object, so depending on the whole thing would tear this
    // effect down and rebuild it on every response — resetting the backoff and
    // the ceiling clock each time, and defeating the point of both. Only a
    // change of status should restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, mediaId, transcript?.status, aiBusy, pollAttemptEpoch, transcriptRequest]);

  // An action finishing or failing is said out loud: it ran on the server for
  // minutes, and the reader may be looking at another tab of the page. Only a
  // CHANGE from busy is announced — a row first seen already finished (a visit
  // long after the run) is not news.
  const previousAi = useRef({ mediaId, hebrewFix: hebrewFixStatus, headings: headingsStatus });
  useEffect(() => {
    const before = previousAi.current;
    previousAi.current = { mediaId, hebrewFix: hebrewFixStatus, headings: headingsStatus };
    if (before.mediaId !== mediaId) return;
    const say = (outcome, done, failed, errorField) => {
      if (outcome === "done") dispatch(notify({ message: done, severity: "success" }));
      if (outcome === "error") {
        dispatch(notify({ message: hebrewForError({ code: transcript?.[errorField] }, failed), severity: "error" }));
      }
    };
    say(aiActionOutcome(before.hebrewFix, hebrewFixStatus), "העברית תוקנה", "תיקון העברית נכשל", AI_ACTION_FIELDS.hebrewFix.error);
    say(aiActionOutcome(before.headings, headingsStatus), "כותרות המשנה נוצרו", "יצירת כותרות המשנה נכשלה", AI_ACTION_FIELDS.headings.error);
    // The transcript is read for the error code only, at the moment a status
    // changes; depending on it would re-run this on every poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, mediaId, hebrewFixStatus, headingsStatus]);

  // ── The two on-demand AI actions ───────────────────────────────────────────

  // "Generating" is the ROW's word, not this page's: the work is on the server's
  // queue, so it is still generating after a reload, in another tab, or for a
  // second person looking at the same lesson. `requestingHeadings` covers only
  // the moment between the press and the server's 202.
  const [requestingHeadings, setRequestingHeadings] = useState(false);
  const generatingHeadings = requestingHeadings || isAiActionBusy(headingsStatus);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const generateHeadings = useCallback(async () => {
    if (!media?.id) return;
    setRequestingHeadings(true);
    await dispatch(generateKeyPointHeadings(media.id));
    setRequestingHeadings(false);
  }, [dispatch, media?.id]);

  // Books have no transcription step to piggyback on, so the summary needs its
  // own entry point. The refetch right after is what flips the polling loop on:
  // the trigger sets status='pending', and the page then watches until the
  // worker reaches 'done' or 'error'.
  const generateSummary = useCallback(async () => {
    if (!media?.id) return;
    setGeneratingSummary(true);
    const result = await dispatch(triggerTranscriptPipeline(media.id));
    if (result.meta.requestStatus === "fulfilled") {
      await dispatch(fetchTranscript(transcriptRequest(media.id)));
    }
    setGeneratingSummary(false);
  }, [dispatch, media?.id, transcriptRequest]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const user = useSelector(selectUser);
  const isText = media?.media_type === mediaTypes.text;
  const keyPointHeadings = transcript?.ai_key_point_headings || [];

  // Available as soon as there's a transcript: if key points are missing (e.g.
  // the auto AI step failed on a long lecture), the server generates them from
  // the existing chunks on demand — so a transcript is all we need here.
  const canGenerateHeadings =
    (transcript?.chunks?.length ?? 0) > 0 ||
    (Array.isArray(transcript?.ai_key_points) && transcript.ai_key_points.length > 0);

  // Ownership, not just role. The server refuses a transcript write from a
  // lecturer who did not upload the item, so testing the role alone here would
  // offer an editor and an AI button that 403 on press.
  const canEditTranscript = canManageMedia(user, media);

  return {
    transcript,
    generatingHeadings, generateHeadings,
    generatingSummary, generateSummary,
    isText, keyPointHeadings, canEditTranscript, canGenerateHeadings,
    pollingStalled, retryPolling,
  };
};

export default useMediaInsights;
