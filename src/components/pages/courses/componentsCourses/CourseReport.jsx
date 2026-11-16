import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TimelapseIcon from "@mui/icons-material/Timelapse";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { formatDate } from "../../../../utilities/formatDate";
import { formatTime } from "../../../../utilities/formatTime";
import { useCourseReport } from "./useCourseReport";
import { useTranslation } from "react-i18next";

// "מי שמע מה" (PRD CRS-4): every student in the course against every recording,
// in the track's order. Shown to the course's lecturer on the course page —
// the server refuses everyone else.
//
// A grid rather than a list per student, because the questions a lecturer asks
// run both ways: "has Dana kept up?" is a row, "did anyone get to lesson 7?" is
// a column. On a phone it scrolls sideways, with the names held in place.

const nameCellSx = {
  position: "sticky",
  insetInlineStart: 0,
  zIndex: 1,
  bgcolor: "background.paper",
  minWidth: 160,
  maxWidth: 220,
  textAlign: "start",
  px: 1.5,
  py: 1,
  borderBottom: 1,
  borderColor: "divider",
};
const cellSx = { textAlign: "center", px: 0.5, py: 1, borderBottom: 1, borderColor: "divider", minWidth: 44 };

const StatusCell = ({ cell, lessonTitle }) => {
  const { t } = useTranslation("courses");
  if (cell?.status === "done") {
    return <Tooltip title={t("report.doneOf", { title: lessonTitle })}><CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} aria-label={t("report.done")} /></Tooltip>;
  }
  if (cell?.status === "started") {
    return (
      <Tooltip title={t("report.reachedOf", { title: lessonTitle, time: formatTime(cell.position) })}>
        <TimelapseIcon fontSize="small" sx={{ color: "warning.main" }} aria-label={t("report.started", { time: formatTime(cell.position) })} />
      </Tooltip>
    );
  }
  return <Box component="span" aria-label={t("report.notYet")} sx={{ color: "text.disabled" }}>·</Box>;
};

const CourseReport = ({ courseId, courseTitle }) => {
  const { t } = useTranslation("courses");
  const { status, report, exportCsv } = useCourseReport(courseId);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 4, borderRadius: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>{t("report.title")}</Typography>
        {report?.students?.length > 0 && report.lessons.length > 0 && (
          <Button size="small" variant="outlined" endIcon={<FileDownloadOutlinedIcon />} onClick={() => exportCsv(courseTitle)}>
            {t("report.export")}
          </Button>
        )}
      </Box>

      {status === "loading" && <CircularProgress size={24} />}
      {status === "failed" && <Typography color="text.secondary">{t("report.loadFailed")}</Typography>}
      {status === "succeeded" && report.students.length === 0 && (
        <Typography color="text.secondary">{t("report.noStudents")}</Typography>
      )}
      {status === "succeeded" && report.students.length > 0 && report.lessons.length === 0 && (
        <Typography color="text.secondary">{t("report.noRecordings")}</Typography>
      )}

      {status === "succeeded" && report.students.length > 0 && report.lessons.length > 0 && (
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ borderCollapse: "collapse", width: "100%" }} aria-label={t("report.tableLabel")}>
            <thead>
              <tr>
                <Box component="th" scope="col" sx={{ ...nameCellSx, fontWeight: 700 }}>{t("report.student")}</Box>
                <Box component="th" scope="col" sx={{ ...cellSx, fontWeight: 700, minWidth: 70 }}>{t("report.completed")}</Box>
                {report.lessons.map((lesson, i) => (
                  <Box component="th" scope="col" key={lesson.id} sx={{ ...cellSx, fontWeight: 700 }}>
                    <Tooltip title={t("report.lessonCompletedBy", { title: lesson.title, completed: lesson.completedBy, total: report.students.length })}>
                      <Box component="span" aria-label={t("report.lessonLabel", { n: i + 1, title: lesson.title })}>{i + 1}</Box>
                    </Tooltip>
                  </Box>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.students.map((student) => (
                <tr key={student.id}>
                  <Box component="th" scope="row" sx={nameCellSx}>
                    <Typography fontWeight={600} noWrap title={student.email}>{student.display_name || student.email}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {student.lastActivity ? t("report.lastActive", { date: formatDate(student.lastActivity) }) : t("report.neverListened")}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ ...cellSx, fontWeight: 700 }} data-testid={`report-total-${student.id}`}>
                    {student.completed}/{report.lessons.length}
                  </Box>
                  {report.lessons.map((lesson) => (
                    <Box component="td" key={lesson.id} sx={cellSx}>
                      <StatusCell cell={student.cells[lesson.id]} lessonTitle={lesson.title} />
                    </Box>
                  ))}
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default CourseReport;
