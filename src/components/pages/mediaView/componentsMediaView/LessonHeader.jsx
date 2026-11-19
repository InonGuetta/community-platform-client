import Box from "@mui/material/Box";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
import BackLink from "../../../features/BackLink/BackLink";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import { creatorPrefixes } from "../../../../utilities/constant";
import { creatorPath, hasCreatorPage, creatorDisplayName } from "../../../../utilities/creatorPage";
import { lessonTitleForHeading } from "./lessonTitle";
import { useTranslation } from "react-i18next";

// The top of a lesson page (Redesign v4, screens 20, 26, 27): the way back to
// the archive, a kicker naming the kind of lesson with its status badge, the
// title as the page's one H1, and "מרצה: X".
//
// The H1 is the display face at the size of its kind (part B): an audio lesson
// 48/64, a video or a book 40/56.
//
// `showStatusBadge` is the page's answer to "may this viewer see the draft /
// public badge" — admin-only in the mockups, so it is false while "תצוגת מנהל"
// is off and for anyone who cannot manage the lesson (D-07, D-66). The same
// rule the archive tile uses (`showsStatusBadge`), so the two cannot disagree.
const TITLE_SIZE = {
  audio: { xs: 48, md: 64 },
  other: { xs: 40, md: 56 },
};

const KICKER_KEYS = { audio: "kicker.audio", video: "kicker.video", text: "kicker.text" };

const LessonHeader = ({ media, showStatusBadge = false }) => {
  const { t } = useTranslation(["lesson", "media"]);
  const type = media.media_type;
  const isDraft = media.is_published === false;
  const badge = !showStatusBadge
    ? null
    : isDraft
      ? { tone: "warning", label: t("media:card.draft") }
      : media.is_public
        ? { tone: "indigo", label: t("media:card.public") }
        : null;

  return (
    <Box sx={{ mb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <BackLink to="/archive">{t("backToArchive")}</BackLink>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, mb: 1 }}>
        <Typography variant="kicker" sx={{ color: "primary.main" }}>
          {t(KICKER_KEYS[type] ?? KICKER_KEYS.video)}
        </Typography>
        {badge && <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>}
      </Box>

      <Typography
        variant="display"
        component="h1"
        // The lesson's own words: their direction, not the interface's.
        dir="auto"
        sx={{
          fontSize: type === "audio" ? TITLE_SIZE.audio : TITLE_SIZE.other,
          mb: 1,
          overflowWrap: "anywhere",
        }}
      >
        {lessonTitleForHeading(media.title)}
      </Typography>

      {/* "מרצה" or "מחבר" by media type — one column, worded for what it is.
          Always present: creator_name is NOT NULL and reads "כללי" when nobody
          said, so this never collapses into a title that looks unattributed by
          accident rather than on purpose. */}
      {media.creator_name && (
        <Typography sx={{ fontSize: 17, fontWeight: 500, color: "text.secondary" }}>
          {creatorPrefixes[type] || creatorPrefixes.video}:{" "}
          {/* Their other lessons are one click away (PRD ATTR-10). */}
          {hasCreatorPage(media.creator_name) ? (
            <Link
              component={RouterLink}
              to={creatorPath(media.creator_name)}
              color="inherit"
              underline="hover"
              fontWeight={600}
            >
              {media.creator_name}
            </Link>
          ) : (
            creatorDisplayName(media.creator_name)
          )}
        </Typography>
      )}
    </Box>
  );
};

export default LessonHeader;
