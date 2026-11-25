import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import VpnKeyOutlinedIcon from "@mui/icons-material/VpnKeyOutlined";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import PageHeader from "../../features/PageHeader/PageHeader";
import EmptyState from "../../features/EmptyState/EmptyState";
import StatusBadge from "../../features/StatusBadge/StatusBadge";
import JoinCourseDialog from "./componentsCourses/JoinCourseDialog";
import { RADIUS } from "../../../theme/tokens";
import { trackPath } from "../../../utilities/courseTrack";
import { useMyCoursesPageController } from "./useMyCoursesPageController";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("courses");
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
    <Box>
      <PageHeader
        title={t("mine.title")}
        subtitle={courses.length > 0 ? t("mine.count", { count: courses.length }) : undefined}
        actions={
          /* PRD ROST-9. */
          <Button variant="contained" endIcon={<VpnKeyOutlinedIcon />} onClick={openJoin}>{t("mine.join")}</Button>
        }
      />

      {/* Requests the lecturer has not answered yet — so a student who typed
          a code sees that it went somewhere, until the course itself appears. */}
      {pendingRequests.length > 0 && (
        <Paper sx={{ p: 2.5, mb: 3, borderRadius: `${RADIUS.card}px` }}>
          <Typography fontWeight={700} sx={{ mb: 1 }}>{t("mine.awaiting")}</Typography>
          {pendingRequests.map((request) => (
            <Box key={request.id} sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
              <HourglassEmptyIcon fontSize="small" color="warning" />
              <Typography sx={{ flex: 1 }}>
                {request.course_title}
                {request.lecturer_name && <Typography component="span" color="text.secondary"> · {request.lecturer_name}</Typography>}
              </Typography>
              <Button size="small" variant="soft" onClick={() => cancelRequest(request.id)}>{t("mine.cancelRequest")}</Button>
            </Box>
          ))}
        </Paper>
      )}

      {courses.length === 0 ? (
        // Joining by code is the way in a student can take themselves; the
        // archive's general library is still open to them meanwhile.
        <EmptyState
          icon={SchoolOutlinedIcon}
          title={t("mine.none")}
          text={t("mine.noneText")}
          action={{ label: t("mine.join"), onClick: openJoin }}
        />
      ) : (
        <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "1fr 1fr 1fr" } }}>
          {courses.map((course) => (
            <Card key={course.id} sx={{ borderRadius: `${RADIUS.card}px` }}>
              <CardActionArea
                onClick={() => navigate(trackPath(course.id))}
                sx={{ p: 3, textAlign: "start", height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start" }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
                  <Box
                    sx={{
                      width: 40, height: 40, flexShrink: 0, display: "grid", placeItems: "center",
                      borderRadius: `${RADIUS.menu}px`, bgcolor: "surface.accentSoft", color: "primary.main",
                    }}
                  >
                    <SchoolOutlinedIcon fontSize="small" />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={800} dir="auto">
                    {course.title}
                  </Typography>
                </Box>

                {course.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    dir="auto"
                    sx={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden", mb: 1.5 }}
                  >
                    {course.description}
                  </Typography>
                )}

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {course.lecturer_name && <StatusBadge tone="neutral" size="small">{course.lecturer_name}</StatusBadge>}
                  {/* The count comes back with the row — see LIST_COLUMNS in
                      servicesCourses — so no request per card is needed. */}
                  {course.media_count > 0 && (
                    <StatusBadge tone="indigo" size="small">
                      {t("lessons", { count: Number(course.media_count) || 0 })}
                    </StatusBadge>
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
