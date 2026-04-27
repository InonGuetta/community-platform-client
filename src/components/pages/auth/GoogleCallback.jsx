import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { fetchMe } from "../../../store/slicesAndThunks/authSlices/authGet";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error || !token) {
      navigate("/sign-in?error=google_failed");
      return;
    }

    localStorage.setItem("token", token);
    dispatch(fetchMe()).then(() => navigate("/archive"));
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  );
};

export default GoogleCallback;
