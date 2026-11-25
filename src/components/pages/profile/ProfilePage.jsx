import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import PageHeader from "../../features/PageHeader/PageHeader";
import SectionCard from "../../features/SectionCard/SectionCard";
import StatusBadge from "../../features/StatusBadge/StatusBadge";
import VerifiedIcon from "@mui/icons-material/Verified";
import { roleLabels } from "../../../utilities/constant";
import RoleRequestCard from "./RoleRequestCard";
import NotificationPreferencesCard from "./NotificationPreferencesCard";
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
    <Box>
      <PageHeader title={t("title")} />
      <Box sx={{ display: "grid", gap: 3 }}>
        <SectionCard>
          {/* The picture, the means to upload, change or remove it, and — beside
              it — who the account is. The email is shown and NOT editable:
              changing an address is a re-verification flow, not a profile
              edit, and offering it as a text field would promise something
              this screen cannot do. */}
          <AvatarEditor
            size={112}
            details={
              <Box sx={{ minWidth: 0 }}>
                {/* The name above the address (UI_UX_FIXES 3.12). */}
                {user.display_name && (
                  <Typography dir="auto" sx={{ fontSize: 22, fontWeight: 800, overflowWrap: "anywhere" }}>
                    {user.display_name}
                  </Typography>
                )}
                <Typography sx={{ fontSize: user.display_name ? 15 : 18, fontWeight: user.display_name ? 500 : 700, color: user.display_name ? "text.secondary" : "text.primary", wordBreak: "break-all" }}>{user.email}</Typography>
                <Box sx={{ display: "flex", gap: 1, mt: 1, flexWrap: "wrap" }}>
                  <StatusBadge tone="indigo">{roleLabels[user.role] ?? user.role}</StatusBadge>
                  {user.email_verified ? (
                    <StatusBadge tone="success" icon={<VerifiedIcon />}>{t("verified")}</StatusBadge>
                  ) : (
                    <StatusBadge tone="warning">{t("unverified")}</StatusBadge>
                  )}
                </Box>
              </Box>
            }
          />
        </SectionCard>
        {/* Two cards rather than one form for the name and the password, because
            they are two different acts with two different risks: renaming
            yourself is reversible and costs nothing, while changing a password
            ends every other session you have open. */}
        <SectionCard>
          <Box component="form" onSubmit={handleSaveProfile} sx={{ display: "flex", gap: 2, alignItems: "flex-end", flexWrap: "wrap" }}>
            <TextField
              label={t("displayName")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              // users.display_name is VARCHAR(100) — DISPLAY_NAME_MAX on the server.
              inputProps={{ maxLength: 100 }}
              sx={{ flex: "1 1 260px" }}
            />
            <Button type="submit" variant="contained" disabled={!nameChanged || savingProfile} sx={{ minHeight: 48 }}>
              {savingProfile ? <CircularProgress size={20} /> : t("save")}
            </Button>
          </Box>
          {/* The interface's language, saved to the account — so the mail the
              server writes is in it too. */}
          <Box sx={{ mt: 3 }}>
            <LanguageSwitcher variant="field" />
          </Box>
        </SectionCard>
        {/* Between the profile and the password, because it is about WHO the
            account is rather than how it is secured. Renders nothing for an
            admin, who has nothing left to ask for. */}
        <RoleRequestCard />
        {/* A mobile number for SMS (AUTH-13), just above the choices it enables. */}
        <PhoneCard />
        {/* NOTIF-6 — the place every notification mail's footer points back to. */}
        <NotificationPreferencesCard />
        <SectionCard title={t("password.title")}>
          <Box component="form" onSubmit={handleChangePassword} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {passwordError && <Alert severity="error">{passwordError}</Alert>}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: 2 }}>
              <TextField
                label={t("password.current")}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                fullWidth
                helperText=" "
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
            </Box>
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
              sx={{ alignSelf: "flex-start" }}
            >
              {savingPassword ? <CircularProgress size={20} /> : t("password.submit")}
            </Button>
          </Box>
        </SectionCard>
      </Box>
    </Box>
  );
};

export default ProfilePage;
