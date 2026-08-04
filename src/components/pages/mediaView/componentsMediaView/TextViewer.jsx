import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { mediaApi } from "../../../../api/mediaApi";

const TextViewer = ({ mediaId }) => {
  const [blobUrl, setBlobUrl] = useState(null);
  const [error, setError] = useState(false);
  // Bumping this re-runs the fetch effect — the "נסה שוב" retry.
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let url;
    let cancelled = false;
    setError(false);
    setBlobUrl(null);
    mediaApi
      .fetchBlob(mediaId)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setBlobUrl(url);
      })
      // Previously there was no catch, so a failed load left the spinner
      // spinning forever. Surface a clear error with a retry instead.
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [mediaId, reloadKey]);

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => setReloadKey((k) => k + 1)}>
            נסה שוב
          </Button>
        }
      >
        לא ניתן לטעון את המסמך.
      </Alert>
    );
  }

  if (!blobUrl) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      component="iframe"
      src={blobUrl}
      width="100%"
      height={650}
      sx={{ border: "none", borderRadius: 2, display: "block" }}
    />
  );
};

export default TextViewer;
