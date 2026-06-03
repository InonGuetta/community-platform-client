import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { updateTranscript, triggerTranscriptPipeline, fixHebrewTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptPut";
import { fetchTranscript } from "../../../store/slicesAndThunks/transcriptSlice/transcriptGet";

const STATUS_COLOR = { pending: "default", processing: "warning", done: "success", error: "error" };
const STATUS_LABEL_HE = {
  pending: "בהמתנה",
  processing: "מתמלל",
  done: "מוכן",
  error: "שגיאה",
};
const IN_FLIGHT = new Set(["pending", "processing"]);

const chunksToText = (chunks = []) =>
  chunks.map((c) => c.content).join("\n\n");

const TranscriptEditor = ({ transcript, mediaId, canEdit = false }) => {
  const dispatch = useDispatch();
  const initialText =
    transcript?.edited_text ||
    chunksToText(transcript?.chunks) ||
    "";
  const [editedText, setEditedText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [fixing, setFixing] = useState(false);
  // null = no save attempt yet; "saved" / error string after the last attempt.
  const [saveFeedback, setSaveFeedback] = useState(null);

  // When polling brings fresh chunks/text from the server, sync them into
  // the textarea — but only if the user hasn't started typing locally,
  // so we don't blow away in-progress edits.
  useEffect(() => {
    if (!canEdit || editedText === "") setEditedText(initialText);
  }, [initialText]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = transcript?.status;
  const isProcessing = IN_FLIGHT.has(status);
  const hasContent = (transcript?.chunks?.length ?? 0) > 0 || !!transcript?.edited_text;

  const handleSave = async () => {
    console.log(`[FE:editor] handleSave click mediaId=${mediaId} textLen=${editedText.length}`);
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
    console.log(`[FE:editor] handleTrigger (Run Pipeline) click mediaId=${mediaId}`);
    setTriggering(true);
    const result = await dispatch(triggerTranscriptPipeline(mediaId));
    setTriggering(false);
    // Immediately refetch so the UI sees status='pending'/'processing' right
    // away, which is what flips the polling loop on. Without this we'd have
    // to wait for a manual refresh or a stale transcript with no status.
    if (result.meta.requestStatus === "fulfilled") {
      console.log(`[FE:editor] trigger ok → immediate fetchTranscript to start polling`);
      dispatch(fetchTranscript(mediaId));
    }
  };

  const handleFixHebrew = async () => {
    console.log(`[FE:editor] handleFixHebrew click mediaId=${mediaId}`);
    setFixing(true);
    const result = await dispatch(fixHebrewTranscript(mediaId));
    if (result.meta.requestStatus === "fulfilled" && result.payload?.edited_text != null) {
      setEditedText(result.payload.edited_text);
    }
    setFixing(false);
  };

  const statusLabel = STATUS_LABEL_HE[status] || "אין תמלול";
  const placeholder = canEdit
    ? "אין עדיין תמלול. לחץ 'הפעל תמלול' כדי להתחיל."
    : "אין עדיין תמלול.";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={600}>תמלול</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Chip
            label={isProcessing ? `${statusLabel}...` : statusLabel}
            color={STATUS_COLOR[status] || "default"}
            size="small"
          />
          {canEdit && (
            <>
              <Button
                size="small"
                variant="outlined"
                onClick={handleFixHebrew}
                disabled={fixing || isProcessing || !hasContent}
                startIcon={fixing ? <CircularProgress size={14} /> : null}
              >
                {fixing ? "מתקן..." : "תקן עברית"}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleTrigger}
                disabled={triggering || isProcessing}
                startIcon={triggering || isProcessing ? <CircularProgress size={14} /> : null}
              >
                {isProcessing ? "רץ..." : "הפעל תמלול"}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {isProcessing && !hasContent && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">
            מתמלל את האודיו באמצעות Whisper. בדרך כלל לוקח 1–3 דקות להקלטה של 30 דקות.
          </Typography>
        </Box>
      )}

      <TextField
        multiline
        rows={10}
        fullWidth
        value={editedText}
        onChange={(e) => { setEditedText(e.target.value); setSaveFeedback(null); }}
        placeholder={placeholder}
        variant="outlined"
        InputProps={{ readOnly: !canEdit }}
      />

      {canEdit && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignSelf: "flex-end", alignItems: "flex-end" }}>
          {saveFeedback === "saved" && (
            <Alert severity="success" sx={{ width: "100%" }}>התמלול נשמר בהצלחה</Alert>
          )}
          {saveFeedback && saveFeedback !== "saved" && (
            <Alert severity="error" sx={{ width: "100%" }}>{saveFeedback}</Alert>
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !editedText}
          >
            {saving ? "שומר..." : "שמור תמלול"}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TranscriptEditor;
