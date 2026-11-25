import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { Link as RouterLink } from "react-router-dom";
import DirectionalIcon from "../../../../components/features/DirectionalIcon/DirectionalIcon";
import { useTranslation } from "react-i18next";

// Under the player, for a lesson that is part of a course (PRD CRS-1, CRS-3):
// where it stands in the track, a way to the lesson after it, and the countdown
// to that lesson when this one ends. See useCourseTrackForLesson.
//
// Redesign v4 has no mockup for it (D-23): a card in the new style, under the
// audio player card or under the video, like the player card beside it.
const CourseTrackBar = ({ track }) => {
  const { t } = useTranslation(["lesson", "common"]);
  if (!track?.inTrack) return null;
  const { place, next, countdown } = track;

  return (
    <Paper data-testid="course-track" sx={{ mt: 2.5, p: 2.5 }}>
      {countdown !== null && next && (
        <Alert
          severity="info"
          sx={{ mb: 1.5 }}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button color="inherit" size="small" onClick={track.goNext}>{t("track.now")}</Button>
              <Button color="inherit" size="small" onClick={track.stopCountdown}>{t("common:actions.cancel")}</Button>
            </Box>
          }
        >
          {t("track.nextStarts", { title: next.title, seconds: countdown })}
        </Alert>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {t("track.place", { index: place.index, count: place.count })}{" "}
          <Link component={RouterLink} to={track.trackHref} fontWeight={600} underline="hover">
            {track.courseTitle}
          </Link>
        </Typography>
        {next && (
          <Button size="small" variant="soft" endIcon={<DirectionalIcon toward="forward" />} onClick={track.goNext}>
            {t("track.next", { title: next.title })}
          </Button>
        )}
      </Box>
    </Paper>
  );
};

export default CourseTrackBar;
