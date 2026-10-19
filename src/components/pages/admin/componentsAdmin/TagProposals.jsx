import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import ProposeTagDialog from "../../../features/TagPicker/ProposeTagDialog";
import { pathOf } from "../../../features/TagPicker/tagOptions";
import { buildTagRelations } from "../../archive/componentsArchive/tagStates";
import { useTagProposalsAdmin } from "./useTagProposalsAdmin";

// New tags lecturers asked for, waiting for an admin.
//
// Approving puts the tag in the tree and tags every lesson that asked for it,
// in one step on the server. "עריכה ואישור" opens the same dialog the lecturer
// used, pre-filled, so a misspelling or a wrong branch is corrected before the
// tag exists rather than renamed after items already carry it.

const formatDate = (value) => (value ? new Date(value).toLocaleDateString("he-IL") : "");

const TagProposals = () => {
  const { proposals, tree, error, notice, clearNotice, approve, reject } = useTagProposalsAdmin();
  const relations = useMemo(() => buildTagRelations(tree), [tree]);
  const [editing, setEditing] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [rowError, setRowError] = useState(null);

  const placeOf = (parentId) => pathOf(relations, parentId).join(" ← ") || "כותרת ראשית";

  const run = async (proposal, work) => {
    setBusyId(proposal.id);
    setRowError(null);
    try {
      await work();
    } catch (err) {
      setRowError({ id: proposal.id, message: err?.hebrew || "הפעולה נכשלה" });
    } finally {
      setBusyId(null);
    }
  };

  const confirmReject = async () => {
    const target = rejecting;
    setRejecting(null);
    await run(target, () => reject(target, reason));
    setReason("");
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={2}>
        תגיות חדשות שממתינות לאישור{proposals?.length ? ` (${proposals.length})` : ""}
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {notice && (
        <Alert severity="success" onClose={clearNotice} sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      {proposals === null && !error && <CircularProgress size={24} />}
      {proposals?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          אין תגיות שממתינות לאישור.
        </Typography>
      )}

      {proposals?.map((proposal, index) => (
        <Box key={proposal.id}>
          {index > 0 && <Divider sx={{ my: 1.5 }} />}
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between" }}>
            <Box sx={{ minWidth: 0, flex: "1 1 280px" }}>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {proposal.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                תחת: {placeOf(proposal.parent_id)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                הוצעה על ידי {proposal.proposed_by_name || "משתמש שנמחק"} · {formatDate(proposal.created_at)}
              </Typography>
              {proposal.media.length > 0 && (
                <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                  תתווסף ל: {proposal.media.map((m) => `«${m.title}»`).join(", ")}
                </Typography>
              )}
              {rowError?.id === proposal.id && (
                <Alert severity="error" sx={{ mt: 1 }}>{rowError.message}</Alert>
              )}
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<CheckIcon />}
                disabled={busyId !== null}
                onClick={() => run(proposal, () => approve(proposal, {}))}
              >
                אישור
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<EditIcon />}
                disabled={busyId !== null}
                onClick={() => setEditing(proposal)}
              >
                עריכה ואישור
              </Button>
              <Button
                size="small"
                color="error"
                startIcon={<CloseIcon />}
                disabled={busyId !== null}
                onClick={() => setRejecting(proposal)}
              >
                דחייה
              </Button>
            </Box>
          </Box>
        </Box>
      ))}

      <ProposeTagDialog
        open={Boolean(editing)}
        nodes={tree}
        title="עריכה ואישור תגית"
        submitLabel="אישור"
        note={
          editing?.media.length
            ? `אחרי האישור התגית תיכנס לעץ ותתווסף ל-${editing.media.length} שיעורים.`
            : "אחרי האישור התגית תיכנס לעץ."
        }
        initialName={editing?.name ?? ""}
        initialParentId={editing?.parent_id ?? null}
        onClose={() => setEditing(null)}
        onSubmit={async ({ name, parentId }) => {
          // Throws with `hebrew` on failure, which the dialog shows in place.
          await approve(editing, { name, parentId });
          setEditing(null);
        }}
      />

      <Dialog open={Boolean(rejecting)} onClose={() => setRejecting(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ textAlign: "right" }}>דחיית «{rejecting?.name}»</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="סיבה (לא חובה)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejecting(null)}>ביטול</Button>
          <Button color="error" variant="contained" onClick={confirmReject}>
            דחייה
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TagProposals;
