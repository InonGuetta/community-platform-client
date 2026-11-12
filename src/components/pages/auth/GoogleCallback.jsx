import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { useGoogleCallback } from "./useGoogleCallback";

const GoogleCallback = () => {
  useGoogleCallback();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  );
};

export default GoogleCallback;
