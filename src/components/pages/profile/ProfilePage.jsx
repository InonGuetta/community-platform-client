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
import { roleLabels } from "../../../utilities/constant";
import RoleRequestCard from "./RoleRequestCard";
import { useProfilePageController, MIN_PASSWORD_LENGTH } from "./useProfilePageController";

// The user's own account, which nobody could edit before this — an admin could
// change anyone's display name and nobody could change their own.
//
// Two cards rather than one form, because they are two different acts with two
// different risks: renaming yourself is reversible and costs nothing, while
// changing a password ends every other session you have open. Putting them in
// one Save button would mean one of those happening as a side effect of the
// other.

const ProfilePage = () => {
  const {
    confirm,
    currentPassword,
    displayName,
    handleChangePassword,
    handleSaveProfile,
    nameChanged,
    newPassword,
    passwordError,
    passwordMismatch,
    passwordTooShort,
    savingPassword,
    savingProfile,
    setConfirm,
    setCurrentPassword,
    setDisplayName,
    setNewPassword,
    user,
  } = useProfilePageController();
  if (!user) return null;

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
              // users.display_name is VARCHAR(100) — DISPLAY_NAME_MAX on the server.
              inputProps={{ maxLength: 100 }}
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

        {/* Between the profile and the password, because it is about WHO the
            account is rather than how it is secured. Renders nothing for an
            admin, who has nothing left to ask for. */}
        <RoleRequestCard />

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
