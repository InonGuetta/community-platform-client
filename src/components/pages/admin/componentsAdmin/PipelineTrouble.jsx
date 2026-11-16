import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Dialog from "@mui/material/Dialog";
import ReplayIcon from "@mui/icons-material/Replay";
import DialogTitle from "../../../features/Dialogs/DialogTitle";
import DialogContent from "../../../features/Dialogs/DialogContent";
import DialogActions from "../../../features/Dialogs/DialogActions";
import { formatDateTime } from "../../../../utilities/formatDate";
import { useTranslation } from "react-i18next";

// What broke, and the one button that does something about it.
//
// The queue panel next to this has reported a failed COUNT since the dashboard
// was built. A count tells an admin that something is wrong and nothing about
// what, and there was no action attached to it at all — the only route back was
// finding the lecturer and asking them to press "הפעל תמלול" again.
//
// Two lists, because they are two different failures with two different causes:
// a job that RAN and failed leaves a reason in Redis; media that was never
// queued leaves nothing there at all, and is exactly what the reconcile sweep is
// for.

const PipelineTrouble = ({ trouble, onReconciled }) => {
  const { t } = useTranslation(["admin", "common"]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const failed = [
    ...(trouble?.failed?.transcription ?? []),
    ...(trouble?.failed?.llm ?? []),
  ];
  // null from the server means "could not reach Redis", which is the opposite of
  // "nothing failed" and must not be shown as an empty list.
  const queueUnreachable =
    trouble?.failed?.transcription === null || trouble?.failed?.llm === null;
  const stranded = trouble?.stranded ?? [];

  const handleReconcile = async () => {
    setConfirmOpen(false);
    setRunning(true);
    try {
      setResult(await onReconciled());
    } catch {
      setResult({ error: true });
    }
    setRunning(false);
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={700}>{t("pipeline.title")}</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={running ? <CircularProgress size={16} /> : <ReplayIcon />}
          onClick={() => setConfirmOpen(true)}
          disabled={running}
        >
          {t("pipeline.reconcile")}
        </Button>
      </Box>

      {queueUnreachable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t("pipeline.queueUnreadable")}
        </Alert>
      )}

      {result && (
        <Alert severity={result.error ? "error" : "success"} sx={{ mb: 2 }} onClose={() => setResult(null)}>
          {result.error
            ? t("pipeline.reconcileFailed")
            : t("pipeline.reconciled", { found: result.found ?? 0, queued: result.queued?.length ?? 0 }) +
              (result.deferred ? t("pipeline.deferred", { n: result.deferred }) : "")}
        </Alert>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {t("pipeline.failedJobs", { n: failed.length })}
      </Typography>
      {failed.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{t("pipeline.noFailedJobs")}</Typography>
      ) : (
        <Box sx={{ overflowX: "auto", mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{t("pipeline.queue")}</TableCell>
                <TableCell>{t("pipeline.media")}</TableCell>
                <TableCell>{t("pipeline.reason")}</TableCell>
                <TableCell>{t("pipeline.when")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {failed.map((job) => (
                <TableRow key={`${job.queue}-${job.id}`}>
                  <TableCell><Chip size="small" label={job.queue} /></TableCell>
                  <TableCell>{job.mediaId ?? "—"}</TableCell>
                  <TableCell sx={{ maxWidth: 380, wordBreak: "break-word" }}>{job.reason || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDateTime(job.failedAt, "—")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {t("pipeline.stranded", { n: stranded.length })}
      </Typography>
      {stranded.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{t("pipeline.noStranded")}</Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>{t("pipeline.mediaTitle")}</TableCell>
                <TableCell>{t("pipeline.state")}</TableCell>
                <TableCell>{t("pipeline.error")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stranded.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell sx={{ maxWidth: 220, wordBreak: "break-word" }}>{item.title}</TableCell>
                  <TableCell>
                    <Chip size="small" color={item.status === "error" ? "error" : "default"} label={item.status ?? t("pipeline.neverRun")} />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320, wordBreak: "break-word" }}>{item.error_message || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Confirmed because each queued job is a real Whisper bill — the sweep
          bounds itself per run, but an accidental press still costs money.
          NOT ConfirmingDeletionDialog: that one is titled "confirm deletion" with a
          red "delete" button, and nothing here deletes anything. Bending it to
          fit would have meant telling an admin they were about to delete. */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle onClose={() => setConfirmOpen(false)}>{t("pipeline.reconcile")}</DialogTitle>
        <DialogContent>
          <Typography>
            {t("pipeline.confirmBody")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined">{t("common:actions.cancel")}</Button>
          <Button onClick={handleReconcile} variant="contained">{t("pipeline.run")}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineTrouble;
