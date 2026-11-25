import Dialog from "@mui/material/Dialog";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import DialogTitle from "../Dialogs/DialogTitle";
import DialogContent from "../Dialogs/DialogContent";
import DialogActions from "../Dialogs/DialogActions";
import { useTranslation } from "react-i18next";
import { useAvatarCrop } from "./useAvatarCrop";
import { ROOM } from "../../../theme/tokens";

// Choosing which part of the picture is the profile picture: the picture under
// a circle, moved by dragging, zoomed by the slider, the wheel or a pinch. What
// is inside the circle is what is saved.
//
// The viewport is dir="ltr" in every language: it is a picture, and the drag
// arithmetic counts pixels from its left edge.
// 240px: inside a dialog on a 320px phone, with its margins and padding.
export const CROP_VIEW = 240;

const AvatarCropDialog = ({ picture, busy, onCancel, onSave }) => {
  const { t } = useTranslation("profile");
  const crop = useAvatarCrop(picture, CROP_VIEW);

  return (
    <Dialog open={Boolean(picture)} onClose={busy ? undefined : onCancel} maxWidth="xs" fullWidth>
      <DialogTitle onClose={busy ? undefined : onCancel}>{t("avatar.crop.title")}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
          {t("avatar.crop.hint")}
        </Typography>

        <Box
          dir="ltr"
          role="group"
          tabIndex={0}
          aria-label={t("avatar.crop.area")}
          {...crop.handlers}
          sx={{
            position: "relative",
            width: CROP_VIEW,
            height: CROP_VIEW,
            maxWidth: "100%",
            overflow: "hidden",
            borderRadius: 2,
            bgcolor: ROOM.bar,
            cursor: "grab",
            touchAction: "none",
            userSelect: "none",
            "&:active": { cursor: "grabbing" },
            "&:focus-visible": { outline: "3px solid", outlineColor: "secondary.main", outlineOffset: 2 },
          }}
        >
          {picture && (
            <Box
              component="img"
              src={picture.url}
              alt=""
              draggable={false}
              sx={{
                position: "absolute",
                insetBlockStart: 0,
                insetInlineStart: 0,
                width: crop.imageWidth,
                height: crop.imageHeight,
                maxWidth: "none",
                transform: `translate(${crop.offset.x}px, ${crop.offset.y}px)`,
                pointerEvents: "none",
              }}
            />
          )}
          {/* The circle: everything outside it is dimmed. */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.9)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              pointerEvents: "none",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%", maxWidth: CROP_VIEW }}>
          <IconButton size="small" onClick={crop.zoomOut} aria-label={t("avatar.crop.zoomOut")} disabled={crop.zoom <= crop.minZoom}>
            <ZoomOutIcon />
          </IconButton>
          <Slider
            value={crop.zoom}
            min={crop.minZoom}
            max={crop.maxZoom}
            step={0.01}
            onChange={(_, value) => crop.setZoom(value)}
            aria-label={t("avatar.crop.zoom")}
          />
          <IconButton size="small" onClick={crop.zoomIn} aria-label={t("avatar.crop.zoomIn")} disabled={crop.zoom >= crop.maxZoom}>
            <ZoomInIcon />
          </IconButton>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>{t("common:actions.cancel")}</Button>
        <Button variant="contained" onClick={() => onSave(crop.rect())} disabled={busy} sx={{ borderRadius: 2 }}>
          {busy ? <CircularProgress size={20} color="inherit" /> : t("avatar.crop.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AvatarCropDialog;
