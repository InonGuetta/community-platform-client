import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CourseFormDialog from "./componentsCourses/CourseFormDialog";
import CourseRoster from "./componentsCourses/CourseRoster";
import MyStudents from "./componentsCourses/MyStudents";
import JoinCodePanel from "./componentsCourses/JoinCodePanel";
import { Link as RouterLink } from "react-router-dom";
import { trackPath } from "../../../utilities/courseTrack";
import NoDataDialog from "../../features/NoDataDialog/NoDataDialog";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import useCoursesPageController from "./useCoursesPageController";
import { statuses } from "../../../utilities/constant";

const CoursesPage = () => {
  const {
    courses, totalCourses, status, lecturers, isAdmin, canManage, myStudents,
    isLecturer, scope, setScope,
    createOpen, setCreateOpen,
    editCourse, setEditCourse,
    deleteTarget, setDeleteTarget,
    rosterCourseId, setRosterCourseId,
    handleCreate, handleUpdate, handleDeleteConfirm, handleEnroll,
    unenrollTarget, handleUnenrollRequest, handleUnenrollCancel, handleUnenrollConfirm,
    handleExportRoster,
  } = useCoursesPageController();

  if (status === statuses.loading && totalCourses === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" fontWeight={800} color="primary">קורסים</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          קורס חדש
        </Button>
      </Box>

      {/* "My students" sits ABOVE the course list, because it is the answer to
          the question a lecturer opens this tab with — how many people am I
          actually teaching — and the per-course rosters below are the detail.
          It renders its own empty state rather than being hidden, so a lecturer
          with no students sees where they will appear. */}
      <Box sx={{ mb: 3 }}>
        <MyStudents students={myStudents} />
      </Box>

      {/* ROST-7. Other lecturers' courses are visible, read-only, one click
          away — a lecturer planning a course wants to see what already exists —
          but not mixed into the list they manage. */}
      {isLecturer && totalCourses > 0 && (
        <ToggleButtonGroup
          value={scope}
          exclusive
          size="small"
          onChange={(_, next) => next && setScope(next)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="mine">הקורסים שלי</ToggleButton>
          <ToggleButton value="all">כל הקורסים</ToggleButton>
        </ToggleButtonGroup>
      )}

      {totalCourses === 0 ? (
        <NoDataDialog
          message="עדיין לא הוגדרו קורסים"
          actionLabel="קורס חדש"
          onAction={() => setCreateOpen(true)}
        />
      ) : courses.length === 0 ? (
        // Courses exist, none of them this lecturer's. Saying "no courses"
        // here would contradict the switch right above it.
        <NoDataDialog
          message="עדיין אין לך קורסים משלך. הקורסים של מרצים אחרים נמצאים תחת ״כל הקורסים״."
          actionLabel="קורס חדש"
          onAction={() => setCreateOpen(true)}
        />
      ) : (
        courses.map((course) => (
          <Accordion
            key={course.id}
            expanded={rosterCourseId === course.id}
            onChange={(_, open) => setRosterCourseId(open ? course.id : null)}
            sx={{ mb: 1 }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexGrow: 1, flexWrap: "wrap" }}>
                <Typography fontWeight={700} color="primary">{course.title}</Typography>
                {!course.is_active && <Chip label="לא פעיל" size="small" color="default" />}
                <Chip label={course.lecturer_name || "ללא מרצה"} size="small" variant="outlined" />
                <Chip label={`${course.student_count} תלמידים`} size="small" color="info" variant="outlined" />
                <Chip label={`${course.media_count} שיעורים`} size="small" color="success" variant="outlined" />
                {!canManage(course) && <Chip label="צפייה בלבד" size="small" />}
                {/* PRD ROST-9 — only the course's manager is sent the count. */}
                {course.pending_join_count > 0 && (
                  <Chip
                    label={course.pending_join_count === 1 ? "בקשת הצטרפות אחת" : `${course.pending_join_count} בקשות הצטרפות`}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>

              {canManage(course) && (
                // The accordion header is itself a button, so every control
                // inside it has to stop the click from also toggling the panel.
                <Box sx={{ display: "flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title="עריכה">
                    <IconButton size="small" onClick={() => setEditCourse(course)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="מחיקה">
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(course)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </AccordionSummary>

            <AccordionDetails>
              {course.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {course.description}
                </Typography>
              )}
              {/* The course as students follow it, where its lecturer also sets
                  the order of its lessons (PRD CRS-1). */}
              <Button
                component={RouterLink}
                to={trackPath(course.id)}
                size="small"
                variant="outlined"
                sx={{ mb: 2 }}
              >
                {canManage(course) ? "דף הקורס: סדר השיעורים ומי שמע מה" : "דף הקורס"}
              </Button>
              {/* Mounted only for the open course: it reads that course's queue
                  of names and addresses, which no other course needs. */}
              {canManage(course) && rosterCourseId === course.id && <JoinCodePanel course={course} />}
              {canManage(course) ? (
                <CourseRoster
                  courseId={course.id}
                  // Ownership, not role. The server gates enrolment on managing
                  // THIS course, so an admin sees the picker everywhere and a
                  // lecturer only on the courses they teach.
                  canEnroll
                  onEnroll={handleEnroll}
                  onUnenroll={handleUnenrollRequest}
                  onExport={(students) => handleExportRoster(course, students)}
                />
              ) : (
                // Not the roster: who studies in a colleague's course is names
                // and emails, and the server refuses it. The count in the header
                // is the part that is anybody's business.
                <Typography variant="body2" color="text.secondary">
                  רשימת התלמידים גלויה רק למרצה של הקורס.
                </Typography>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}

      <CourseFormDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        lecturers={lecturers}
        canAssignLecturer={isAdmin}
      />
      {editCourse && (
        <CourseFormDialog
          open
          onClose={() => setEditCourse(null)}
          onSubmit={handleUpdate}
          lecturers={lecturers}
          canAssignLecturer={isAdmin}
          initial={editCourse}
        />
      )}

      {/* ROST-8 — removal is immediate and takes the course's lessons with it. */}
      <ConfirmingDeletionDialog
        open={Boolean(unenrollTarget)}
        onClose={handleUnenrollCancel}
        onConfirm={handleUnenrollConfirm}
        title="הסרה מהקורס"
        confirmLabel="הסרה"
        message={
          unenrollTarget && (
            <>
              להסיר את <strong>{unenrollTarget.student.display_name || unenrollTarget.student.email}</strong> מהקורס{" "}
              <strong>{unenrollTarget.course?.title}</strong>? הגישה לשיעורי הקורס תיחסם מיד. אפשר לרשום שוב בכל עת.
            </>
          )
        }
      />

      <ConfirmingDeletionDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.title}
        type="course"
      />
    </Box>
  );
};

export default CoursesPage;
