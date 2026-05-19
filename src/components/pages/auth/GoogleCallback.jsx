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
    const error = searchParams.get("error");
    if (error) {
      navigate("/sign-in?error=google_failed");
      return;
    }
    // Cookie has been set server-side via the redirect; hydrate the user.
    dispatch(fetchMe()).then((result) => {
      if (result.meta.requestStatus === "fulfilled") navigate("/archive");
      else navigate("/sign-in?error=google_failed");
    });
  }, []);

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  );
};

export default GoogleCallback;
