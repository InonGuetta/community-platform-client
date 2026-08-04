import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";

// The panel used to render `null` whenever there was no summary — which was
// tolerable when a summary arrived a minute after a lecture was transcribed, and
// is not once a 400-page book can occupy the worker for the better part of an
// hour. An empty tab is indistinguishable from a broken one, so every state now
// says what it is: not started, running, failed (with the reason), or done.

const IN_FLIGHT = new Set(["pending", "processing", "analyzing"]);

// 'processing' means different work depending on the source, and telling a
// lecturer their book is "being transcribed" is both wrong and alarming.
const progressLabel = (status, isText) => {
  if (status === "pending") return "ממתין בתור...";
  if (status === "processing") {
    return isText ? "מחלץ את הטקסט מהקובץ..." : "מתמלל את ההקלטה...";
  }
  return "מפיק סיכום ונקודות מפתח...";
};

const AISummaryPanel = ({
  transcript,
  isText = false,
  // Deliberately NOT "canEdit". Generating a summary means triggering the
  // pipeline, and for audio/video that pipeline starts at Whisper — so a
  // "generate summary" button there would quietly re-transcribe and re-bill a
  // three-hour lecture. Audio keeps its existing entry point ("הפעל תמלול" in
  // the transcript tab); only a document, which has no such tab, gets one here.
  canGenerate = false,
  generating = false,
  onGenerate,
  // Polling gives up after a fixed window. That is surfaced in the transcript
  // tab for audio — but a document has no transcript tab, so without this a
  // wedged book job would spin here forever with no way to re-check.
  pollingStalled = false,
  onRetryPolling,
}) => {
  const status = transcript?.status;
  const summary = transcript?.ai_summary;
  const keyPoints = transcript?.ai_key_points || [];
  const inFlight = IN_FLIGHT.has(status) || generating;
  const running = inFlight && !pollingStalled;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>סיכום AI</Typography>

      {running && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">{progressLabel(status, isText)}</Typography>
        </Box>
      )}

      {inFlight && pollingStalled && (
        <Alert
          severity="warning"
          action={
            onRetryPolling && (
              <Button color="inherit" size="small" onClick={onRetryPolling}>
                בדוק שוב
              </Button>
            )
          }
        >
          הפסקנו לבדוק אחרי המתנה ארוכה. ייתכן שהתהליך נתקע.
        </Alert>
      )}

      {/* error_message carries the reason the worker recorded. For a document it
          is usually something the lecturer can act on ("this file is a scan"),
          which is exactly the difference between a dead end and a next step. */}
      {status === "error" && !inFlight && (
        <Alert severity="error">
          {transcript?.error_message || "הפקת הסיכום נכשלה. אפשר לנסות שוב."}
        </Alert>
      )}

      {summary && !running && (
        <Typography variant="body2" color="text.secondary">{summary}</Typography>
      )}

      {summary && keyPoints.length > 0 && !running && (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight={600}>נקודות מפתח</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {keyPoints.map((point, i) => (
              <Chip key={i} label={point} size="small" variant="outlined" color="primary" />
            ))}
          </Box>
        </>
      )}

      {!summary && !inFlight && status !== "error" && (
        <Typography variant="body2" color="text.secondary">
          {canGenerate
            ? "לחץ 'הפק סיכום' כדי לחלץ את הטקסט מהקובץ ולסכם אותו."
            : "אין עדיין סיכום."}
        </Typography>
      )}

      {canGenerate && (
        <Button
          variant="contained"
          size="small"
          onClick={onGenerate}
          disabled={running}
          startIcon={running ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ alignSelf: "flex-start" }}
        >
          {summary ? "הפק סיכום מחדש" : "הפק סיכום"}
        </Button>
      )}
    </Box>
  );
};

export default AISummaryPanel;
