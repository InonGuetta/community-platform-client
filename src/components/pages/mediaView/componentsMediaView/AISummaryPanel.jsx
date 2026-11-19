import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import TextQualityNotice from "./TextQualityNotice";
import { processingReasonText } from "../../../../utilities/processingReason";
import { useTranslation } from "react-i18next";

// The panel used to render `null` whenever there was no summary — which was
// tolerable when a summary arrived a minute after a lecture was transcribed, and
// is not once a 400-page book can occupy the worker for the better part of an
// hour. An empty tab is indistinguishable from a broken one, so every state now
// says what it is: not started, running, failed (with the reason), or done.

const IN_FLIGHT = new Set(["pending", "processing", "analyzing"]);

// ── How long a failure stays on the screen ─────────────────────────────────
//
// `status` is the LAST outcome, not a recent event: a book whose summary failed
// once is a row that reads 'error' for as long as nobody presses the button
// again. So the alert was not reporting "this just failed" — it was reporting
// "this failed, ever", and it sat on the tab for days, on a document that is
// perfectly readable without a summary.
//
// A failure is worth interrupting for in the moments after the press that
// caused it, and after that the honest thing to say is simply that there is no
// summary. So the alert is tied to the TRANSITION into 'error' while this panel
// is watching, not to the value of `status` — a page opened later shows the
// quiet empty state, because for that reader nothing has just failed.
//
// Deliberately not derived from the row's updated_at: that would make the
// message depend on the browser's clock agreeing with the server's, to decide
// something a timer already knows exactly.
const FAILURE_VISIBLE_MS = 10000;

// 'processing' means different work depending on the source, and telling a
// lecturer their book is "being transcribed" is both wrong and alarming.
const progressLabel = (t, status, isText) => {
  if (status === "pending") return t("summary.queued");
  if (status === "processing") return t(isText ? "summary.extracting" : "summary.transcribing");
  return t("summary.analyzing");
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
  // The lesson's tags. Not part of the AI output — they are set by the person
  // who uploaded it — but they answer the same question as the summary ("what
  // is this about"), so they sit at the foot of the same tab.
  tags = [],
}) => {
  const { t } = useTranslation("lesson");
  const status = transcript?.status;
  const summary = transcript?.ai_summary;
  const keyPoints = transcript?.ai_key_points || [];
  const inFlight = IN_FLIGHT.has(status) || generating;
  const running = inFlight && !pollingStalled;

  // See FAILURE_VISIBLE_MS. Only a document expires its failure this way; a
  // recording's keeps standing, because there the failure is the whole reason
  // the transcript tab is empty and a lecturer has to be able to come back to
  // it and read why.
  const [failureIsFresh, setFailureIsFresh] = useState(false);
  // Seeded with the status this panel opened on, so a row that was ALREADY in
  // error is not mistaken for one that just entered it.
  const statusBefore = useRef(status);

  useEffect(() => {
    const before = statusBefore.current;
    statusBefore.current = status;
    if (!isText || status !== "error" || before === "error") return undefined;

    setFailureIsFresh(true);
    const timer = setTimeout(() => setFailureIsFresh(false), FAILURE_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [status, isText]);

  const showFailure = status === "error" && !inFlight && (!isText || failureIsFresh);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="subtitle1" fontWeight={600}>{t("summary.title")}</Typography>

      {/* A book only: a recording's transcript is never OCR. canGenerate is
          exactly "may re-process this document", so it is also who can fix it. */}
      {isText && <TextQualityNotice quality={transcript?.text_quality} canFix={canGenerate} />}

      {running && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1, color: "text.secondary" }}>
          <CircularProgress size={18} />
          <Typography variant="body2">{progressLabel(t, status, isText)}</Typography>
        </Box>
      )}

      {inFlight && pollingStalled && (
        <Alert
          severity="warning"
          action={
            onRetryPolling && (
              <Button color="inherit" size="small" onClick={onRetryPolling}>
                {t("summary.checkAgain")}
              </Button>
            )
          }
        >
          {t("summary.stoppedChecking")}
        </Alert>
      )}

      {/* error_message carries the reason the worker recorded, as a code worded
          here in the reader's language (utilities/processingReason.js). For a document it
          is usually something the lecturer can act on ("this file is a scan"),
          which is exactly the difference between a dead end and a next step. */}
      {showFailure && (
        <Alert severity="error">
          {processingReasonText(transcript?.error_message, t("summary.failed"))}
        </Alert>
      )}

      {summary && !running && (
        <Typography variant="body2" color="text.secondary" dir="auto">{summary}</Typography>
      )}

      {summary && keyPoints.length > 0 && !running && (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight={600}>{t("summary.keyPoints")}</Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {keyPoints.map((point, i) => (
              <Chip key={i} label={point} dir="auto" size="small" variant="outlined" color="primary" />
            ))}
          </Box>
        </>
      )}

      {/* Shown whatever the state of the summary: tags are set by hand, so a
          lesson with no summary yet — or one still being produced — has them
          all the same. The same chips the archive card shows. */}
      {tags.length > 0 && (
        <>
          <Divider />
          <Typography variant="subtitle2" fontWeight={600}>{t("summary.tags")}</Typography>
          <Box data-testid="summary-tags" sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" color="secondary" />
            ))}
          </Box>
        </>
      )}

      {/* Once the failure above has expired this takes over, which is why it is
          keyed on the alert actually being shown rather than on the status. A
          document with no summary is an ordinary state and reads as one. */}
      {!summary && !inFlight && !showFailure && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t("summary.none", { context: isText ? "book" : "lesson" })}
          </Typography>
          {/* Kept beside it rather than instead of it: the first line says what
              the state is, this one says what the button will do — which for a
              document is not obvious, since it extracts the text as well. */}
          {canGenerate && (
            <Typography variant="caption" color="text.disabled">
              {t("summary.howToBook")}
            </Typography>
          )}
        </Box>
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
          {summary ? t("summary.regenerate") : t("summary.generate")}
        </Button>
      )}
    </Box>
  );
};

export default AISummaryPanel;
