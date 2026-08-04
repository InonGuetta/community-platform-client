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
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CourseFormDialog from "./componentsCourses/CourseFormDialog";
import CourseRoster from "./componentsCourses/CourseRoster";
import NoDataDialog from "../../features/NoDataDialog/NoDataDialog";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import useCoursesPageController from "./useCoursesPageController";
import { statuses } from "../../../utilities/constant";

const CoursesPage = () => {
  const {
    courses, status, lecturers, students, isAdmin, canManage,
    createOpen, setCreateOpen,
    editCourse, setEditCourse,
    deleteTarget, setDeleteTarget,
    rosterCourseId, setRosterCourseId,
    handleCreate, handleUpdate, handleDeleteConfirm, handleEnroll, handleUnenroll,
  } = useCoursesPageController();

  if (status === statuses.loading && courses.length === 0) {
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

      {courses.length === 0 ? (
        <NoDataDialog
          message="עדיין לא הוגדרו קורסים"
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
              <CourseRoster
                courseId={course.id}
                students={students}
                canEnroll={isAdmin}
                onEnroll={handleEnroll}
                onUnenroll={handleUnenroll}
              />
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
