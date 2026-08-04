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
import { login } from "../../../store/slicesAndThunks/authSlices/authPost";
import { authApi } from "../../../api/authApi";
import { clearError } from "../../../store/slicesAndThunks/authSlices/authSlice";
import { selectLoginStatus, selectAuthError } from "../../../store/selectors/authSelectors";
import { statuses } from "../../../utilities/constant";
import AuthLayout from "./AuthLayout";
import { GoogleIcon, EyeIcon, EyeCrossedIcon, floatingLabelSx, inputBaseSx, submitButtonSx, googleButtonSx, dividerSx } from "./authShared";

const SignIn = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const loginStatus = useSelector(selectLoginStatus);
  const error = useSelector(selectAuthError);
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => { dispatch(clearError()); }, [dispatch]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(login(form));
    if (result.meta.requestStatus === "fulfilled") navigate("/archive");
  };

  const isSubmitting = loginStatus === statuses.loading;

  return (
    <AuthLayout title="התחברות">
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
        <TextField
          label="אימייל"
          name="email"
          type="email"
          variant="standard"
          value={form.email}
          onChange={handleChange}
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
          {isSubmitting ? "..." : "התחברות"}
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
        התחברות עם Google
      </Button>

      <Typography textAlign="center" mt={4} variant="body2" color="#757575">
        אין לך חשבון?{" "}
        <Link to="/sign-up" style={{ color: "#424242", fontWeight: 500, textDecoration: "none" }}>הרשמה</Link>
      </Typography>
    </AuthLayout>
  );
};

export default SignIn;
