import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import VerifiedIcon from "@mui/icons-material/Verified";
import { roleLabels } from "../../../utilities/constant";
import RoleRequestCard from "./RoleRequestCard";
import EmailPreferencesCard from "./EmailPreferencesCard";
import PhoneCard from "./PhoneCard";
import LanguageSwitcher from "../../layout/LanguageSwitcher";
import AvatarEditor from "../../features/Avatar/AvatarEditor";
import { useProfilePageController, MIN_PASSWORD_LENGTH } from "./useProfilePageController";
import { useTranslation } from "react-i18next";

// The user's own account, which nobody could edit before this — an admin could
// change anyone's display name and nobody could change their own.
//
// Two cards rather than one form, because they are two different acts with two
// different risks: renaming yourself is reversible and costs nothing, while
// changing a password ends every other session you have open. Putting them in
// one Save button would mean one of those happening as a side effect of the
// other.

const ProfilePage = () => {
  const { t } = useTranslation("profile");
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
      {/* The title and the cards share one centred column, so the heading sits
          over the cards rather than at the page's edge. */}
      <Box sx={{ maxWidth: 640, mx: "auto" }}>
      <Typography variant="h4" fontWeight={800} color="primary" sx={{ mb: 3 }}>{t("title")}</Typography>

      <Box sx={{ display: "grid", gap: 3 }}>
        <Card sx={{ borderRadius: 2 }}>
          <CardContent component="form" onSubmit={handleSaveProfile} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* The picture, and the means to upload, change or remove it. */}
            <AvatarEditor />

            <Box sx={{ minWidth: 0 }}>
              {/* The email is shown and NOT editable. Changing an address is a
                  re-verification flow, not a profile edit, and offering it as a
                  text field would promise something this screen cannot do. */}
              <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{user.email}</Typography>
              <Box sx={{ display: "flex", gap: 0.5, mt: 0.5, flexWrap: "wrap" }}>
                <Chip size="small" label={roleLabels[user.role] ?? user.role} />
                {user.email_verified ? (
                  <Chip size="small" color="success" variant="outlined" icon={<VerifiedIcon />} label={t("verified")} />
                ) : (
                  <Chip size="small" color="warning" variant="outlined" label={t("unverified")} />
                )}
              </Box>
            </Box>

            <Divider />

            <TextField
              label={t("displayName")}
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
              {savingProfile ? <CircularProgress size={20} /> : t("save")}
            </Button>
          </CardContent>
        </Card>

        {/* The interface's language, saved to the account — so the mail the
            server writes is in it too. */}
        <Card sx={{ borderRadius: 2 }}>
          <CardContent>
            <LanguageSwitcher variant="field" />
          </CardContent>
        </Card>

        {/* Between the profile and the password, because it is about WHO the
            account is rather than how it is secured. Renders nothing for an
            admin, who has nothing left to ask for. */}
        <RoleRequestCard />

        {/* A mobile number for SMS (AUTH-13), just above the choices it enables. */}
        <PhoneCard />

        {/* NOTIF-6 — the place every notification mail's footer points back to. */}
        <EmailPreferencesCard />

        <Card sx={{ borderRadius: 2 }}>
          <CardContent component="form" onSubmit={handleChangePassword} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" fontWeight={700}>{t("password.title")}</Typography>

            {passwordError && <Alert severity="error">{passwordError}</Alert>}

            <TextField
              label={t("password.current")}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
            />
            <TextField
              label={t("password.new")}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              fullWidth
              error={passwordTooShort}
              helperText={passwordTooShort ? t("password.minLength", { n: MIN_PASSWORD_LENGTH }) : " "}
            />
            <TextField
              label={t("password.confirm")}
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              fullWidth
              error={passwordMismatch}
              helperText={passwordMismatch ? t("password.mismatch") : " "}
            />

            <Typography variant="caption" color="text.secondary">
              {t("password.signsOutOthers")}
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
              {savingPassword ? <CircularProgress size={20} /> : t("password.submit")}
            </Button>
          </CardContent>
        </Card>
      </Box>
      </Box>
    </Box>
  );
};

export default ProfilePage;
