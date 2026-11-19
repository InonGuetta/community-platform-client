import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import AuthLayout from "./AuthLayout";
import { AuthFootnote, AuthLink } from "./authShared";
import { notificationsApi } from "../../../api/notificationsApi";
import { categoryLabel } from "../../../utilities/notificationCategories";
import { useTranslation } from "react-i18next";

// Where the "stop this kind of mail" link at the foot of every notification mail
// lands (PRD NOTIF-6).
//
// Reachable without a session, like VerifyEmail: it is followed from an inbox,
// often on a phone that has never signed in here. The token in the address is
// the whole credential, and the server is what checks it.
//
// Unlike VerifyEmail it does NOT act on arrival. It asks. The mail links here
// rather than to the API so that nothing happens on a bare GET, and a page that
// unsubscribed the moment it rendered would only move that problem one step.

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
  const { t } = useTranslation(["auth", "notifications"]);
  const category = categoryInToken(token);
  const named = category ? categoryLabel(category) : null;
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
      <AuthLayout title={t("unsubscribe.badTitle")}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="error">
            {t("unsubscribe.bad")}
          </Alert>
          <AuthFootnote sx={{ mt: 1 }}>
            <AuthLink to="/profile" accent>{t("unsubscribe.toProfile")}</AuthLink>
          </AuthFootnote>
        </Box>
      </AuthLayout>
    );
  }

  if (state.status === "done") {
    return (
      <AuthLayout title={t("unsubscribe.doneTitle")}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="success">
            {state.done === "all"
              ? t("unsubscribe.doneAll")
              : t("unsubscribe.doneOne", { category: (state.done ? categoryLabel(state.done) : t("unsubscribe.thisKind")) })}
          </Alert>
          <Typography variant="body2" color="text.secondary">
            {t("unsubscribe.doneHint")}
          </Typography>
          <AuthFootnote sx={{ mt: 1 }}>
            <AuthLink to="/profile" accent>{t("unsubscribe.toProfile")}</AuthLink>
          </AuthFootnote>
        </Box>
      </AuthLayout>
    );
  }

  const working = state.status === "working";
  return (
    <AuthLayout title={t("unsubscribe.title")}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography>
          {named ? t("unsubscribe.askNamed", { category: named }) : t("unsubscribe.ask")}
        </Typography>
        <Button variant="contained" fullWidth sx={{ minHeight: 48 }} onClick={() => handleUnsubscribe(false)} disabled={working}>
          {t("unsubscribe.stopThis")}
        </Button>
        <Button variant="outlined" fullWidth sx={{ minHeight: 48 }} onClick={() => handleUnsubscribe(true)} disabled={working}>
          {t("unsubscribe.stopAll")}
        </Button>
      </Box>
    </AuthLayout>
  );
};

export default Unsubscribe;
