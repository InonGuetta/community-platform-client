import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { requestRole } from "../../../store/slicesAndThunks/authSlices/authPost";
import { selectUser } from "../../../store/selectors/authSelectors";
import { roles, roleLabels } from "../../../utilities/constant";

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
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [choice, setChoice] = useState(roles.lecturer);
  const [submitting, setSubmitting] = useState(false);

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
            בקשת הרשאה
          </Typography>
          <Alert severity="info">
            בקשתך להרשאת {roleLabels[user.requested_role] || user.requested_role} ממתינה
            לאישור מנהל. עד לאישור החשבון פועל עם ההרשאות הנוכחיות.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    setSubmitting(true);
    try {
      await dispatch(requestRole(choice));
    } finally {
      setSubmitting(false);
    }
  };

  // A lecturer may still ask to be an admin, so the card stays — with the role
  // they already hold removed from the choices, since the server refuses it.
  const options = REQUESTABLE.filter((role) => role !== user.role);

  return (
    <Card>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h6" fontWeight={700}>
          בקשת הרשאה
        </Typography>

        {/* The previous answer, with the reason the admin gave. Shown before the
            form rather than after: somebody who was declined needs to know that
            before deciding whether to ask again, and the reason is usually what
            they have to act on first. */}
        {status === "rejected" && (
          <Alert severity="warning">
            בקשתך הקודמת להרשאת {roleLabels[user.requested_role] || user.requested_role} לא
            אושרה.
            {user.rejection_reason ? ` סיבה: ${user.rejection_reason}` : ""}
            {" "}ניתן להגיש בקשה חדשה לאחר שבעה ימים.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          ההרשאה הנוכחית שלך: {roleLabels[user.role] || user.role}. בקשה להרשאה גבוהה
          יותר טעונה אישור של מנהל.
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
            שליחת בקשה
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RoleRequestCard;
