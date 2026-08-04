import { useRef, useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import DeleteIcon from "@mui/icons-material/Delete";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { mediaApi } from "../../../../api/mediaApi";
import DownloadMenu from "../../mediaView/componentsMediaView/DownloadMenu";
import { mediaTypeLabels, mediaTypeAccents } from "../../../../utilities/constant";
import { canManageMedia } from "../../../../utilities/permissions";

const TYPE_COLOR = { video: "warning", audio: "info", text: "success" };
const TYPE_IMAGE = { video: "/images/video_image.png", audio: "/images/audio_image.png", text: "/images/book_image.png" };
const TYPE_IMAGE_SCALE = { video: 0.65, audio: 0.55, text: 0.50 };

// This card's ownership rule was the original — and, until the server caught up,
// the only — place it lived. It now defers to the shared helper so the card and
// the API cannot drift.
const canDelete = canManageMedia;

// L-shaped corner bracket drawn as SVG with a crisp right-angle elbow that
// follows the card's SHARP (square) top-right & bottom-left corners.
// It sits just OUTSIDE the card (offset -5) and behind it (zIndex 1), wrapping
// the corner from outside — so when the card scales up on hover it covers the
// bracket completely. Arm tips keep rounded caps; the elbow is mitered (sharp).
const CornerBracket = ({ accent, placement }) => {
  const isTR = placement === "tr";
  // Two straight arms meeting at a square 90° elbow over the card corner.
  const d = isTR
    ? "M 8 3 L 77 3 L 77 72"
    : "M 3 8 L 3 77 L 72 77";
  return (
    <Box
      component="svg"
      viewBox="0 0 80 80"
      sx={{
        position: "absolute", width: 80, height: 80, zIndex: 1, pointerEvents: "none",
        ...(isTR ? { top: -5, right: -5 } : { bottom: -5, left: -5 }),
      }}
    >
      <path d={d} fill="none" stroke={accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="miter" />
    </Box>
  );
};

const MediaCard = ({ item, onView, user, onDelete, onTogglePublish }) => {
  const isVideo = item.media_type === "video";
  const accent = mediaTypeAccents[item.media_type];
  const videoRef = useRef(null);
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [downloadAnchor, setDownloadAnchor] = useState(null);

  const canManage = canManageMedia(user, item);
  const isPublished = Boolean(item.is_published);

  // The one control that decides whether students see this item at all. Uploads
  // are created unpublished (is_published defaults to FALSE and createMedia
  // never sets it), and until this existed nothing in the app could turn it on —
  // so every item stayed a draft and the student archive was permanently empty.
  const handleTogglePublish = async (e) => {
    e.stopPropagation();
    setPublishing(true);
    await onTogglePublish(item);
    setPublishing(false);
  };

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
      // Sharp (square) top-right & bottom-left corners; rounded top-left & bottom-right.
      borderTopLeftRadius: "20px", borderTopRightRadius: 0,
      borderBottomRightRadius: "20px", borderBottomLeftRadius: 0,
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      transformOrigin: "center",
      transition: "transform 0.35s ease, box-shadow 0.35s ease",
      "&:hover": { transform: "scale(1.03)", boxShadow: "0 6px 20px rgba(0,0,0,0.12)" },
    }}
  >
    {/* Image / icon area */}
    <Box sx={(theme) => ({ position: "relative", bgcolor: theme.palette.mode === "dark" ? "#161d22" : "#ffffff", height: 180, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTopLeftRadius: "20px", borderTopRightRadius: 0 })}>
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
          src={mediaApi.streamUrl(item.id)}
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
        label={mediaTypeLabels[item.media_type] || item.media_type}
        color={TYPE_COLOR[item.media_type]}
        size="small"
        sx={{ position: "absolute", top: 8, left: 8, fontWeight: 600 }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Draft badge. Only managers ever see an unpublished item in the first
          place, so this never appears for a student — it tells the owner why
          their upload isn't in anyone else's archive yet. */}
      {canManage && !isPublished && (
        <Chip
          label="טיוטה"
          size="small"
          sx={{ position: "absolute", top: 42, left: 8, fontWeight: 700, bgcolor: "rgba(0,0,0,0.65)", color: "#fff" }}
          onClick={(e) => e.stopPropagation()}
        />
      )}

      {/* Action icons — top right */}
      <Box sx={{ position: "absolute", top: 6, right: 6, display: "flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
        <IconButton
          onClick={(e) => setDownloadAnchor(e.currentTarget)}
          aria-label="הורדה"
          aria-haspopup="menu"
          size="small"
          sx={{ bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "white" }, p: 0.5 }}
        >
          <FileDownloadIcon fontSize="small" />
        </IconButton>
        {canManage && (
          <Tooltip title={isPublished ? "מוצג לתלמידים — לחץ כדי להסתיר" : "טיוטה — לחץ כדי לפרסם לתלמידים"}>
            {/* span: a disabled IconButton fires no events, so the Tooltip needs
                a wrapper that still does. */}
            <span>
              <IconButton
                size="small"
                color={isPublished ? "success" : "default"}
                aria-label={isPublished ? "הסתרה מתלמידים" : "פרסום לתלמידים"}
                onClick={handleTogglePublish}
                disabled={publishing}
                sx={{ bgcolor: "rgba(255,255,255,0.85)", "&:hover": { bgcolor: "white" }, p: 0.5 }}
              >
                {isPublished ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        )}
        {canDelete(user, item) && (
          <IconButton
            size="small"
            color="error"
            aria-label="מחיקה"
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
      {/* Attribution. course_title is absent for the general library, which is
          most of the archive today — so the row only appears once there is
          something to say. */}
      {(item.course_title || item.lecturer_name) && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          {item.course_title && (
            <Chip label={item.course_title} size="small" color="primary" variant="outlined" />
          )}
          {item.lecturer_name && (
            <Chip label={item.lecturer_name} size="small" variant="outlined" />
          )}
        </Box>
      )}
    </CardContent>
  </Card>

  {/* Rendered outside the Card because MUI puts a Menu in a portal at the end of
      <body>: it is not inside the card's DOM, so the card's own onClick (which
      opens the lecture) never sees these clicks. `hasTranscript` rather than a
      transcript — the archive list carries the flag, and the text is fetched
      only if the user actually picks the PDF. */}
  <DownloadMenu
    anchorEl={downloadAnchor}
    open={Boolean(downloadAnchor)}
    onClose={() => setDownloadAnchor(null)}
    media={item}
    hasTranscript={item.has_transcript}
    direction="down"
  />
  </Box>
  );
};

export default MediaCard;
