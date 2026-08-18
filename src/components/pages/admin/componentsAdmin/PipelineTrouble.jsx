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
const whenText = (value) =>
  value ? new Date(value).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" }) : "—";

const PipelineTrouble = ({ trouble, onReconciled }) => {
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
        <Typography variant="h6" fontWeight={700}>תקלות בצנרת</Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={running ? <CircularProgress size={16} /> : <ReplayIcon />}
          onClick={() => setConfirmOpen(true)}
          disabled={running}
        >
          הרצת סנכרון
        </Button>
      </Box>

      {queueUnreachable && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          לא ניתן לקרוא את התור. ייתכן ש-Redis אינו זמין — הרשימה כאן אינה מלאה.
        </Alert>
      )}

      {result && (
        <Alert severity={result.error ? "error" : "success"} sx={{ mb: 2 }} onClose={() => setResult(null)}>
          {result.error
            ? "הסנכרון נכשל"
            : `נמצאו ${result.found ?? 0}, הוכנסו לתור ${result.queued?.length ?? 0}` +
              (result.deferred ? `, ${result.deferred} נדחו להרצה הבאה` : "")}
        </Alert>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        עבודות שנכשלו ({failed.length})
      </Typography>
      {failed.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>אין עבודות שנכשלו.</Typography>
      ) : (
        <Box sx={{ overflowX: "auto", mb: 3 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>תור</TableCell>
                <TableCell>מדיה</TableCell>
                <TableCell>סיבה</TableCell>
                <TableCell>מתי</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {failed.map((job) => (
                <TableRow key={`${job.queue}-${job.id}`}>
                  <TableCell><Chip size="small" label={job.queue} /></TableCell>
                  <TableCell>{job.mediaId ?? "—"}</TableCell>
                  <TableCell sx={{ maxWidth: 380, wordBreak: "break-word" }}>{job.reason || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{whenText(job.failedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        מדיה ללא תמלול תקין ({stranded.length})
      </Typography>
      {stranded.length === 0 ? (
        <Typography variant="body2" color="text.secondary">כל המדיה תוקתקה או בעיבוד.</Typography>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>כותרת</TableCell>
                <TableCell>מצב</TableCell>
                <TableCell>שגיאה</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stranded.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.id}</TableCell>
                  <TableCell sx={{ maxWidth: 220, wordBreak: "break-word" }}>{item.title}</TableCell>
                  <TableCell>
                    <Chip size="small" color={item.status === "error" ? "error" : "default"} label={item.status ?? "לא הופעל"} />
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
          NOT ConfirmingDeletionDialog: that one is titled "אישור מחיקה" with a
          red "מחיקה" button, and nothing here deletes anything. Bending it to
          fit would have meant telling an admin they were about to delete. */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle onClose={() => setConfirmOpen(false)}>הרצת סנכרון</DialogTitle>
        <DialogContent>
          <Typography>
            הפעולה תכניס לתור תמלול עבור מדיה שאין לה תמלול תקין.
            כל עבודה כזו היא חיוב אמיתי מול Whisper. להמשיך?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined">ביטול</Button>
          <Button onClick={handleReconcile} variant="contained">הרצה</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PipelineTrouble;
