import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import { useTranslation } from "react-i18next";
import { useAvatarEditor } from "./useAvatarEditor";

// The signed-in user's picture with the means to change it: the picture (or
// their initial) with a camera on it, a button to upload or change, and one to
// remove. On the account page beside the name and email, and in the picture
// offered right after signing up.
//
// `layout="column"` centres it under a heading (the welcome dialog); the
// default sits it in a row beside the account's details.
const AvatarEditor = ({ size = 72, layout = "row" }) => {
  const { t } = useTranslation("profile");
  const { user, hasPicture, busy, inputRef, choose, onFileChosen, remove } = useAvatarEditor();
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
          onClick={choose}
          disabled={busy}
          size="small"
          aria-label={hasPicture ? t("avatar.change") : t("avatar.upload")}
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
          <Button size="small" variant="outlined" onClick={choose} disabled={busy} sx={{ borderRadius: 2 }}>
            {busy ? t("avatar.uploading") : hasPicture ? t("avatar.change") : t("avatar.upload")}
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

      {/* The picker itself, opened by either button. image/* lets a phone offer
          its camera and gallery; the picture is checked again when drawn. */}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/*" hidden onChange={onFileChosen} />
    </Box>
  );
};

export default AvatarEditor;
