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
import { useTranslation, Trans } from "react-i18next";

const CoursesPage = () => {
  const { t } = useTranslation("courses");
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
        <Typography variant="h4" fontWeight={800} color="primary">{t("title")}</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          {t("newCourse")}
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
          <ToggleButton value="mine">{t("tabs.mine")}</ToggleButton>
          <ToggleButton value="all">{t("tabs.all")}</ToggleButton>
        </ToggleButtonGroup>
      )}

      {totalCourses === 0 ? (
        <NoDataDialog
          message={t("noneDefined")}
          actionLabel={t("newCourse")}
          onAction={() => setCreateOpen(true)}
        />
      ) : courses.length === 0 ? (
        // Courses exist, none of them this lecturer's. Saying "no courses"
        // here would contradict the switch right above it.
        <NoDataDialog
          message={t("noneOwn")}
          actionLabel={t("newCourse")}
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
                <Typography fontWeight={700} color="primary" dir="auto">{course.title}</Typography>
                {!course.is_active && <Chip label={t("inactive")} size="small" color="default" />}
                <Chip label={course.lecturer_name || t("noLecturer")} size="small" variant="outlined" />
                <Chip label={t("students", { count: Number(course.student_count) || 0 })} size="small" color="info" variant="outlined" />
                <Chip label={t("lessons", { count: Number(course.media_count) || 0 })} size="small" color="success" variant="outlined" />
                {!canManage(course) && <Chip label={t("viewOnly")} size="small" />}
                {/* PRD ROST-9 — only the course's manager is sent the count. */}
                {course.pending_join_count > 0 && (
                  <Chip
                    label={t("joinRequests", { count: course.pending_join_count })}
                    size="small"
                    color="warning"
                  />
                )}
              </Box>

              {canManage(course) && (
                // The accordion header is itself a button, so every control
                // inside it has to stop the click from also toggling the panel.
                <Box sx={{ display: "flex", gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                  <Tooltip title={t("edit")}>
                    <IconButton size="small" onClick={() => setEditCourse(course)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t("delete")}>
                    <IconButton size="small" color="error" onClick={() => setDeleteTarget(course)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </AccordionSummary>

            <AccordionDetails>
              {course.description && (
                <Typography variant="body2" color="text.secondary" dir="auto" sx={{ mb: 2 }}>
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
                {canManage(course) ? t("pageManage") : t("page")}
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
                  {t("rosterPrivate")}
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
        title={t("unenroll.title")}
        confirmLabel={t("unenroll.confirm")}
        message={
          unenrollTarget && (
            <Trans
              t={t}
              i18nKey="unenroll.question"
              values={{ student: unenrollTarget.student.display_name || unenrollTarget.student.email, course: unenrollTarget.course?.title }}
              components={{ strong: <strong /> }}
            />
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
