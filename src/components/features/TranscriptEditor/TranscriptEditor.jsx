import { useState } from "react";
import { useDispatch } from "react-redux";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { updateTranscript, triggerTranscriptPipeline } from "../../../store/slicesAndThunks/transcriptSlice/transcriptPut";

const STATUS_COLOR = { pending: "default", processing: "warning", done: "success", error: "error" };

const chunksToText = (chunks = []) =>
  chunks.map((c) => c.content).join("\n\n");

const TranscriptEditor = ({ transcript, mediaId }) => {
  const dispatch = useDispatch();
  const initialText =
    transcript?.edited_text ||
    chunksToText(transcript?.chunks) ||
    "";
  const [editedText, setEditedText] = useState(initialText);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await dispatch(updateTranscript({ mediaId, editedText }));
    setSaving(false);
  };

  const handleTrigger = () => dispatch(triggerTranscriptPipeline(mediaId));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={600}>Transcript</Typography>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Chip
            label={transcript?.status || "no transcript"}
            color={STATUS_COLOR[transcript?.status] || "default"}
            size="small"
          />
          <Button size="small" variant="outlined" onClick={handleTrigger}>
            Run Pipeline
          </Button>
        </Box>
      </Box>

      <TextField
        multiline
        rows={10}
        fullWidth
        value={editedText}
        onChange={(e) => setEditedText(e.target.value)}
        placeholder="No transcript available yet. Click 'Run Pipeline' to start."
        variant="outlined"
      />

      <Button
        variant="contained"
        onClick={handleSave}
        disabled={saving || !editedText}
        sx={{ alignSelf: "flex-end" }}
      >
        {saving ? "Saving..." : "Save Transcript"}
      </Button>
    </Box>
  );
};

export default TranscriptEditor;
