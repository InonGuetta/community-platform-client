import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";
import { useTranslation } from "react-i18next";
import { useCamera } from "./useCamera";

// Taking the profile picture now: the camera live, mirrored as a mirror is,
// and one press to take the frame — which then goes to the crop editor like a
// chosen file. When the camera cannot be used, it says why and offers the
// device's own files instead.
const CameraDialog = ({ open, onCancel, onCaptured, onChooseFile }) => {
  const { t } = useTranslation("profile");
  const { videoRef, status, capture } = useCamera(open);
  const failed = ["denied", "none", "failed"].includes(status);

  const take = async () => {
    try {
      onCaptured(await capture());
    } catch {
      onCancel();
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle onClose={onCancel}>{t("avatar.camera.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        {failed ? (
          <Alert severity="warning" sx={{ width: "100%" }}>{t(`avatar.camera.${status}`)}</Alert>
        ) : (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              aspectRatio: "1 / 1",
              borderRadius: 2,
              overflow: "hidden",
              bgcolor: "grey.900",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
            />
            {status !== "live" && (
              <Box sx={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, color: "grey.300" }}>
                <CircularProgress color="inherit" size={28} />
                {t("avatar.camera.starting")}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        {failed ? (
          <Button variant="contained" onClick={onChooseFile} sx={{ borderRadius: 2 }}>{t("avatar.upload")}</Button>
        ) : (
          <>
            <Button onClick={onCancel}>{t("common:actions.cancel")}</Button>
            <Button
              variant="contained"
              startIcon={<PhotoCameraIcon />}
              onClick={take}
              disabled={status !== "live"}
              sx={{ borderRadius: 2 }}
            >
              {t("avatar.camera.capture")}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CameraDialog;
