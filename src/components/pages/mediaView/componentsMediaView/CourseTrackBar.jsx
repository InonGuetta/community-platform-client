import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import { Link as RouterLink } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

// Under the player, for a lesson that is part of a course (PRD CRS-1, CRS-3):
// where it stands in the track, a way to the lesson after it, and the countdown
// to that lesson when this one ends. See useCourseTrackForLesson.
const CourseTrackBar = ({ track }) => {
  if (!track?.inTrack) return null;
  const { place, next, countdown } = track;

  return (
    <Box sx={{ mt: 1.5 }}>
      {countdown !== null && next && (
        <Alert
          severity="info"
          sx={{ mb: 1 }}
          action={
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button color="inherit" size="small" onClick={track.goNext}>עכשיו</Button>
              <Button color="inherit" size="small" onClick={track.stopCountdown}>ביטול</Button>
            </Box>
          }
        >
          השיעור הבא, &quot;{next.title}&quot;, יתחיל בעוד {countdown} שניות
        </Alert>
      )}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          שיעור {place.index} מתוך {place.count} בקורס{" "}
          <Link component={RouterLink} to={track.trackHref} fontWeight={600} underline="hover">
            {track.courseTitle}
          </Link>
        </Typography>
        {next && (
          <Button size="small" variant="outlined" endIcon={<ArrowBackIcon />} onClick={track.goNext}>
            הבא: {next.title}
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default CourseTrackBar;
