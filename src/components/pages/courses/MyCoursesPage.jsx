import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import NoDataDialog from "../../features/NoDataDialog/NoDataDialog";
import JoinCourseDialog from "./componentsCourses/JoinCourseDialog";
import { trackPath } from "../../../utilities/courseTrack";
import { countLabel } from "../../../utilities/countLabel";
import { useMyCoursesPageController } from "./useMyCoursesPageController";

// What a student is enrolled in.
//
// Until now there was no such screen, while everything behind it already
// existed: the enrollments table, the admin's roster controls, the /courses/my
// endpoint and even the thunk that calls it. Being enrolled was something done TO
// a student that they could not see, and — until the visibility rule was wired —
// something that changed nothing for them either.
//
// Deliberately not CoursesPage with the controls hidden. That page is a
// management screen: it creates, edits, deletes and enrols, and its every row is
// an Accordion holding a roster. A student's answer to "what am I in" is a short
// list, and building it out of a management screen would mean every future change
// there having to remember a mode it was not designed for.

const MyCoursesPage = () => {
  const {
    courses,
    navigate,
    loadingFirstTime,
    pendingRequests,
    cancelRequest,
    join,
    openJoin,
  } = useMyCoursesPageController();

  if (loadingFirstTime) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Typography variant="h4" fontWeight={800} color="primary">הקורסים שלי</Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {courses.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {countLabel(courses.length, "קורס אחד", "קורסים")}
            </Typography>
          )}
          {/* PRD ROST-9. */}
          <Button variant="contained" endIcon={<VpnKeyOutlinedIcon />} onClick={openJoin}>הצטרפות לקורס</Button>
        </Box>
      </Box>

      {/* Requests the lecturer has not answered yet — so a student who typed
          a code sees that it went somewhere, until the course itself appears. */}
      {pendingRequests.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>ממתינים לאישור המרצה</Typography>
          {pendingRequests.map((request) => (
            <Box key={request.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
              <HourglassEmptyIcon fontSize="small" color="warning" />
              <Typography sx={{ flex: 1 }}>
                {request.course_title}
                {request.lecturer_name && <Typography component="span" color="text.secondary"> · {request.lecturer_name}</Typography>}
              </Typography>
              <Button size="small" color="inherit" onClick={() => cancelRequest(request.id)}>ביטול הבקשה</Button>
            </Box>
          ))}
        </Paper>
      )}

      {courses.length === 0 ? (
        // Joining by code is the way in a student can take themselves; the
        // archive's general library is still open to them meanwhile.
        <NoDataDialog
          message="עדיין לא שויכת לאף קורס. קיבלת קוד מהמרצה? אפשר להצטרף איתו."
          actionLabel="הצטרפות לקורס"
          onAction={openJoin}
        />
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" } }}>
          {courses.map((course) => (
            <Card key={course.id} sx={{ borderRadius: 2 }}>
              <CardActionArea onClick={() => navigate(trackPath(course.id))} sx={{ p: 2, textAlign: "start", height: "100%" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <SchoolOutlinedIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={800} color="primary">
                    {course.title}
                  </Typography>
                </Box>

                {course.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", mb: 1 }}
                  >
                    {course.description}
                  </Typography>
                )}

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {course.lecturer_name && (
                    <Chip label={course.lecturer_name} size="small" variant="outlined" />
                  )}
                  {/* The count comes back with the row — see LIST_COLUMNS in
                      servicesCourses — so no request per card is needed. */}
                  {course.media_count > 0 && (
                    <Chip
                      label={countLabel(course.media_count, "שיעור אחד", "שיעורים")}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      )}

      <JoinCourseDialog {...join} />
    </Box>
  );
};

export default MyCoursesPage;
