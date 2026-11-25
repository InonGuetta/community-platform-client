import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import { useTranslation } from "react-i18next";
import { mediaTypeLabels } from "../../../../utilities/constant";
import { lengthLabel } from "../../../../utilities/durationOptions";
import { creatorDisplayName, isLeakedCreator } from "../../../../utilities/creatorPage";
import { RADIUS, HERO, WHITE } from "../../../../theme/tokens";

// The archive's banner (decision 1, step 3): the newest published lesson
// (featuredItem.js; D-01), on an indigo gradient with rings, radius 28.
//
// Both buttons open the lesson (D-02): there is no playing from the archive,
// so "האזנה" is the way into the lesson page, worded by type — האזנה, צפייה,
// קריאה. The whole banner opens it too, for a pointer; the buttons are the way
// in for a keyboard.
const ACTION_KEY = { audio: "hero.listen", video: "hero.watch", text: "hero.read" };

const ArchiveHero = ({ item, onOpen }) => {
  const { t } = useTranslation("archive");
  const open = () => onOpen(item.id);
  const press = (e) => {
    e.stopPropagation();
    open();
  };
  const typeLabel = mediaTypeLabels[item.media_type] || item.media_type;
  const length = item.media_type === "text" ? null : lengthLabel(item.duration_seconds);
  const meta = [item.creator_name && !isLeakedCreator(item.creator_name) && creatorDisplayName(item.creator_name), length].filter(Boolean).join(" · ");

  return (
    <Box
      component="section"
      aria-label={t("hero.label")}
      onClick={open}
      sx={{
        position: "relative",
        overflow: "hidden",
        cursor: "pointer",
        borderRadius: `${RADIUS.hero}px`,
        height: { xs: 300, md: 340 },
        mb: { xs: 5, md: 7 },
        bgcolor: HERO.base,
        color: WHITE,
      }}
    >
      {/* The rings sit toward the end of the line, away from the text — so in
          a left-to-right language the picture turns round with it. */}
      <Box
        component="svg"
        viewBox="0 0 1180 340"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        focusable="false"
        sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", "[dir='ltr'] &": { transform: "scaleX(-1)" } }}
      >
        <defs>
          <linearGradient id="archive-hero-gradient" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={HERO.gradient[0]} />
            <stop offset=".55" stopColor={HERO.gradient[1]} />
            <stop offset="1" stopColor={HERO.gradient[2]} />
          </linearGradient>
        </defs>
        <rect width="1180" height="340" fill="url(#archive-hero-gradient)" />
        <g fill="none" stroke={HERO.ring} strokeWidth="1.2">
          {[70, 120, 170, 220, 270, 320].map((r) => (
            <circle key={r} cx="260" cy="170" r={r} />
          ))}
        </g>
      </Box>

      <Box sx={{ position: "relative", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", p: { xs: 3, md: 5 }, maxWidth: 672, textAlign: "start" }}>
        <Typography variant="kicker" component="p" sx={{ color: HERO.kicker, mb: 1.5 }}>
          {t("hero.kicker", { type: typeLabel })}
        </Typography>
        <Typography
          variant="display"
          component="h2"
          dir="auto"
          sx={{ fontSize: { xs: 34, md: 44 }, mb: { xs: 1, md: 1.5 }, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {item.title}
        </Typography>
        {meta && (
          <Typography dir="auto" sx={{ color: HERO.text, fontSize: { xs: 16, md: 18 }, mb: { xs: 2.5, md: 3 } }}>
            {meta}
          </Typography>
        )}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Button
            onClick={press}
            startIcon={<PlayArrowRoundedIcon />}
            sx={{ bgcolor: WHITE, color: "text.primary", "&:hover": { bgcolor: WHITE, transform: "scale(1.03)" } }}
          >
            {t(ACTION_KEY[item.media_type] || "hero.read")}
          </Button>
          <Button
            onClick={press}
            sx={{ bgcolor: HERO.ghost, color: WHITE, fontWeight: 600, backdropFilter: "blur(8px)", "&:hover": { bgcolor: HERO.ghostHover } }}
          >
            {t("hero.details")}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ArchiveHero;
