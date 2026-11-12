import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
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

// A course as a track (PRD CRS-1, CRS-2): its lessons in the lecturer's order,
// how far this reader has got, and where to carry on. The course's lecturer
// arranges the order here, by dragging a row or with the arrow keys on it.

const LESSON_DRAG_MIME = "application/x-community-lesson";

const STATUS = {
  done: { Icon: CheckCircleIcon, color: "success.main", label: "הושלם" },
  started: { Icon: TimelapseIcon, color: "warning.main", label: "התחלת" },
  new: { Icon: RadioButtonUncheckedIcon, color: "text.disabled", label: "עוד לא" },
  book: { Icon: MenuBookOutlinedIcon, color: "primary.main", label: "לקריאה" },
};

const LessonRow = ({ lesson, index, canArrange, drag, onOpen }) => {
  const status = lessonStatus(lesson);
  const { Icon, color, label } = STATUS[status];
  const detail = [
    status === "started" && lesson.last_position_seconds > 0 && `הגעת ל-${formatTime(lesson.last_position_seconds)}`,
    lesson.duration_seconds > 0 && formatTime(lesson.duration_seconds),
  ].filter(Boolean).join(" · ");

  return (
    <Paper
      variant="outlined"
      {...(canArrange && { ...drag.itemProps(lesson.id), ...drag.keyProps(lesson.id) })}
      tabIndex={canArrange ? 0 : undefined}
      aria-label={canArrange ? `${index}. ${lesson.title} — אפשר לגרור, או להזיז בחצים` : undefined}
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
          onClick={() => onOpen(lesson.id)}
          sx={{ all: "unset", cursor: "pointer", fontWeight: 600, "&:hover": { textDecoration: "underline" }, "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main" } }}
        >
          {lesson.title}
        </Typography>
        {detail && <Typography variant="body2" color="text.secondary">{detail}</Typography>}
      </Box>
      {lesson.is_published === false && <Chip label="טיוטה" size="small" />}
    </Paper>
  );
};

const CourseTrackPage = () => {
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
        <Button size="small" startIcon={<ArrowForwardIcon />} onClick={c.goToMyCourses} sx={{ mb: 2 }}>
          הקורסים שלי
        </Button>

        {c.status === "failed" ? (
          <Alert severity={c.forbidden ? "info" : "error"}>
            {c.forbidden
              ? "השיעורים של הקורס הזה פתוחים לתלמידים הרשומים אליו. יש לך קוד מהמרצה? אפשר להצטרף ב״הקורסים שלי״."
              : "לא ניתן לטעון את הקורס כרגע."}
          </Alert>
        ) : (
          <>
            <Typography variant="h4" fontWeight={800} color="primary">{c.course.title}</Typography>
            {c.course.lecturer_name && (
              <Typography color="text.secondary" sx={{ mb: 1 }}>{c.course.lecturer_name}</Typography>
            )}
            {c.course.description && <Typography sx={{ mb: 2 }}>{c.course.description}</Typography>}

            {c.summary.total > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 3 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                  <Box sx={{ flex: 1, minWidth: 220 }}>
                    <Typography fontWeight={700} data-testid="track-progress">{progressText(c.summary)}</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={progressPercent(c.summary)}
                      aria-label="התקדמות בקורס"
                      sx={{ mt: 1, height: 8, borderRadius: 4 }}
                    />
                  </Box>
                  {c.next && (
                    <Button variant="contained" endIcon={<PlayArrowRoundedIcon />} onClick={() => c.openLesson(c.next.id)}>
                      {c.summary.completed > 0 || c.next.last_position_seconds > 0 ? "להמשיך" : "להתחיל"}: {c.next.title}
                    </Button>
                  )}
                </Box>
              </Paper>
            )}

            {c.canArrange && c.lessons.length > 1 && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                גררו שיעור כדי לשנות את הסדר, או סמנו אותו והזיזו בחצים. התלמידים רואים את הקורס בסדר הזה.
              </Typography>
            )}

            {c.lessons.length === 0 ? (
              <Typography color="text.secondary">עדיין אין שיעורים בקורס.</Typography>
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
