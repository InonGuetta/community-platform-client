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
    // sandbox, with no allowances at all, and the empty value is the whole point.
    //
    // A blob: URL inherits the origin of the page that created it, so without this
    // the frame runs as this application: same cookies, same localStorage, and a
    // reachable window.parent. The content is a document somebody uploaded. The
    // server does sanitise the Word conversion before serving it as HTML, and that
    // is the real defence — but it means one sanitiser configuration is the only
    // thing standing between an uploaded file and the signed-in session, forever.
    // This makes the frame an opaque origin, so a gap in that configuration stops
    // being a way into the app.
    //
    // If a PDF ever fails to display here, the fix is `sandbox="allow-scripts"` on
    // its own — NOT with allow-same-origin. The two together are the documented
    // way to have no sandbox at all: a frame granted both can reach into its own
    // sandbox attribute and remove it.
    <Box
      component="iframe"
      src={blobUrl}
      sandbox=""
      title="תצוגת המסמך"
      width="100%"
      height={650}
      sx={{ border: "none", borderRadius: 2, display: "block" }}
    />
  );
};

export default TextViewer;
