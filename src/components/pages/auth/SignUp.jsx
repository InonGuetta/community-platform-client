import { useState } from "react";
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
import { selectAuthStatus, selectAuthError } from "../../../store/selectors/authSelectors";
import { statuses } from "../../../utilities/constant";
import AuthLayout from "./AuthLayout";
import { GoogleIcon, EyeIcon, EyeCrossedIcon, floatingLabelSx, inputBaseSx, submitButtonSx, googleButtonSx, dividerSx } from "./authShared";

const SignUp = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const status = useSelector(selectAuthStatus);
  const error = useSelector(selectAuthError);
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await dispatch(register(form));
    if (result.meta.requestStatus === "fulfilled") navigate("/archive");
  };

  return (
    <AuthLayout title="Sign Up">
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 3.5 }}>
        <TextField
          label="Display Name"
          name="displayName"
          variant="standard"
          value={form.displayName}
          onChange={handleChange}
          required={!form.displayName}
          fullWidth
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          variant="standard"
          value={form.email}
          onChange={handleChange}
          required={!form.email}
          fullWidth
          sx={floatingLabelSx}
          InputProps={inputBaseSx}
        />

        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          variant="standard"
          value={form.password}
          onChange={handleChange}
          required={!form.password}
          fullWidth
          sx={floatingLabelSx}
          InputProps={{
            ...inputBaseSx,
            endAdornment: form.password ? (
              <InputAdornment position="end">
                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ p: 0.5 }}>
                  {showPassword ? <EyeIcon /> : <EyeCrossedIcon />}
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />

        <Button type="submit" variant="contained" fullWidth disabled={status === statuses.loading} sx={submitButtonSx}>
          {status === statuses.loading ? "..." : "SIGN UP"}
        </Button>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", my: 3 }}>
        <Divider sx={dividerSx} />
        <Typography sx={{ mx: 2, color: "#9e9e9e", fontSize: "0.8rem" }}>Or</Typography>
        <Divider sx={dividerSx} />
      </Box>

      <Button variant="outlined" fullWidth startIcon={<GoogleIcon />}
        onClick={() => { window.location.href = "/api/auth/google"; }}
        sx={googleButtonSx}
      >
        Sign up with Google
      </Button>

      <Typography textAlign="center" mt={4} variant="body2" color="#757575">
        Already have an account?{" "}
        <Link to="/sign-in" style={{ color: "#424242", fontWeight: 500, textDecoration: "none" }}>Sign In</Link>
      </Typography>
    </AuthLayout>
  );
};

export default SignUp;

