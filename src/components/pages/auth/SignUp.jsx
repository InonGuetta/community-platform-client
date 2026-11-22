import { useState } from "react";
import { Link } from "react-router-dom";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import { register } from "../../../store/slicesAndThunks/authSlice/authPost";
import { messageForError } from "../../../utilities/apiError";
import { emailProblem } from "../../../utilities/emailShape";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { roles, roleLabels } from "../../../utilities/constant";
import AuthLayout from "./AuthLayout";
import { EyeIcon, EyeCrossedIcon, floatingLabelSx, inputBaseSx, submitButtonSx, dividerSx } from "./authShared";
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
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{messageForError(error, t("signUp.failed"))}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
        {/* Exclusive by construction — ToggleButtonGroup with `exclusive`, so
            "choose exactly one" is the control's own behaviour rather than
            something the handler has to enforce. `|| prev` keeps a selection:
            clicking the active button would otherwise deselect it and submit
            with nothing chosen. */}
        <Box>
          <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
            {t("signUp.registeringAs")}
          </Typography>
          <ToggleButtonGroup
            value={form.requestedRole}
            exclusive
            fullWidth
            onChange={(_, next) =>
              setForm((prev) => ({ ...prev, requestedRole: next || prev.requestedRole }))
            }
            size="small"
          >
            {[roles.student, roles.lecturer, roles.admin].map((role) => (
              <ToggleButton key={role} value={role}>{roleLabels[role]}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          {/* Said before submitting, not after. Somebody who picks "מרצה" and is
              then dropped into a student view with no explanation reads it as a
              bug in the signup rather than as a step that is still pending. */}
          {form.requestedRole !== roles.student && (
            <Alert severity="info" sx={{ mt: 1.5, borderRadius: 2 }}>
              {t("signUp.needsApproval", { role: roleLabels[form.requestedRole] })}
            </Alert>
          )}
        </Box>
        <TextField
          label={t("fields.displayName")}
          name="displayName"
          variant="standard"
          value={form.displayName}
          onChange={handleChange}
          required
          fullWidth
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
          InputLabelProps={{ required: !form.displayName }}
        />

        <TextField
          label={t("fields.email")}
          name="email"
          type="email"
          variant="standard"
          value={form.email}
          onChange={handleChange}
          onBlur={() => setEmailTouched(true)}
          error={Boolean(emailError)}
          helperText={emailError || " "}
          required
          fullWidth
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
          InputLabelProps={{ required: !form.email }}
        />

        <TextField
          label={t("fields.password")}
          name="password"
          type={showPassword ? "text" : "password"}
          variant="standard"
          value={form.password}
          onChange={handleChange}
          required
          fullWidth
          sx={floatingLabelSx}
          InputLabelProps={{ required: !form.password }}
          InputProps={{
            ...inputBaseSx,
            endAdornment: form.password ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? t("fields.hidePassword") : t("fields.showPassword")} sx={{ p: 0.5 }}>
                  {showPassword ? <EyeIcon /> : <EyeCrossedIcon />}
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={submitButtonSx}>
          {isSubmitting ? "..." : t("signUp.submit")}
        </Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
        <Divider sx={dividerSx} />
        <Typography sx={{ mx: 2, color: "#6e6e6e", fontSize: "0.8rem" }}>{t("or")}</Typography>
        <Divider sx={dividerSx} />
      </Box>

      <SocialSignIn mode="signUp" />

      <Typography textAlign="center" mt={4} variant="body2" color="#757575">
        {t("signUp.hasAccount")}{" "}
        <Link to="/sign-in" style={{ color: "#424242", fontWeight: 500, textDecoration: "none" }}>{t("signUp.toSignIn")}</Link>
      </Typography>
    </AuthLayout>
  );
};

export default SignUp;
