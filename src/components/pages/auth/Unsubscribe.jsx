import { useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import AuthLayout from "./AuthLayout";
import { notificationsApi } from "../../../api/notificationsApi";

// Where the "הפסקת מיילים מסוג זה" link at the foot of every notification mail
// lands (PRD NOTIF-6).
//
// Reachable without a session, like VerifyEmail: it is followed from an inbox,
// often on a phone that has never signed in here. The token in the address is
// the whole credential, and the server is what checks it.
//
// Unlike VerifyEmail it does NOT act on arrival. It asks. The mail links here
// rather than to the API so that nothing happens on a bare GET, and a page that
// unsubscribed the moment it rendered would only move that problem one step.

// What each category is called on this page — the same names as the profile's
// switches.
const CATEGORY_NAMES = {
  sessions: "מפגשים חיים",
  new_lessons: "שיעורים חדשים",
  processing: "עיבוד השיעורים שהעלית",
  role_requests: "בקשות הרשאה",
  join_requests: "בקשות הצטרפות לקורסים שלך",
  enrolments: "תשובות לבקשות הצטרפות",
};

// The category the link names, read from the token's payload so the question
// can say what it is about. Display only: nothing is trusted from it, and a
// token that does not decode simply gets the generic wording.
export const categoryInToken = (token) => {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(part)).cat ?? null;
  } catch {
    return null;
  }
};

const Unsubscribe = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const named = CATEGORY_NAMES[categoryInToken(token)];
  const [state, setState] = useState({ status: token ? "asking" : "error", done: null });

  const handleUnsubscribe = async (all) => {
    setState({ status: "working", done: null });
    try {
      const { category } = await notificationsApi.unsubscribe(token, { all });
      setState({ status: "done", done: category });
    } catch {
      setState({ status: "error", done: null });
    }
  };

  if (state.status === "error") {
    return (
      <AuthLayout title="הקישור אינו תקין">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="error">
            הקישור חסר או פגום. אפשר לבחור אילו מיילים לקבל גם מתוך עמוד החשבון.
          </Alert>
          <Link component={RouterLink} to="/profile" underline="hover">לעמוד החשבון</Link>
        </Box>
      </AuthLayout>
    );
  }

  if (state.status === "done") {
    return (
      <AuthLayout title="המיילים הופסקו">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="success">
            {state.done === "all"
              ? "לא יישלחו אליך יותר מיילים מהפלטפורמה."
              : `לא יישלחו אליך יותר מיילים על ${CATEGORY_NAMES[state.done] ?? "סוג זה"}.`}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            ההתראות ימשיכו להופיע בפעמון באפליקציה. אפשר להחזיר את המיילים בכל עת מעמוד החשבון.
          </Typography>
          <Link component={RouterLink} to="/profile" underline="hover">לעמוד החשבון</Link>
        </Box>
      </AuthLayout>
    );
  }

  const working = state.status === "working";
  return (
    <AuthLayout title="הפסקת מיילים">
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography>
          {named ? `להפסיק לשלוח לך מיילים על ${named}?` : "להפסיק לשלוח לך מיילים מסוג זה?"}
        </Typography>
        <Button variant="contained" onClick={() => handleUnsubscribe(false)} disabled={working}>
          הפסקת מיילים מסוג זה
        </Button>
        <Button variant="text" onClick={() => handleUnsubscribe(true)} disabled={working}>
          הפסקת כל המיילים מהפלטפורמה
        </Button>
      </Box>
    </AuthLayout>
  );
};

export default Unsubscribe;
