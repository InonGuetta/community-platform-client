import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "@mui/material/Link";
import AuthLayout from "./AuthLayout";
import { useForgotPassword } from "./useForgotPassword";
import { floatingLabelSx, inputBaseSx, submitButtonSx } from "./authShared";

// "שכחתי סיסמה" — which until now did not exist, and its absence was the one
// thing on this platform with no workaround at all: a user who forgot their
// password was locked out permanently, since an admin cannot set one either.
//
// The screen deliberately says the SAME thing whether or not the address has an
// account. The server answers identically for that reason, and reproducing the
// difference here — "no such user" — would rebuild the enumeration oracle in the
// UI that the endpoint refuses to be. The sentence is written so it is true
// either way rather than being a comfortable lie in one of them.
const ForgotPassword = () => {
  const { email, setEmail, sent, failed, busy, handleSubmit } = useForgotPassword();

  if (sent) {
    return (
      <AuthLayout title="בדוק את תיבת הדואר">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Alert severity="success">
            אם קיים חשבון עבור {email.trim()}, נשלח אליו קישור לאיפוס הסיסמה.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            הקישור תקף לשעה אחת. אם ההודעה לא הגיעה, כדאי לבדוק גם בתיקיית הספאם.
          </Typography>
          <Link component={RouterLink} to="/sign-in" underline="hover">
            חזרה להתחברות
          </Link>
        </Box>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="איפוס סיסמה">
      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <Typography variant="body2" color="text.secondary">
          הזן את כתובת האימייל של החשבון ונשלח אליה קישור לבחירת סיסמה חדשה.
        </Typography>

        {failed && <Alert severity="error">לא ניתן לשלוח כרגע. נסה שוב בעוד רגע.</Alert>}

        <TextField
          label="אימייל"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          variant="standard"
          fullWidth
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
        />

        <Button type="submit" disabled={busy || !email.trim()} sx={submitButtonSx}>
          {busy ? <CircularProgress size={20} /> : "שלח קישור"}
        </Button>

        <Link component={RouterLink} to="/sign-in" underline="hover" sx={{ alignSelf: "center" }}>
          חזרה להתחברות
        </Link>
      </Box>
    </AuthLayout>
  );
};

export default ForgotPassword;
