import { useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import { Link as RouterLink } from "react-router-dom";
import MoreHorizRoundedIcon from "@mui/icons-material/MoreHorizRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FavoriteBorderRoundedIcon from "@mui/icons-material/FavoriteBorderRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";
import CoverArt from "./CoverArt";
import MediaTileMenu from "./MediaTileMenu";
import { useMediaTileMenu } from "./useMediaTileMenu";
import { useVideoPreview } from "./useVideoPreview";
import { showsStatusBadge } from "./tileActions";
import { mediaApi } from "../../../api/mediaApi";
import { mediaTypeLabels } from "../../../utilities/constant";
import { lengthLabel } from "../../../utilities/durationOptions";
import { creatorDisplayName, hasCreatorPage, isLeakedCreator } from "../../../utilities/creatorPage";
import { RADIUS, SHADOW, MOTION, TILE, WHITE } from "../../../theme/tokens";

// An item in a grid (design/REDESIGN_V4.md, component 5 — "the most important
// component"). The square cover with its buttons, and under it the type and
// length, the title, who said it, and one tag. The same tile on every page
// that shows items: the archive, a lecturer's page, likes, saved, continue.
//
//   * The whole tile opens the lesson, and it is a real link (UI_UX_FIXES 2.3):
//     the title is a <Link to="/media/:id"> whose ::after stretches over the
//     tile, so a click, a middle click, "open in a new tab" and "copy link"
//     all work, and Tab lands on the title. The buttons on the cover and the
//     lecturer's name sit above that layer (position: relative, z-index 1),
//     so each stays clickable on its own. No <a> inside an <a>.
//   * ▶ is a picture of what the tile does, not a second control (D-02: there
//     is no playing from the grid).
//   * ♥ is the like (D-18), from the grid's useTileLikes.
//   * ⋯ is download for everyone and the management actions for managers with
//     "תצוגת מנהל" on (D-14, D-15) — see tileActions.js.
//   * The draft / public badge is admin-only (D-17).
//
// Removed from the card, by the spec: the like count and the row of icons;
// and by D-17 the description, the course chip and every tag but the first.
// The lesson page still shows all of them.

const fabSx = {
  position: "absolute",
  zIndex: 1,
  width: 34,
  height: 34,
  borderRadius: "50%",
  bgcolor: TILE.fab,
  color: TILE.fabInk,
  backdropFilter: "blur(8px)",
  boxShadow: TILE.fabShadow,
  transition: "transform .15s, background-color .2s",
  "&:hover": { bgcolor: WHITE },
  "&:active": { transform: "scale(.92)" },
};

// The heart's pop when it is pressed on (part B, "תנועה"): .3s, 1.35 at the
// middle. Only on the press itself — a tile that loads already liked does not
// pop — and never under prefers-reduced-motion.
const popSx = {
  animation: "tile-heart-pop .3s",
  "@keyframes tile-heart-pop": { "50%": { transform: "scale(1.35)" } },
  "@media (prefers-reduced-motion: reduce)": { animation: "none" },
};

const MediaTile = ({
  item, user, showAdmin = false, liked = false, onToggleLike,
  onDelete, onTogglePublish, onEditTags, onEditDetails, onOpenCreator,
}) => {
  const { t } = useTranslation("media");
  const menu = useMediaTileMenu({ item, user, showAdmin, onEditDetails, onEditTags, onTogglePublish, onDelete });
  const isVideo = item.media_type === "video";
  const { videoRef, previewing, start: startPreview, stop: stopPreview } = useVideoPreview(isVideo);
  const [popping, setPopping] = useState(false);

  // A book has no length, whatever the row holds.
  const length = item.media_type === "text" ? null : lengthLabel(item.duration_seconds);
  const typeLabel = mediaTypeLabels[item.media_type] || item.media_type;
  const kicker = length ? t("card.kicker", { type: typeLabel, length }) : typeLabel;
  const creator = item.creator_name && !isLeakedCreator(item.creator_name) ? creatorDisplayName(item.creator_name) : "";
  const creatorLinks = Boolean(onOpenCreator && creator && hasCreatorPage(item.creator_name));
  const tag = (item.tags || [])[0];

  const badge = showsStatusBadge({ user, item, showAdmin })
    ? !item.is_published
      ? t("card.draft")
      : item.is_public
        ? t("card.public")
        : null
    : null;

  const handleLike = () => {
    if (!liked) setPopping(true);
    onToggleLike();
  };

  return (
    <Box sx={{ position: "relative", minWidth: 0 }} onMouseEnter={startPreview} onMouseLeave={stopPreview}>
      <Box
        component="article"
        aria-label={item.title}
        sx={{
          display: "block",
          position: "relative",
          cursor: "pointer",
          borderRadius: `${RADIUS.tile}px`,
          // The hover wash reaches 12px past the cover on a desktop; on a
          // phone there is no hover and no room for it.
          p: { xs: 0, md: 1.5 },
          m: { xs: 0, md: -1.5 },
          transition: "background-color .25s",
          "@media (hover: hover)": {
            "&:hover": { bgcolor: { md: "surface.fill" } },
            "&:hover .MediaTile-cover": { transform: "translateY(-3px)", boxShadow: SHADOW.coverHover },
            "&:hover .MediaTile-play": { transform: "scale(1.08)" },
          },
        }}
      >
        <Box
          className="MediaTile-cover"
          sx={{
            position: "relative",
            aspectRatio: "1 / 1",
            borderRadius: `${RADIUS.cover}px`,
            overflow: "hidden",
            boxShadow: SHADOW.cover,
            transition: `transform ${MOTION.cover}, box-shadow ${MOTION.cover}`,
          }}
        >
          <CoverArt item={item} />

          {isVideo && (
            <Box
              component="video"
              ref={videoRef}
              src={mediaApi.streamUrl(item.id)}
              muted
              loop
              playsInline
              preload="none"
              aria-hidden="true"
              sx={{
                position: "absolute", inset: 0, width: "100%", height: "100%",
                objectFit: "cover", bgcolor: "black",
                opacity: previewing ? 1 : 0, transition: "opacity .2s", pointerEvents: "none",
              }}
            />
          )}

          {badge && (
            <Box
              component="span"
              sx={{
                position: "absolute", top: 10, insetInlineStart: 10,
                fontSize: 11, fontWeight: 700, lineHeight: 1.4, px: "9px", py: "3px",
                borderRadius: `${RADIUS.pill}px`, bgcolor: TILE.badge, color: "surface.draft",
              }}
            >
              {badge}
            </Box>
          )}

          <ButtonBase
            onClick={menu.openMenu}
            aria-label={t("card.actionsFor", { title: item.title })}
            aria-haspopup="menu"
            aria-expanded={menu.open}
            sx={{ ...fabSx, top: 8, insetInlineEnd: 8 }}
          >
            <MoreHorizRoundedIcon sx={{ fontSize: 20 }} />
          </ButtonBase>

          {onToggleLike && (
            <ButtonBase
              onClick={handleLike}
              aria-label={t("card.likeOf", { title: item.title })}
              aria-pressed={liked}
              sx={{ ...fabSx, bottom: 10, insetInlineStart: 10, ...(liked && { bgcolor: WHITE, color: TILE.heart }) }}
            >
              {liked ? (
                <FavoriteRoundedIcon
                  onAnimationEnd={() => setPopping(false)}
                  sx={{ fontSize: 18, ...(popping && popSx) }}
                />
              ) : (
                <FavoriteBorderRoundedIcon sx={{ fontSize: 18 }} />
              )}
            </ButtonBase>
          )}

          <Box
            className="MediaTile-play"
            aria-hidden="true"
            sx={{
              position: "absolute", bottom: 10, insetInlineEnd: 10,
              width: 42, height: 42, borderRadius: "50%",
              bgcolor: "primary.main", color: "primary.contrastText", boxShadow: SHADOW.play,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform .2s",
            }}
          >
            <PlayArrowRoundedIcon sx={{ fontSize: 24 }} />
          </Box>
        </Box>

        <Box sx={{ pt: 1.5, textAlign: "start" }}>
          <Typography variant="kicker" component="p" sx={{ color: "text.secondary", mb: 0.5 }}>
            {kicker}
          </Typography>
          <Typography
            component="h3"
            dir="auto"
            sx={{
              fontWeight: 700, fontSize: { xs: 16, md: 17 }, lineHeight: 1.3, letterSpacing: "-0.01em",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              overflowWrap: "anywhere",
            }}
          >
            <Link
              component={RouterLink}
              to={`/media/${item.id}`}
              color="inherit"
              underline="none"
              sx={{
                // The stretched link: this ::after covers the whole tile.
                "&::after": { content: '""', position: "absolute", inset: 0, borderRadius: `${RADIUS.tile}px` },
                "&:focus-visible": { outline: "none" },
                "&:focus-visible::after": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: "2px" },
              }}
            >
              {item.title}
            </Link>
          </Typography>
          {creator &&
            (creatorLinks ? (
              <ButtonBase
                onClick={() => onOpenCreator(item.creator_name)}
                aria-label={t("card.allByCreator", { name: item.creator_name })}
                dir="auto"
                sx={{
                  position: "relative", zIndex: 1,
                  mt: 0.25, fontSize: { xs: 13, md: 14 }, color: "text.secondary", textAlign: "start",
                  borderRadius: 1, "&:hover": { color: "text.primary", textDecoration: "underline" },
                }}
              >
                {creator}
              </ButtonBase>
            ) : (
              <Typography dir="auto" sx={{ mt: 0.25, fontSize: { xs: 13, md: 14 }, color: "text.secondary" }}>
                {creator}
              </Typography>
            ))}
          {tag && (
            <Box
              component="span"
              dir="auto"
              sx={{
                display: "inline-block", mt: 1, fontSize: 12, fontWeight: 600, px: 1.25, py: 0.25,
                borderRadius: `${RADIUS.pill}px`, bgcolor: "surface.accentSoft", color: "primary.main",
              }}
            >
              {tag}
            </Box>
          )}
        </Box>
      </Box>

      <MediaTileMenu item={item} menu={menu} />
    </Box>
  );
};

export default MediaTile;
