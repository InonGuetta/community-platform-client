import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import useEmailPreferences from "./useEmailPreferences";

// "התראות במייל" (PRD NOTIF-6). The bell is not here: it is the record of what
// happened and has no switch. What a person chooses is which of it ALSO arrives
// by mail — and every one of those mails carries a link back to this choice.
//
// Keyed by the server's category names; a category the server adds before this
// client knows it is still shown, under its key, rather than hidden.
const CATEGORY_TEXT = {
  sessions: {
    label: "מפגשים חיים",
    help: "כשמרצה שלך קובע מפגש, רבע שעה לפני שהוא מתחיל, וכשהוא מתחיל",
  },
  new_lessons: {
    label: "שיעורים חדשים",
    help: "כששיעור חדש מתפרסם באחד הקורסים שלך",
  },
  processing: {
    label: "עיבוד השיעורים שהעלית",
    help: "כשהתמלול והסיכום מוכנים, או כשהעיבוד נכשל",
  },
  role_requests: {
    label: "בקשות הרשאה",
    help: "כשמשתמש מבקש להיות מרצה או מנהל",
  },
  join_requests: {
    label: "בקשות הצטרפות לקורסים שלך",
    help: "כשמישהו מזין את קוד ההצטרפות של קורס שאתה מלמד",
  },
  enrolments: {
    label: "תשובות לבקשות הצטרפות",
    help: "כשהמרצה מאשר או דוחה את הבקשה שלך להצטרף לקורס",
  },
};

const EmailPreferencesCard = () => {
  const { categories, allOff, status, handleToggle, handleRestoreAll } = useEmailPreferences();

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography variant="h6" fontWeight={700}>התראות במייל</Typography>
        <Typography variant="body2" color="text.secondary">
          כל ההתראות מופיעות בפעמון שבראש הדף. כאן בוחרים אילו מהן יגיעו גם במייל.
        </Typography>

        {status === "failed" && <Alert severity="error">לא ניתן לטעון את ההעדפות כרגע.</Alert>}

        {allOff && (
          // The button inside the message rather than in Alert's `action` slot:
          // that slot is pushed aside with a physical margin, which in this RTL
          // layout left the button touching the last word of the sentence.
          <Alert severity="info">
            <Box>ביקשת להפסיק את כל המיילים מהפלטפורמה.</Box>
            <Button color="inherit" size="small" variant="outlined" onClick={handleRestoreAll} sx={{ mt: 1 }}>
              החזרת המיילים
            </Button>
          </Alert>
        )}

        {status === "ready" && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, opacity: allOff ? 0.5 : 1 }}>
            {categories.map(({ key, email }) => {
              const text = CATEGORY_TEXT[key] ?? { label: key, help: "" };
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
                  />
                  {text.help && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", ms: 6.5, mt: -0.75 }}>
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
