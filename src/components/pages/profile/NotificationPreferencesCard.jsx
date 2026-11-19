import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import useNotificationPreferences from "./useNotificationPreferences";
import { categoryLabel, categoryHelp } from "../../../utilities/notificationCategories";
import { useTranslation } from "react-i18next";

// "התראות" (PRD NOTIF-6, AUTH-13). The bell is not here: it is the record of
// what happened and has no switch. What a person chooses is which of it ALSO
// arrives by mail — every mail carries a link back here — and which by SMS.
//
// One row per category: its name and what it covers, then a switch per
// channel. Mail is on until turned off; SMS off until turned on, and only for
// the categories an SMS carries (a dash elsewhere), and only with a verified
// number. Keyed by the server's category names; a category the server adds
// before this client knows it is still shown, under its key, rather than hidden.

const SWITCH_COLUMN = 64;

const NotificationPreferencesCard = () => {
  const { t } = useTranslation(["profile", "notifications"]);
  const { categories, allOff, status, phoneVerified, smsOffered, anySms, handleToggle, handleRestoreAll, handleSmsAllOff } =
    useNotificationPreferences();
  const columns = smsOffered ? `1fr ${SWITCH_COLUMN}px ${SWITCH_COLUMN}px` : `1fr ${SWITCH_COLUMN}px`;

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h6" fontWeight={700}>{t("email.title")}</Typography>
        <Typography variant="body2" color="text.secondary">{t("email.intro")}</Typography>

        {status === "failed" && <Alert severity="error">{t("email.loadFailed")}</Alert>}

        {allOff && (
          // The button inside the message rather than in Alert's `action` slot:
          // that slot is pushed aside with a physical margin, which in this RTL
          // layout left the button touching the last word of the sentence.
          <Alert severity="info">
            <Box>{t("email.allOff")}</Box>
            <Button color="inherit" size="small" variant="outlined" onClick={handleRestoreAll} sx={{ mt: 1 }}>
              {t("email.restore")}
            </Button>
          </Alert>
        )}

        {status === "ready" && smsOffered && !phoneVerified && (
          <Alert severity="info">{t("email.smsNeedsPhone")}</Alert>
        )}

        {status === "ready" && (
          <Box role="table" aria-label={t("email.title")}>
            <Box role="row" sx={{ display: "grid", gridTemplateColumns: columns, alignItems: "end", pb: 0.5, borderBottom: 1, borderColor: "divider" }}>
              <Box role="columnheader" />
              <Typography role="columnheader" variant="caption" fontWeight={700} sx={{ textAlign: "center" }}>{t("email.channelEmail")}</Typography>
              {smsOffered && (
                <Typography role="columnheader" variant="caption" fontWeight={700} sx={{ textAlign: "center" }}>{t("email.channelSms")}</Typography>
              )}
            </Box>
            {categories.map(({ key, email, sms }) => {
              const label = categoryLabel(key);
              const help = categoryHelp(key);
              const emailOn = email && !allOff;
              const smsPossible = sms !== null && sms !== undefined;
              // A category on no channel reads faded, so what is on stands out.
              const on = emailOn || Boolean(sms);
              return (
                <Box
                  key={key}
                  role="row"
                  sx={{ display: "grid", gridTemplateColumns: columns, alignItems: "center", py: 0.75, borderBottom: 1, borderColor: "divider" }}
                >
                  <Box role="rowheader" sx={{ minWidth: 0, paddingInlineEnd: 1 }}>
                    <Typography variant="body2" fontWeight={600} color={on ? "text.primary" : "text.disabled"}>{label}</Typography>
                    {help && (
                      <Typography variant="caption" color={on ? "text.secondary" : "text.disabled"} sx={{ display: "block" }}>{help}</Typography>
                    )}
                  </Box>
                  <Box role="cell" sx={{ display: "flex", justifyContent: "center", opacity: allOff ? 0.5 : 1 }}>
                    <Switch
                      checked={Boolean(emailOn)}
                      disabled={allOff}
                      onChange={(e) => handleToggle(key, "email", e.target.checked)}
                      // MUI renders a bare checkbox; the role makes a screen
                      // reader announce it as the on/off switch it looks like.
                      inputProps={{ role: "switch", "aria-label": t("email.switchEmail", { category: label }) }}
                    />
                  </Box>
                  {smsOffered && (
                    <Box role="cell" sx={{ display: "flex", justifyContent: "center" }}>
                      {smsPossible ? (
                        <Switch
                          checked={Boolean(sms)}
                          disabled={!phoneVerified}
                          onChange={(e) => handleToggle(key, "sms", e.target.checked)}
                          inputProps={{ role: "switch", "aria-label": t("email.switchSms", { category: label }) }}
                        />
                      ) : (
                        <Typography variant="body2" color="text.disabled" aria-label={t("email.noSms")}>—</Typography>
                      )}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        )}

        {status === "ready" && smsOffered && phoneVerified && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="caption" color="text.secondary" sx={{ flex: "1 1 240px" }}>{t("email.quietHours")}</Typography>
            {anySms && <Button size="small" onClick={handleSmsAllOff}>{t("email.smsAllOff")}</Button>}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationPreferencesCard;
