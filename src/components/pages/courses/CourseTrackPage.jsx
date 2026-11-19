import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import DirectionalIcon from "../../../components/features/DirectionalIcon/DirectionalIcon";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import TimelapseIcon from "@mui/icons-material/Timelapse";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { useCourseTrackPageController } from "./useCourseTrackPageController";
import CourseReport from "./componentsCourses/CourseReport";
import { useDragReorder, dropIndicatorSx } from "../../../utilities/useDragReorder";
import { lessonStatus, progressText, progressPercent } from "../../../utilities/courseTrack";
import { formatTime } from "../../../utilities/formatTime";
import { useTranslation } from "react-i18next";

// A course as a track (PRD CRS-1, CRS-2): its lessons in the lecturer's order,
// how far this reader has got, and where to carry on. The course's lecturer
// arranges the order here, by dragging a row or with the arrow keys on it.

const LESSON_DRAG_MIME = "application/x-community-lesson";

const STATUS = {
  done: { Icon: CheckCircleIcon, color: "success.main" },
  started: { Icon: TimelapseIcon, color: "warning.main" },
  new: { Icon: RadioButtonUncheckedIcon, color: "text.disabled" },
  book: { Icon: MenuBookOutlinedIcon, color: "primary.main" },
};

const LessonRow = ({ lesson, index, canArrange, drag, onOpen }) => {
  const { t } = useTranslation("courses");
  const status = lessonStatus(lesson);
  const { Icon, color } = STATUS[status];
  const label = t(`track.status.${status}`);
  const detail = [
    status === "started" && lesson.last_position_seconds > 0 && t("track.reached", { time: formatTime(lesson.last_position_seconds) }),
    lesson.duration_seconds > 0 && formatTime(lesson.duration_seconds),
  ].filter(Boolean).join(" · ");

  return (
    <Paper
      variant="outlined"
      {...(canArrange && { ...drag.itemProps(lesson.id), ...drag.keyProps(lesson.id) })}
      tabIndex={canArrange ? 0 : undefined}
      aria-label={canArrange ? t("track.dragHint", { index, title: lesson.title }) : undefined}
      sx={{
        display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 2,
        opacity: drag?.isDragging(lesson.id) ? 0.4 : 1,
        ...(canArrange && dropIndicatorSx(drag.markerFor(lesson.id))),
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" },
      }}
    >
      {canArrange && <DragIndicatorIcon sx={{ color: "text.disabled", cursor: "grab" }} aria-hidden />}
      <Typography sx={{ width: 28, textAlign: "center", fontWeight: 700, color: "text.secondary" }}>{index}</Typography>
      <Box component="span" title={label} sx={{ display: "flex", color }}>
        <Icon aria-label={label} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="button"
          dir="auto"
          onClick={() => onOpen(lesson.id)}
          sx={{ all: "unset", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" } }}
        >
          {lesson.title}
        </Typography>
        {detail && <Typography variant="body2" color="text.secondary">{detail}</Typography>}
      </Box>
      {lesson.is_published === false && <Chip label={t("track.draft")} size="small" />}
    </Paper>
  );
};

const CourseTrackPage = () => {
  const { t } = useTranslation("courses");
  const c = useCourseTrackPageController();
  const drag = useDragReorder({
    ids: c.lessons.map((l) => l.id),
    onReorder: c.reorder,
    disabled: !c.canArrange,
    mime: LESSON_DRAG_MIME,
  });

  if (c.status === "loading") {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Box sx={{ maxWidth: 860, mx: "auto", p: { xs: 2, sm: 3 } }}>
        <Button size="small" startIcon={<DirectionalIcon toward="back" />} onClick={c.goToMyCourses} sx={{ mb: 2 }}>
          {t("track.myCourses")}
        </Button>

        {c.status === "failed" ? (
          <Alert severity={c.forbidden ? "info" : "error"}>
            {c.forbidden
              ? t("track.forbidden")
              : t("track.loadFailed")}
          </Alert>
        ) : (
          <>
            <Typography variant="h4" fontWeight={800} color="primary" dir="auto">{c.course.title}</Typography>
            {c.course.lecturer_name && (
              <Typography color="text.secondary" sx={{ mb: 1 }}>{c.course.lecturer_name}</Typography>
            )}
            {c.course.description && <Typography dir="auto" sx={{ mb: 2 }}>{c.course.description}</Typography>}

            {c.summary.total > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography fontWeight={700} data-testid="track-progress">{progressText(c.summary)}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={progressPercent(c.summary)}
                      aria-label={t("track.progress")}
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  {c.next && (
                    <Button variant="contained" endIcon={<PlayArrowRoundedIcon />} onClick={() => c.openLesson(c.next.id)}>
                      {t(c.summary.completed > 0 || c.next.last_position_seconds > 0 ? "track.continue" : "track.start", { title: c.next.title })}
                    </Button>
                  )}
                </Box>
              </Paper>
            )}

            {c.canArrange && c.lessons.length > 1 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t("track.arrangeHint")}
              </Typography>
            )}

            {c.lessons.length === 0 ? (
              <Typography color="text.secondary">{t("track.empty")}</Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {c.lessons.map((lesson, i) => (
                  <LessonRow key={lesson.id} lesson={lesson} index={i + 1} canArrange={c.canArrange} drag={drag} onOpen={c.openLesson} />
                ))}
              </Box>
            )}

            {/* PRD CRS-4 — for whoever arranges the course, who is its lecturer. */}
            {c.canArrange && <CourseReport courseId={c.course.id} courseTitle={c.course.title} />}
          </>
        )}
      </Box>
    </Box>
  );
};

export default CourseTrackPage;
