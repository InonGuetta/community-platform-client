import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import { useTranslation } from "react-i18next";
import { useAvatarEditor } from "./useAvatarEditor";
import AvatarCropDialog from "./AvatarCropDialog";
import CameraDialog from "./CameraDialog";

// The signed-in user's picture with the means to change it: upload one from
// the device, take one now with the camera, frame it in the crop editor, or
// remove it. On the account page beside the name and email, and in the
// picture offered right after signing up.
//
// `layout="column"` centres it under a heading (the welcome dialog); the
// default sits it in a row beside the account's details.
const AvatarEditor = ({ size = 72, layout = "row" }) => {
  const { t } = useTranslation("profile");
  const { user, hasPicture, busy, fileRef, captureRef, chooseFile, takePhoto, onFileChosen, remove, camera, crop } =
    useAvatarEditor();
  if (!user) return null;
  const column = layout === "column";

  return (
    <Box sx={{ display: "flex", flexDirection: column ? "column" : "row", alignItems: "center", gap: 2 }}>
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <Avatar
          src={user.avatar_url || undefined}
          alt={t("avatar.label")}
          sx={{ width: size, height: size, fontSize: size / 2.6, fontWeight: 700 }}
        >
          {(user.display_name || user.email || "?").charAt(0).toUpperCase()}
        </Avatar>
        <IconButton
          onClick={takePhoto}
          disabled={busy}
          size="small"
          aria-label={t("avatar.takePhoto")}
          sx={{
            position: "absolute",
            bottom: -4,
            insetInlineEnd: -4,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            border: "2px solid",
            borderColor: "background.paper",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          {busy ? <CircularProgress size={16} color="inherit" /> : <PhotoCameraIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: column ? "center" : "flex-start", gap: 0.5, minWidth: 0 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", justifyContent: column ? "center" : "flex-start" }}>
          <Button size="small" variant="outlined" startIcon={<FileUploadOutlinedIcon />} onClick={chooseFile} disabled={busy} sx={{ borderRadius: 2 }}>
            {hasPicture ? t("avatar.change") : t("avatar.upload")}
          </Button>
          <Button size="small" variant="outlined" startIcon={<PhotoCameraIcon />} onClick={takePhoto} disabled={busy} sx={{ borderRadius: 2 }}>
            {t("avatar.takePhoto")}
          </Button>
          {hasPicture && (
            <Button size="small" color="error" onClick={remove} disabled={busy} sx={{ borderRadius: 2 }}>
              {t("avatar.remove")}
            </Button>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ textAlign: column ? "center" : "start" }}>
          {t("avatar.hint")}
        </Typography>
      </Box>

      {/* The device's files, and — where the page cannot open the camera
          itself — the device's camera (capture). */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={onFileChosen} />
      <input ref={captureRef} type="file" accept="image/*" capture="user" hidden onChange={onFileChosen} />

      <CameraDialog open={camera.open} onCancel={camera.close} onCaptured={camera.onCaptured} onChooseFile={chooseFile} />
      <AvatarCropDialog picture={crop.picture} busy={busy} onCancel={crop.close} onSave={crop.save} />
    </Box>
  );
};

export default AvatarEditor;
