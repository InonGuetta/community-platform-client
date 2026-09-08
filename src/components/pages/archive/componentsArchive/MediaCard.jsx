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
import MovieRoundedIcon from "@mui/icons-material/MovieRounded";
import VolumeUpRoundedIcon from "@mui/icons-material/VolumeUpRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import { alpha, lighten } from "@mui/material/styles";
import { mediaApi } from "../../../../api/mediaApi";
import DownloadMenu from "../../../features/DownloadMenu/DownloadMenu";
import { mediaTypeLabels, mediaTypeAccents, creatorPrefixes } from "../../../../utilities/constant";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";
import { canManageMedia } from "../../../../utilities/permissions";
// The same icon the like BUTTON uses, from the file that owns the pair. Its
// header says why: a shelf and the control that fills it have to look like one
// thing, and two independent imports stay matched only until one is changed.
import { likeIcons } from "../../personal/personalShelves";

const LikeIcon = likeIcons.on;

const TYPE_COLOR = { video: "warning", audio: "info", text: "success" };

// Vector icons rather than the PNGs this used to render: those bitmaps carried a
// baked-in white background, so in dark mode every card without a thumbnail was
// a bright white square. An icon inherits `color`, so it can follow the theme.
const TYPE_ICON = { video: MovieRoundedIcon, audio: VolumeUpRoundedIcon, text: MenuBookRoundedIcon };

// This card's ownership rule was the original — and, until the server caught up,
// the only — place it lived. It now defers to the shared helper so the card and
// the API cannot drift.
const canDelete = canManageMedia;

// The floating action buttons sit over the thumbnail, so they need their own
// surface to stay legible. A solid white pill is right on a light page but a
// glaring dot on a dark one; in dark mode a translucent light overlay reads as
// a raised control without punching a hole in the card.
const actionButtonSx = (theme) => {
  const dark = theme.palette.mode === "dark";
  return {
    p: 0.5,
    backdropFilter: "blur(4px)",
    bgcolor: dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.85)",
    "&:hover": { bgcolor: dark ? "rgba(255,255,255,0.26)" : "#ffffff" },
  };
};

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

