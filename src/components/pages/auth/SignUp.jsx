import { useState } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import { register } from "../../../store/slicesAndThunks/authSlice/authPost";
import { messageForError } from "../../../utilities/apiError";
import { emailProblem } from "../../../utilities/emailShape";
import Typography from "@mui/material/Typography";
import SegmentedControl from "../../features/SegmentedControl/SegmentedControl";
import { roles, roleLabels } from "../../../utilities/constant";
import AuthLayout from "./AuthLayout";
import { EyeIcon, EyeCrossedIcon, OrDivider, AuthFootnote, AuthLink } from "./authShared";
import SocialSignIn from "./SocialSignIn";
import { useAuthSubmit } from "./useAuthSubmit";
import { useTranslation } from "react-i18next";

const SignUp = () => {
  const { t } = useTranslation("auth");
  const { error, isSubmitting, submit } = useAuthSubmit(register);
  // requestedRole, not role — this is an APPLICATION. The server creates every
  // account as a student whatever is sent here and stores the request separately;
  // lecturer and admin only take effect once an admin approves.
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    requestedRole: roles.student,
  });
  const [showPassword, setShowPassword] = useState(false);
  // Shown only after the field has been left, not while it is being typed in:
  // a missing-domain error appears on every keystroke otherwise, and an error that
  // is wrong until you finish is an error people learn to ignore.
  const [emailTouched, setEmailTouched] = useState(false);
  const emailError = emailTouched ? emailProblem(form.email) : null;

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Checked again here, because a form can be submitted with Enter without the
    // field ever losing focus. The server checks it a third time — this only
    // saves the round trip.
    setEmailTouched(true);
    if (emailProblem(form.email)) return;
    await submit(form);
  };

  return (
    <AuthLayout title={t("signUp.title")}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{messageForError(error, t("signUp.failed"))}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* One choice, always one: SegmentedControl will not deselect the chosen
            option, so submitting with nothing chosen cannot happen. The options
            are buttons with aria-pressed, found by the role's name. */}
        <Box>
          <Typography sx={{ mb: 1, fontSize: 13, fontWeight: 600, color: "text.secondary" }}>
            {t("signUp.registeringAs")}
          </Typography>
          <SegmentedControl
            fullWidth
            label={t("signUp.registeringAs")}
            value={form.requestedRole}
            onChange={(next) => setForm((prev) => ({ ...prev, requestedRole: next }))}
            options={[roles.student, roles.lecturer, roles.admin].map((role) => ({ value: role, label: roleLabels[role] }))}
          />
          {/* Said before submitting, not after. Somebody who picks "מרצה" and is
              then dropped into a student view with no explanation reads it as a
              bug in the signup rather than as a step that is still pending. */}
          {form.requestedRole !== roles.student && (
            <Alert severity="info" sx={{ mt: 1.5 }}>
              {t("signUp.needsApproval", { role: roleLabels[form.requestedRole] })}
            </Alert>
          )}
        </Box>
        <TextField
          label={t("fields.displayName")}
          name="displayName"
          value={form.displayName}
          onChange={handleChange}
          required
          fullWidth
        />

        <TextField
          label={t("fields.email")}
          name="email"
          type="email"
          value={form.email}
          onChange={handleChange}
          onBlur={() => setEmailTouched(true)}
          error={Boolean(emailError)}
          helperText={emailError || " "}
          required
          fullWidth
        />

        <TextField
          label={t("fields.password")}
          name="password"
          type={showPassword ? "text" : "password"}
          value={form.password}
          onChange={handleChange}
          required
          fullWidth
          InputProps={{
            endAdornment: form.password ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? t("fields.hidePassword") : t("fields.showPassword")} sx={{ p: 0.5 }}>
                  {showPassword ? <EyeIcon /> : <EyeCrossedIcon />}
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={{ minHeight: 48, mt: 1 }}>
          {isSubmitting ? "..." : t("signUp.submit")}
        </Button>
      </Box>

      <OrDivider>{t("or")}</OrDivider>

      <SocialSignIn mode="signUp" />

      <AuthFootnote>
        {t("signUp.hasAccount")}{" "}
        <AuthLink to="/sign-in">{t("signUp.toSignIn")}</AuthLink>
      </AuthFootnote>
    </AuthLayout>
  );
};

export default SignUp;
