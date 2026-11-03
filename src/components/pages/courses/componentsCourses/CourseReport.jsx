import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import CircularProgress from "@mui/material/CircularProgress";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import TimelapseIcon from "@mui/icons-material/Timelapse";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { coursesApi } from "../../../../api/coursesApi";
import { notify } from "../../../../store/slicesAndThunks/notificationSlice";
import { reportCsv, reportFileName } from "../../../../utilities/courseReport";
import { CSV_BOM } from "../../../../utilities/rosterCsv";
import { saveBlob } from "../../../../utilities/saveBlob";
import { formatHebrewDate } from "../../../../utilities/formatDate";
import { formatTime } from "../../../../utilities/formatTime";

// "מי שמע מה" (PRD CRS-4): every student in the course against every recording,
// in the track's order. Shown to the course's lecturer on the course page —
// the server refuses everyone else.
//
// A grid rather than a list per student, because the questions a lecturer asks
// run both ways: "has Dana kept up?" is a row, "did anyone get to lesson 7?" is
// a column. On a phone it scrolls sideways, with the names held in place.

const useCourseReport = (courseId) => {
  const dispatch = useDispatch();
  const [state, setState] = useState({ status: "loading", report: null });
  useEffect(() => {
    let current = true;
    coursesApi.getReport(courseId)
      .then((report) => { if (current) setState({ status: "succeeded", report }); })
      .catch(() => { if (current) setState({ status: "failed", report: null }); });
    return () => { current = false; };
  }, [courseId]);

  const exportCsv = (courseTitle) => {
    try {
      saveBlob(new Blob([CSV_BOM + reportCsv(state.report)], { type: "text/csv;charset=utf-8" }), reportFileName(courseTitle));
    } catch {
      dispatch(notify({ message: "ייצוא הדוח נכשל", severity: "error" }));
    }
  };
  return { ...state, exportCsv };
};

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
  if (cell?.status === "done") {
    return <Tooltip title={`${lessonTitle}: הושלם`}><CheckCircleIcon fontSize="small" sx={{ color: "success.main" }} aria-label="הושלם" /></Tooltip>;
  }
  if (cell?.status === "started") {
    return (
      <Tooltip title={`${lessonTitle}: הגיע ל-${formatTime(cell.position)}`}>
        <TimelapseIcon fontSize="small" sx={{ color: "warning.main" }} aria-label={`התחיל, הגיע ל-${formatTime(cell.position)}`} />
      </Tooltip>
    );
  }
  return <Box component="span" aria-label="עוד לא" sx={{ color: "text.disabled" }}>·</Box>;
};

const CourseReport = ({ courseId, courseTitle }) => {
  const { status, report, exportCsv } = useCourseReport(courseId);

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 4, borderRadius: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>מי שמע מה</Typography>
        {report?.students?.length > 0 && report.lessons.length > 0 && (
          <Button size="small" variant="outlined" endIcon={<FileDownloadOutlinedIcon />} onClick={() => exportCsv(courseTitle)}>
            ייצוא ל-CSV
          </Button>
        )}
      </Box>

      {status === "loading" && <CircularProgress size={24} />}
      {status === "failed" && <Typography color="text.secondary">לא ניתן לטעון את הדוח כרגע.</Typography>}
      {status === "succeeded" && report.students.length === 0 && (
        <Typography color="text.secondary">עוד אין תלמידים רשומים לקורס.</Typography>
      )}
      {status === "succeeded" && report.students.length > 0 && report.lessons.length === 0 && (
        <Typography color="text.secondary">אין בקורס הקלטות שאפשר לעקוב אחרי ההאזנה להן.</Typography>
      )}

      {status === "succeeded" && report.students.length > 0 && report.lessons.length > 0 && (
        <Box sx={{ overflowX: "auto" }}>
          <Box component="table" sx={{ borderCollapse: "collapse", width: "100%" }} aria-label="התקדמות התלמידים בקורס">
            <thead>
              <tr>
                <Box component="th" scope="col" sx={{ ...nameCellSx, fontWeight: 700 }}>תלמיד</Box>
                <Box component="th" scope="col" sx={{ ...cellSx, fontWeight: 700, minWidth: 70 }}>הושלמו</Box>
                {report.lessons.map((lesson, i) => (
                  <Box component="th" scope="col" key={lesson.id} sx={{ ...cellSx, fontWeight: 700 }}>
                    <Tooltip title={`${lesson.title} · השלימו ${lesson.completedBy} מתוך ${report.students.length}`}>
                      <Box component="span" aria-label={`שיעור ${i + 1}: ${lesson.title}`}>{i + 1}</Box>
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
                      {student.lastActivity ? `פעיל לאחרונה ${formatHebrewDate(student.lastActivity)}` : "עוד לא האזין"}
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
