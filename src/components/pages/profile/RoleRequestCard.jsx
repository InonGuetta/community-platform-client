import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { roles, roleLabels } from "../../../utilities/constant";
import { useRoleRequest } from "./useRoleRequest";
import { useTranslation } from "react-i18next";

// Asking to become a lecturer or an admin, from inside the account.
//
// This is not a convenience duplicate of the signup picker — it is the ONLY path
// for two real cases:
//
//   * A Google sign-in never sees the signup form. The OAuth callback returns
//     straight into the app, so without this screen a Google account could never
//     request anything, permanently.
//   * A student who has been here for two years and is now giving a shiur.
//
// It writes to the same columns and lands in the same admin queue, so there is
// one approval flow rather than two.

const REQUESTABLE = [roles.lecturer, roles.admin];

const RoleRequestCard = () => {
  const { t } = useTranslation("profile");
  const { user, choice, setChoice, submitting, submit } = useRoleRequest();

  // An admin has nothing to ask for. Asking for a LESSER role is a demotion and
  // the server refuses it here — role reduction is an admin action on the users
  // tab — so the card is hidden rather than shown with a button that 400s.
  if (!user || user.role === roles.admin) return null;

  const status = user.approval_status;

  if (status === "pending") {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {t("role.title")}
          </Typography>
          <Alert severity="info">
            {t("role.pending", { role: roleLabels[user.requested_role] || user.requested_role })}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // A lecturer may still ask to be an admin, so the card stays — with the role
  // they already hold removed from the choices, since the server refuses it.
  const options = REQUESTABLE.filter((role) => role !== user.role);

  return (
    <Card>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          {t("role.title")}
        </Typography>

        {/* The previous answer, with the reason the admin gave. Shown before the
            form rather than after: somebody who was declined needs to know that
            before deciding whether to ask again, and the reason is usually what
            they have to act on first. */}
        {status === "rejected" && (
          <Alert severity="warning">
            {user.rejection_reason
              ? t("role.rejectedReason", { role: roleLabels[user.requested_role] || user.requested_role, reason: user.rejection_reason })
              : t("role.rejected", { role: roleLabels[user.requested_role] || user.requested_role })}
            {" "}{t("role.tryAgainLater")}
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          {t("role.current", { role: roleLabels[user.role] || user.role })}
        </Typography>

        <ToggleButtonGroup
          value={choice}
          exclusive
          size="small"
          // `|| choice` keeps a selection: clicking the active button would
          // otherwise deselect it and submit nothing.
          onChange={(_, next) => setChoice(next || choice)}
        >
          {options.map((role) => (
            <ToggleButton key={role} value={role}>{roleLabels[role]}</ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Box>
          <Button variant="contained" onClick={submit} disabled={submitting}>
            {t("role.send")}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RoleRequestCard;
