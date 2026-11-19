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
import { formatDate } from "../../../../utilities/formatDate";
import { useTranslation } from "react-i18next";

// "הצטרפות בקוד" in a course's panel (PRD ROST-9). See useJoinCodePanel.

const RequestRow = ({ request, busy, onApprove, onReject }) => {
  const { t } = useTranslation("courses");
  return (
  <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, borderTop: 1, borderColor: "divider", flexWrap: "wrap" }}>
    <Box sx={{ flex: 1, minWidth: 160 }}>
      <Typography fontWeight={600}>{request.display_name || request.email}</Typography>
      <Typography variant="body2" color="text.secondary">
        {request.display_name ? `${request.email} · ` : ""}{t("joinCode.requestedOn", { date: formatDate(request.created_at) })}
      </Typography>
    </Box>
    <Button size="small" variant="contained" color="success" disabled={busy} onClick={() => onApprove(request.id)}>
      {t("joinCode.approve")}
    </Button>
    <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => onReject(request.id)}>
      {t("joinCode.reject")}
    </Button>
  </Box>
  );
};

const JoinCodePanel = ({ course }) => {
  const { t } = useTranslation("courses");
  const p = useJoinCodePanel(course);

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <KeyIcon color="primary" fontSize="small" />
        <Typography fontWeight={700}>{t("joinCode.title")}</Typography>
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
            <Tooltip title={t("joinCode.copy")}>
              <IconButton onClick={p.copyCode} aria-label={t("joinCode.copy")}><ContentCopyIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Button size="small" variant="outlined" endIcon={<LinkIcon />} onClick={p.copyLink}>{t("joinCode.copyLink")}</Button>
            <Box sx={{ flex: 1 }} />
            <Button size="small" disabled={p.busy} onClick={p.askReplace}>{t("joinCode.newCode")}</Button>
            <Button size="small" color="error" disabled={p.busy} onClick={p.removeCode}>{t("joinCode.remove")}</Button>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t("joinCode.howItWorks")}
          </Typography>
        </>
      ) : (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 220 }}>
            {t("joinCode.pitch")}
          </Typography>
          <Button variant="contained" size="small" disabled={p.busy} onClick={p.createCode}>{t("joinCode.create")}</Button>
        </Box>
      )}

      {p.requests.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 0.5 }}>
            {t("joinCode.pending", { count: p.requests.length })}
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
        title={t("joinCode.newCode")}
        confirmLabel={t("joinCode.replaceConfirm")}
        message={t("joinCode.replaceWarning")}
      />
    </Paper>
  );
};

export default JoinCodePanel;
