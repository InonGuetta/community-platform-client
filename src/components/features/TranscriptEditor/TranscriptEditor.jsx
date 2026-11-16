import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { isAiActionBusy } from "../../../utilities/aiActionState";
import { useTranscriptEditor } from "./useTranscriptEditor";
import { useTranslation } from "react-i18next";

const STATUS_COLOR = { pending: "default", processing: "warning", analyzing: "info", done: "success", error: "error" };
// The statuses the chip has words for (transcript.status.<status>).
const STATUSES = Object.keys(STATUS_COLOR);

const TranscriptEditor = ({ transcript, mediaId, canEdit = false, pollingStalled = false, onRetryPolling }) => {
  const { t } = useTranslation("lesson");
  const {
    editedText, setEditedText, saving, triggering, saveFeedback, setSaveFeedback,
    status, fixStatus, fixing, isProcessing, hasContent, handleSave, handleTrigger, handleFixHebrew,
  } = useTranscriptEditor({ transcript, mediaId, canEdit });

  const statusLabel = t(STATUSES.includes(status) ? `transcript.status.${status}` : "transcript.status.none");
  const placeholder = canEdit ? t("transcript.emptyCanRun") : t("transcript.empty");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="subtitle1" fontWeight={600}>{t("transcript.title")}</Typography>
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
                {fixing ? t("transcript.fixing") : t("transcript.fixHebrew")}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={handleTrigger}
                disabled={triggering || isProcessing}
                startIcon={triggering || isProcessing ? <CircularProgress size={14} /> : null}
              >
                {isProcessing ? t("transcript.running") : t("transcript.run")}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* The page stopped polling while the row still says it is processing —
          which usually means the worker died mid-job and nothing will ever
          update that row. Say so and offer to look again, rather than leaving a
          spinner that would never resolve. */}
      {isProcessing && pollingStalled && (
        <Alert
          severity="warning"
          action={
            onRetryPolling && (
              <Button color="inherit" size="small" onClick={onRetryPolling}>
                {t("transcript.checkAgain")}
              </Button>
            )
          }
        >
          {t("transcript.stoppedChecking")}
        </Alert>
      )}

      {/* The transcript is readable at this point — only the AI summary is
          still being produced — so say that rather than showing nothing. */}
      {status === "analyzing" && !pollingStalled && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">
            {t("transcript.readyAnalyzing")}
          </Typography>
        </Box>
      )}

      {isProcessing && !pollingStalled && !hasContent && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">
            {t("transcript.transcribingHint")}
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
        // Read-only while the Hebrew correction runs: it will replace this text
        // when it finishes, and typing in the meantime would be thrown away.
        InputProps={{ readOnly: !canEdit || isAiActionBusy(fixStatus) }}
        // Each line in the direction of its own words (the transcript is
        // content): a line opening with a Latin name stays right to left.
        sx={{ "& textarea": { unicodeBidi: "plaintext", textAlign: "start" } }}
        helperText={isAiActionBusy(fixStatus) ? t("transcript.fixInBackground") : undefined}
      />

      {canEdit && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignSelf: "flex-end", alignItems: "flex-end" }}>
          {saveFeedback === "saved" && (
            <Alert severity="success" sx={{ width: "100%" }}>{t("transcript.saved")}</Alert>
          )}
          {saveFeedback && saveFeedback !== "saved" && (
            <Alert severity="error" sx={{ width: "100%" }}>{saveFeedback}</Alert>
          )}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving || !editedText}
          >
            {saving ? t("transcript.saving") : t("transcript.save")}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TranscriptEditor;