const MediaCard = ({ item, onView, user, onDelete, onTogglePublish, onEditTags }) => {
  const isVideo = item.media_type === "video";
  // Both fall back for a media_type the client doesn't know yet: the icon so an
  // unrecognised item still renders, and the accent because alpha()/lighten()
  // throw on undefined where the bracket's stroke simply ignored it.
  const accent = mediaTypeAccents[item.media_type] || mediaTypeAccents.text;
  const PlaceholderIcon = TYPE_ICON[item.media_type] || MenuBookRoundedIcon;
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
    sx={(theme) => {
      const dark = theme.palette.mode === "dark";
      return {
        position: "relative", zIndex: 2, overflow: "hidden",
        height: "100%", display: "flex", flexDirection: "column", cursor: "pointer",
        // Sharp (square) top-right & bottom-left corners; rounded top-left & bottom-right.
        borderTopLeftRadius: "20px", borderTopRightRadius: 0,
        borderBottomRightRadius: "20px", borderBottomLeftRadius: 0,
        // MUI tints an elevated Paper in dark mode, which made the text half of
        // the card visibly lighter than the media half above it. Dropping the
        // overlay puts both halves on the same surface; a hairline border keeps
        // the card's edge readable against the page without it.
        ...(dark && { backgroundImage: "none", border: "1px solid rgba(255,255,255,0.08)" }),
        boxShadow: dark ? "0 2px 10px rgba(0,0,0,0.5)" : "0 2px 10px rgba(0,0,0,0.06)",
        transformOrigin: "center",
        transition: "transform 0.35s ease, box-shadow 0.35s ease",
        "&:hover": {
          transform: "scale(1.03)",
          boxShadow: dark ? "0 6px 20px rgba(0,0,0,0.65)" : "0 6px 20px rgba(0,0,0,0.12)",
        },
      };
    }}
  >
    {/* Image / icon area */}
    <Box sx={(theme) => ({ position: "relative", bgcolor: theme.palette.mode === "dark" ? "#161d22" : "#ffffff", height: 180, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderTopLeftRadius: "20px", borderTopRightRadius: 0 })}>
      {item.thumbnail_url ? (
        <Box component="img" src={item.thumbnail_url} alt={item.title} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        // No thumbnail: a tinted panel carrying the type's icon in the same accent
        // as the corner brackets and chip. The accent is tuned per mode — the raw
        // hex is picked for white, and reads as muddy against a dark surface.
        <Box
          sx={(theme) => ({
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            bgcolor: alpha(accent, theme.palette.mode === "dark" ? 0.14 : 0.08),
          })}
        >
          <PlaceholderIcon
            aria-hidden
            sx={(theme) => ({
              fontSize: 86,
              color: theme.palette.mode === "dark" ? lighten(accent, 0.4) : accent,
              opacity: theme.palette.mode === "dark" ? 0.9 : 0.75,
            })}
          />
        </Box>
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
          sx={actionButtonSx}
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
                sx={actionButtonSx}
              >
                {isPublished ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
        )}
        {canManage && onEditTags && (
          <Tooltip title="עריכת תגיות">
            <IconButton
              size="small"
              aria-label={`עריכת תגיות של ${item.title}`}
              onClick={(e) => { e.stopPropagation(); onEditTags(item); }}
              sx={actionButtonSx}
            >
              <LocalOfferIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        {canDelete(user, item) && (
          <IconButton
            size="small"
            color="error"
            aria-label="מחיקה"
            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
            sx={actionButtonSx}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    </Box>

    {/* Text content */}
    <CardContent sx={{ flexGrow: 1, textAlign: "right", pt: 1.5, pb: "16px !important", px: 2 }}>
      {/* primary.main is the navy that reads as a heading on white; on the dark
          card surface the same tone sinks into the background, so dark mode uses
          the lighter step of the brand colour rather than dropping to plain text. */}
      <Typography
        variant="subtitle1"
        fontWeight={800}
        noWrap
        sx={(theme) => ({ mb: 0.5, color: theme.palette.mode === "dark" ? "primary.light" : "primary.main" })}
      >
        {item.title}
      </Typography>
      {item.description && (
        <Typography variant="body2" color="text.secondary" sx={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: 1.4 }}>
          {item.description}
        </Typography>
      )}
      {/* Attribution. course_title is absent for the general library, which is
          most of the archive today — so the row only appears once there is
          something to say. The like count joins it on the same principle: it
          appears once somebody has actually liked the lecture, because "0" is a
          worse thing to print on every card in the archive than nothing at all. */}
      {(item.course_title || item.creator_name || item.like_count > 0) && (
        <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5, mt: 1 }}>
          {item.course_title && (
            <Chip label={item.course_title} size="small" color="primary" variant="outlined" />
          )}
          {/* Attribution reads creator_name, not the lecturer_name the SQL still
              computes from the linked accounts. The two answer different
              questions: creator_name is who SAID it (free text, "כללי" when
              nobody said), lecturer_name is which ACCOUNT is responsible. Only
              the first belongs on a card. */}
          {item.creator_name && (
            <Chip
              label={`${creatorPrefixes[item.media_type] || creatorPrefixes.video}: ${item.creator_name}`}
              size="small"
              variant="outlined"
            />
          )}
          {item.like_count > 0 && (
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.25, ms: "auto", color: "text.secondary" }}
              aria-label={`${item.like_count} אהבו`}
            >
              <LikeIcon sx={{ fontSize: 15 }} />
              <Typography variant="caption" fontWeight={700}>{item.like_count}</Typography>
            </Box>
          )}
        </Box>
      )}
      {/* Tags, on their own row BELOW the attribution: they answer "what kind of
          thing is this", which is a different question from "who said it", and
          mixing the two into one wrapping row made both hard to scan. The
          attribution comes first because it is what a reader looks for on a card
          they are scanning — the tags are how they got here. */}
      {(item.tags || []).length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 1 }}>
          {item.tags.map((tag) => (
            <Chip key={tag} label={tag} size="small" color="secondary" variant="outlined" />
          ))}
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
