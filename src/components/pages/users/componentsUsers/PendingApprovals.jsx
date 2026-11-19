import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { roleLabels } from "../../../../utilities/constant";
import { useTranslation } from "react-i18next";

// The people waiting to be told yes or no.
//
// Rendered ABOVE the users table rather than as a column inside it, and that is
// the point of the component: a request is a task, and a task buried as a chip
// in row 40 of a table sorted by signup date is a task nobody does. The section
// disappears entirely when the queue is empty, so the ordinary state of this
// page is unchanged.
//
// Oldest first — it is a queue. The server orders it; this only renders.

const PendingApprovals = ({ pending = [], currentUserId, onApprove, onReject }) => {
  const { t } = useTranslation(["users", "common"]);
  // Which row has its "why" box open. One at a time: two reasons half-typed in
  // two boxes is a way to send the wrong one.
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState("");

  if (pending.length === 0) return null;

  const closeReject = () => {
    setRejecting(null);
    setReason("");
  };

  const confirmReject = (id) => {
    onReject(id, reason.trim());
    closeReject();
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 3, borderColor: "warning.main" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          {t("pending.title")}
        </Typography>
        <Chip label={pending.length} size="small" color="warning" />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {pending.map((user) => {
          // An admin approving their own application is the whole feature
          // defeated. The server refuses it outright; hiding the button here is
          // the courtesy, not the control.
          const isSelf = user.id === currentUserId;

          return (
            <Box
              key={user.id}
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                p: 1.5,
                borderRadius: 1,
                bgcolor: "action.hover",
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {user.display_name || user.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {user.email}
                </Typography>
              </Box>

              <Chip
                label={t("pending.requested", { role: roleLabels[user.requested_role] || user.requested_role })}
                size="small"
                color="primary"
                variant="outlined"
              />

              {rejecting === user.id ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  {/* Optional, and said so: a refusal with no reason is still a
                      valid answer, it just makes a worse email. */}
                  <TextField
                    size="small"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("pending.reasonPlaceholder")}
                    sx={{ minWidth: 240 }}
                    autoFocus
                  />
                  <Button size="small" color="error" variant="contained" onClick={() => confirmReject(user.id)}>
                    {t("pending.sendReject")}
                  </Button>
                  <Button size="small" onClick={closeReject}>{t("common:actions.cancel")}</Button>
                </Box>
              ) : (
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Tooltip title={isSelf ? t("pending.cannotApproveSelf") : ""}>
                    <span>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        disabled={isSelf}
                        onClick={() => onApprove(user.id)}
                      >
                        {t("pending.approve")}
                      </Button>
                    </span>
                  </Tooltip>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<CloseIcon />}
                    disabled={isSelf}
                    onClick={() => setRejecting(user.id)}
                  >
                    {t("pending.reject")}
                  </Button>
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default PendingApprovals;
