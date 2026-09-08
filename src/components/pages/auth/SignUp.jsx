import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import InputAdornment from "@mui/material/InputAdornment";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import { register } from "../../../store/slicesAndThunks/authSlices/authPost";
import { authApi } from "../../../api/authApi";
import { clearError } from "../../../store/slicesAndThunks/authSlices/authSlice";
import { selectLoginStatus, selectAuthError } from "../../../store/selectors/authSelectors";
import { hebrewForError } from "../../../utilities/apiError";
import { emailProblem } from "../../../utilities/emailShape";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { statuses, roles, roleLabels } from "../../../utilities/constant";
import AuthLayout from "./AuthLayout";
import { GoogleIcon, EyeIcon, EyeCrossedIcon, floatingLabelSx, inputBaseSx, submitButtonSx, googleButtonSx, dividerSx } from "./authShared";

// See SignIn: never fall back to the server's English message.
const FALLBACK = "ההרשמה נכשלה. נסה שוב.";

const SignUp = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loginStatus = useSelector(selectLoginStatus);
  const error = useSelector(selectAuthError);
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
  // "חסרה סיומת בדומיין" appears on every keystroke otherwise, and an error that
  // is wrong until you finish is an error people learn to ignore.
  const [emailTouched, setEmailTouched] = useState(false);
  const emailError = emailTouched ? emailProblem(form.email) : null;

  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Checked again here, because a form can be submitted with Enter without the
    // field ever losing focus. The server checks it a third time — this only
    // saves the round trip.
    setEmailTouched(true);
    if (emailProblem(form.email)) return;
    const result = await dispatch(register(form));
    if (result.meta.requestStatus === "fulfilled") navigate("/archive");
  };

  const isSubmitting = loginStatus === statuses.loading;

  return (
    <AuthLayout title="הרשמה">
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{hebrewForError(error, FALLBACK)}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
        {/* Exclusive by construction — ToggleButtonGroup with `exclusive`, so
            "choose exactly one" is the control's own behaviour rather than
            something the handler has to enforce. `|| prev` keeps a selection:
            clicking the active button would otherwise deselect it and submit
            with nothing chosen. */}
        <Box>
          <Typography variant="body2" sx={{ mb: 1, color: "text.secondary" }}>
            אני נרשם כ־
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
              הרשמה כ{roleLabels[form.requestedRole]} טעונה אישור מנהל. עד לאישור
              החשבון ייפתח עם הרשאות תלמיד.
            </Alert>
          )}
        </Box>
        <TextField
          label="שם תצוגה"
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
          label="אימייל"
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
          label="סיסמה"
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
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"} sx={{ p: 0.5 }}>
                  {showPassword ? <EyeIcon /> : <EyeCrossedIcon />}
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={isSubmitting} sx={submitButtonSx}>
          {isSubmitting ? "..." : "הרשמה"}
        </Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
        <Divider sx={dividerSx} />
        <Typography sx={{ mx: 2, color: "#6e6e6e", fontSize: "0.8rem" }}>או</Typography>
        <Divider sx={dividerSx} />
      </Box>

      <Button variant="outlined" fullWidth startIcon={<GoogleIcon />}
        onClick={() => { window.location.href = authApi.googleLoginUrl; }}
        sx={googleButtonSx}
      >
        הרשמה עם Google
      </Button>

      <Typography textAlign="center" mt={4} variant="body2" color="#757575">
        כבר יש לך חשבון?{" "}
        <Link to="/sign-in" style={{ color: "#424242", fontWeight: 500, textDecoration: "none" }}>התחברות</Link>
      </Typography>
    </AuthLayout>
  );
};

export default SignUp;
