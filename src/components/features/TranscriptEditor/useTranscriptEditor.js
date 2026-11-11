import { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { updateTranscript, triggerTranscriptPipeline, fixHebrewTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptPut";
import { fetchTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";
import { transcriptToText } from "../../../utilities/transcriptText";
import { isAiActionBusy, aiActionOutcome } from "../../../utilities/aiActionState";

// What the transcript editor does — the text being edited, kept in step with
// the server's, and its three actions (save, start the pipeline, queue the
// Hebrew correction) — so that TranscriptEditor.jsx is layout only.

const IN_FLIGHT = new Set(["pending", "processing", "analyzing"]);

/**
 * @param {{ transcript: any, mediaId: number|string, canEdit?: boolean }} props
 */
export const useTranscriptEditor = ({ transcript, mediaId, canEdit = false }) => {
  const dispatch = useDispatch();
  const initialText = transcriptToText(transcript);
  const [editedText, setEditedText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  // Only the moment between the press and the server's 202. After that the
  // ROW says whether the correction is still running (PRD PIPE-5) — it runs on
  // the server's queue, and keeps running across a reload.
  const [requestingFix, setRequestingFix] = useState(false);
  // null = no save attempt yet; "saved" / error string after the last attempt.
  const [saveFeedback, setSaveFeedback] = useState(null);

  // When polling brings fresh chunks/text from the server, sync them into
  // the textarea — but only if the user hasn't started typing locally,
  // so we don't blow away in-progress edits.
  useEffect(() => {
    if (!canEdit || editedText === "") setEditedText(initialText);
  }, [initialText]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = transcript?.status;
  const fixStatus = transcript?.hebrew_fix_status;
  const fixing = requestingFix || isAiActionBusy(fixStatus);

  // When the correction finishes, the textarea takes the corrected text — the
  // sync above deliberately leaves alone a textarea the user has typed in, and
  // this is the one time replacing it is what they asked for. (It is read-only
  // while the correction runs, so there is no typing to lose.)
  const previousFixStatus = useRef(fixStatus);
  useEffect(() => {
    const before = previousFixStatus.current;
    previousFixStatus.current = fixStatus;
    if (aiActionOutcome(before, fixStatus) === "done" && transcript?.edited_text != null) {
      setEditedText(transcript.edited_text);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixStatus]);
  const isProcessing = IN_FLIGHT.has(status);
  const hasContent = (transcript?.chunks?.length ?? 0) > 0 || !!transcript?.edited_text;

  const handleSave = async () => {
    setSaving(true);
    setSaveFeedback(null);
    const result = await dispatch(updateTranscript({ mediaId, editedText }));
    setSaving(false);
    // Don't let a failed save look successful — surface the rejection so a long
    // transcript that the server refused isn't silently lost.
    setSaveFeedback(
      result.meta.requestStatus === "fulfilled"
        ? "saved"
        : result.payload || "השמירה נכשלה"
    );
  };

  const handleTrigger = async () => {
    setTriggering(true);
    const result = await dispatch(triggerTranscriptPipeline(mediaId));
    setTriggering(false);
    // Immediately refetch so the UI sees status='pending'/'processing' right
    // away, which is what flips the polling loop on. Without this we'd have
    // to wait for a manual refresh or a stale transcript with no status.
    if (result.meta.requestStatus === "fulfilled") {
      dispatch(fetchTranscript(mediaId));
    }
  };

  // Queues the correction; the result arrives through polling — see above.
  const handleFixHebrew = async () => {
    setRequestingFix(true);
    await dispatch(fixHebrewTranscript(mediaId));
    setRequestingFix(false);
  };

  return {
    editedText, setEditedText, saving, triggering, saveFeedback, setSaveFeedback,
    status, fixStatus, fixing, isProcessing, hasContent, handleSave, handleTrigger, handleFixHebrew,
  };
};
