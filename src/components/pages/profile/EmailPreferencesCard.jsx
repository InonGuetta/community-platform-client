import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import useEmailPreferences from "./useEmailPreferences";
import { categoryLabel, categoryHelp } from "../../../utilities/notificationCategories";
import { useTranslation } from "react-i18next";

// "התראות במייל" (PRD NOTIF-6). The bell is not here: it is the record of what
// happened and has no switch. What a person chooses is which of it ALSO arrives
// by mail — and every one of those mails carries a link back to this choice.
//
// Keyed by the server's category names; a category the server adds before this
// client knows it is still shown, under its key, rather than hidden.

const EmailPreferencesCard = () => {
  const { t } = useTranslation(["profile", "notifications"]);
  const { categories, allOff, status, handleToggle, handleRestoreAll } = useEmailPreferences();

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h6" fontWeight={700}>{t("email.title")}</Typography>
        <Typography variant="body2" color="text.secondary">
          {t("email.intro")}
        </Typography>

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

        {status === "ready" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, opacity: allOff ? 0.5 : 1 }}>
            {categories.map(({ key, email }) => {
              const text = { label: categoryLabel(key), help: categoryHelp(key) };
              // A category that is off reads faded, so what is on stands out.
              const on = email && !allOff;
              return (
                <Box key={key}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={email && !allOff}
                        disabled={allOff}
                        onChange={(e) => handleToggle(key, e.target.checked)}
                        // MUI renders a bare checkbox; the role makes a screen
                        // reader announce it as the on/off switch it looks like.
                        inputProps={{ role: "switch" }}
                      />
                    }
                    label={text.label}
                    sx={{ "& .MuiFormControlLabel-label": { color: on ? "text.primary" : "text.disabled" } }}
                  />
                  {text.help && (
                    <Typography variant="caption" color={on ? "text.secondary" : "text.disabled"} sx={{ display: "block", marginInlineStart: 6.5, mt: -0.75 }}>
                      {text.help}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailPreferencesCard;
