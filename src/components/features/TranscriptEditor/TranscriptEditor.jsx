import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { updateTranscript, triggerTranscriptPipeline } from "../../../store/slicesAndThunks/transcriptSlice/transcriptPut";

const STATUS_COLOR = { pending: "default", processing: "warning", done: "success", error: "error" };
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
    setSaving(true);
    await dispatch(updateTranscript({ mediaId, editedText }));
    setSaving(false);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    await dispatch(triggerTranscriptPipeline(mediaId));
    setTriggering(false);
  };

  const statusLabel = status || "no transcript";
  const placeholder = canEdit
    ? "No transcript available yet. Click 'Run Pipeline' to start."
    : "No transcript available yet.";

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={600}>Transcript</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Chip
            label={isProcessing ? `${statusLabel}...` : statusLabel}
            color={STATUS_COLOR[status] || "default"}
            size="small"
          />
          {canEdit && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleTrigger}
              disabled={triggering || isProcessing}
              startIcon={triggering || isProcessing ? <CircularProgress size={14} /> : null}
            >
              {isProcessing ? "Running..." : "Run Pipeline"}
            </Button>
          )}
        </Box>
      </Box>

      {isProcessing && !hasContent && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">
            Transcribing audio with Whisper. This usually takes 1–3 minutes for a 30 min recording.
          </Typography>
        </Box>
      )}

      <TextField
        multiline
        rows={10}
        fullWidth
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        placeholder={placeholder}
        variant="outlined"
        InputProps={{ readOnly: !canEdit }}
      />

      {canEdit && (
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !editedText}
          sx={{ alignSelf: "flex-end" }}
        >
          {saving ? "Saving..." : "Save Transcript"}
        </Button>
      )}
    </Box>
  );
};

export default TranscriptEditor;
