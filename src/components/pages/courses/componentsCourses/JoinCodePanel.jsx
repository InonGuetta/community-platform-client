import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import KeyIcon from "@mui/icons-material/VpnKeyOutlined";
import ConfirmingDeletionDialog from "../../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import useJoinCodePanel from "./useJoinCodePanel";
import { formatHebrewDate } from "../../../../utilities/formatDate";

// "הצטרפות בקוד" in a course's panel (PRD ROST-9). See useJoinCodePanel.

const RequestRow = ({ request, busy, onApprove, onReject }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, borderTop: 1, borderColor: "divider", flexWrap: "wrap" }}>
    <Box sx={{ flex: 1, minWidth: 160 }}>
      <Typography fontWeight={600}>{request.display_name || request.email}</Typography>
      <Typography variant="body2" color="text.secondary">
        {request.display_name ? `${request.email} · ` : ""}ביקש ב-{formatHebrewDate(request.created_at)}
      </Typography>
    </Box>
    <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => onApprove(request.id)}>
      אישור
    </Button>
    <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => onReject(request.id)}>
      דחייה
    </Button>
  </Box>
);

const JoinCodePanel = ({ course }) => {
  const p = useJoinCodePanel(course);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <KeyIcon color="primary" fontSize="small" />
        <Typography fontWeight={700}>הצטרפות בקוד</Typography>
      </Box>

      {p.code ? (
        <>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography
              component="span"
              dir="ltr"
              data-testid="join-code"
              sx={{ fontFamily: "monospace", fontSize: "1.6rem", fontWeight: 700, letterSpacing: "0.2em", px: 1.5, py: 0.25, borderRadius: 1, bgcolor: "action.hover" }}
            >
              {p.code}
            </Typography>
            <Tooltip title="העתקת הקוד">
              <IconButton onClick={p.copyCode} aria-label="העתקת הקוד"><ContentCopyIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Button size="small" variant="outlined" endIcon={<LinkIcon />} onClick={p.copyLink}>העתקת קישור להצטרפות</Button>
            <Box sx={{ flex: 1 }} />
            <Button size="small" disabled={p.busy} onClick={p.askReplace}>קוד חדש</Button>
            <Button size="small" color="error" disabled={p.busy} onClick={p.removeCode}>ביטול ההצטרפות בקוד</Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            מי שמזין את הקוד שולח בקשה, והוא נכנס לקורס רק אחרי שתאשרו.
          </Typography>
        </>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 220 }}>
            עם קוד, תלמידים יכולים לבקש להצטרף לקורס בעצמם, ואתם מאשרים כל בקשה.
          </Typography>
          <Button variant="contained" size="small" disabled={p.busy} onClick={p.createCode}>יצירת קוד</Button>
        </Box>
      )}

      {p.requests.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>
            {p.requests.length === 1 ? "בקשה אחת ממתינה" : `${p.requests.length} בקשות ממתינות`}
          </Typography>
          {p.requests.map((request) => (
            <RequestRow key={request.id} request={request} busy={p.busy} onApprove={p.approve} onReject={p.reject} />
          ))}
        </Box>
      )}

      <ConfirmingDeletionDialog
        open={p.confirmReplace}
        onClose={p.cancelReplace}
        onConfirm={p.replaceCode}
        title="קוד חדש"
        confirmLabel="יצירת קוד חדש"
        message="הקוד הנוכחי יפסיק לעבוד מיד, גם אצל מי שכבר קיבל אותו. בקשות שכבר נשלחו נשארות."
      />
    </Paper>
  );
};

export default JoinCodePanel;
