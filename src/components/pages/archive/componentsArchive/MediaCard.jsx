import { useRef, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { roles } from "../../../../utilities/constant";

const TYPE_COLOR = { video: "warning", audio: "info", text: "success" };
const TYPE_ACCENT = { video: "#ef6c00", audio: "#1976d2", text: "#2e7d32" };
const TYPE_IMAGE = { video: "/images/video_image.png", audio: "/images/audio_image.png", text: "/images/book_image.png" };
const TYPE_IMAGE_SCALE = { video: 0.65, audio: 0.55, text: 0.50 };

const canDelete = (user, item) =>
  user?.role === roles.admin || (user?.role === roles.lecturer && item.uploader_id === user.id);

// L-shaped corner bracket drawn as SVG so the arm tips get true rounded caps.
// It sits just OUTSIDE the card (offset -5) and behind it (zIndex 1), wrapping
// the corner from outside — so when the card scales up on hover it covers the
// bracket completely.
const CornerBracket = ({ accent, placement }) => {
  const isTR = placement === "tr";
  // Concentric with the card's 20px rounded corner; long arms, 6px thick.
  const d = isTR
    ? "M 8 3 L 60 3 A 17 17 0 0 1 77 20 L 77 72"
    : "M 3 8 L 3 60 A 17 17 0 0 0 20 77 L 72 77";
  return (
    <Box
      component="svg"
      viewBox="0 0 80 80"
      sx={{
        position: "absolute", width: 80, height: 80, zIndex: 1, pointerEvents: "none",
        ...(isTR ? { top: -5, right: -5 } : { bottom: -5, left: -5 }),
      }}
    >
      <path d={d} fill="none" stroke={accent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
    </Box>
  );
};

const MediaCard = ({ item, onView, user, onDelete }) => {
  const isVideo = item.media_type === "video";
  const accent = TYPE_ACCENT[item.media_type];
  const videoRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);

  // Hover-to-preview: play the video (muted) inside the small card on mouse
  // enter, pause + reset on leave. Only for video items.
  const handleMouseEnter = () => {
    if (!isVideo) return;
    setPreviewing(true);
    const v = videoRef.current;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
  };
  const handleMouseLeave = () => {
    if (!isVideo) return;
    setPreviewing(false);
    const v = videoRef.current;
    if (v) { v.pause(); v.currentTime = 0; }
  };

  return (
  // Wrapper holds the colored brackets just outside the card; the card sits on
  // top (higher zIndex) and scales up on hover to cover/hide the brackets.
  <Box sx={{ position: "relative", height: "100%" }}>
    {/* Colored corner brackets (SVG for rounded line caps) — top-right & bottom-left */}
    <CornerBracket accent={accent} placement="tr" />
    <CornerBracket accent={accent} placement="bl" />
  <Card
    onClick={() => onView(item.id)}
    onMouseEnter={handleMouseEnter}
    onMouseLeave={handleMouseLeave}
    sx={{
      position: "relative", zIndex: 2, overflow: "hidden",
      height: "100%", display: "flex", flexDirection: "column", cursor: "pointer",
      borderRadius: 5, boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      transformOrigin: "center",
      transition: "transform 0.35s ease, box-shadow 0.35s ease",
      "&:hover": { transform: "scale(1.06)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
    }}
  >
    {/* Image / icon area */}
    <Box sx={{ position: "relative", bgcolor: "#ffffff", height: 180, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTopLeftRadius: "20px", borderTopRightRadius: "20px" }}>
      {item.thumbnail_url ? (
        <Box component="img" src={item.thumbnail_url} alt={item.title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <Box component="img" src={TYPE_IMAGE[item.media_type]} alt={item.title}
          sx={{ height: `${TYPE_IMAGE_SCALE[item.media_type] * 180}px`, objectFit: "contain", opacity: 0.85 }}
        />
      )}

      {/* Hover preview — video plays muted on top of the icon */}
      {isVideo && (
        <Box
          component="video"
          ref={videoRef}
          src={`/api/media/${item.id}/stream`}
          muted
          loop
          playsInline
          preload="none"
          sx={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", bgcolor: "black",
            opacity: previewing ? 1 : 0, transition: "opacity 0.2s",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Type badge — top left */}
      <Chip
        label={item.media_type}
        color={TYPE_COLOR[item.media_type]}
        size="small"
        sx={{ position: "absolute", top: 8, left: 8, fontWeight: 600, textTransform: "capitalize" }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Action icons — top right */}
      <Box sx={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
        <IconButton
          component="a"
          href={`/api/media/${item.id}/download`}
          download
          aria-label="Download"
          size="small"
          sx={{ bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "white" }, p: 0.5 }}
        >
          <FileDownloadIcon fontSize="small" />
        </IconButton>
        {canDelete(user, item) && (
          <IconButton
            size="small"
            color="error"
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            sx={{ bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "white" }, p: 0.5 }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>

    {/* Text content */}
    <CardContent sx={{ flexGrow: 1, textAlign: "right", pt: 1.5, pb: "16px !important", px: 2 }}>
      <Typography variant="subtitle1" fontWeight={800} color="primary" noWrap sx={{ mb: 0.5 }}>{item.title}</Typography>
      {item.description && (
        <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
          {item.description}
        </Typography>
      )}
    </CardContent>
  </Card>
  </Box>
  );
};

export default MediaCard;
