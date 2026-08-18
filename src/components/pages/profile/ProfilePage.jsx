import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import VerifiedIcon from "@mui/icons-material/Verified";
import { selectUser } from "../../../store/selectors/authSelectors";
import { updateProfile } from "../../../store/slicesAndThunks/authSlices/authPut";
import { changePassword } from "../../../store/slicesAndThunks/authSlices/authPost";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { hebrewForError } from "../../../utilities/apiError";
import { roleLabels } from "../../../utilities/constant";

// The user's own account, which nobody could edit before this — an admin could
// change anyone's display name and nobody could change their own.
//
// Two cards rather than one form, because they are two different acts with two
// different risks: renaming yourself is reversible and costs nothing, while
// changing a password ends every other session you have open. Putting them in
// one Save button would mean one of those happening as a side effect of the
// other.
const MIN_PASSWORD_LENGTH = 8; // mirrors MIN_PASSWORD_LENGTH in servicesAuth.js

const ProfilePage = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);

  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);

  // Seeded from the store rather than held as the store's own value: the field
  // is the user's draft while they type, and it should not be rewritten
  // underneath them by an unrelated refetch.
  useEffect(() => {
    setDisplayName(user?.display_name ?? "");
  }, [user?.display_name]);

  if (!user) return null;

  const nameChanged = displayName.trim() !== (user.display_name ?? "") && displayName.trim().length > 0;

  const handleSaveProfile = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    const result = await dispatch(updateProfile({ displayName: displayName.trim() }));
    setSavingProfile(false);
    dispatch(notify(
      result.meta.requestStatus === "fulfilled"
        ? { message: "הפרטים נשמרו", severity: "success" }
        : { message: hebrewForError(result.payload, "שמירת הפרטים נכשלה"), severity: "error" }
    ));
  };

  const passwordMismatch = confirm.length > 0 && newPassword !== confirm;
  const passwordTooShort = newPassword.length > 0 && newPassword.length < MIN_PASSWORD_LENGTH;

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);
    const result = await dispatch(changePassword({ currentPassword, newPassword }));
    setSavingPassword(false);

    if (result.meta.requestStatus === "fulfilled") {
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      dispatch(notify({ message: "הסיסמה שונתה", severity: "success" }));
      return;
    }
    // Shown inline rather than as a toast: it is almost always "the current
    // password is wrong", which is about the field directly above it.
    setPasswordError(hebrewForError(result.payload, "שינוי הסיסמה נכשל"));
  };

  return (
    <Box sx={{ p: 3, bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Typography variant="h4" fontWeight={800} color="primary" sx={{ mb: 3 }}>החשבון שלי</Typography>

      <Box sx={{ display: "grid", gap: 3, maxWidth: 640 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent component="form" onSubmit={handleSaveProfile} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar src={user.avatar_url || undefined} sx={{ width: 56, height: 56 }}>
                {(user.display_name || user.email || "?").charAt(0)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                {/* The email is shown and NOT editable. Changing an address is a
                    re-verification flow, not a profile edit, and offering it as a
                    text field would promise something this screen cannot do. */}
                <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{user.email}</Typography>
                <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                  <Chip size="small" label={roleLabels[user.role] ?? user.role} />
                  {user.email_verified ? (
                    <Chip size="small" color="success" variant="outlined" icon={<VerifiedIcon />} label="כתובת מאומתת" />
                  ) : (
                    <Chip size="small" color="warning" variant="outlined" label="כתובת לא אומתה" />
                  )}
                </Box>
              </Box>
            </Box>

            <Divider />

            <TextField
              label="שם תצוגה"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              inputProps={{ maxLength: 120 }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={!nameChanged || savingProfile}
              sx={{ alignSelf: "flex-start", borderRadius: 2, fontWeight: 700 }}
            >
              {savingProfile ? <CircularProgress size={20} /> : "שמירה"}
            </Button>
          </CardContent>
        </Card>

        <Card sx={{ borderRadius: 2 }}>
          <CardContent component="form" onSubmit={handleChangePassword} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" fontWeight={700}>שינוי סיסמה</Typography>

            {passwordError && <Alert severity="error">{passwordError}</Alert>}

            <TextField
              label="הסיסמה הנוכחית"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
            />
            <TextField
              label="סיסמה חדשה"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              fullWidth
              error={passwordTooShort}
              helperText={passwordTooShort ? `לפחות ${MIN_PASSWORD_LENGTH} תווים` : " "}
            />
            <TextField
              label="אימות סיסמה חדשה"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              fullWidth
              error={passwordMismatch}
              helperText={passwordMismatch ? "הסיסמאות אינן תואמות" : " "}
            />

            <Typography variant="caption" color="text.secondary">
              שינוי הסיסמה מנתק כל מכשיר אחר שמחובר לחשבון.
            </Typography>

            <Button
              type="submit"
              variant="contained"
              disabled={
                savingPassword || passwordMismatch || passwordTooShort ||
                !currentPassword || !newPassword || !confirm
              }
              sx={{ alignSelf: "flex-start", borderRadius: 2, fontWeight: 700 }}
            >
              {savingPassword ? <CircularProgress size={20} /> : "שינוי סיסמה"}
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default ProfilePage;
