import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
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
import PageHeader from "../../features/PageHeader/PageHeader";
import EmptyState from "../../features/EmptyState/EmptyState";
import StatusBadge from "../../features/StatusBadge/StatusBadge";
import SegmentedControl from "../../features/SegmentedControl/SegmentedControl";
import { DOCK, RADIUS } from "../../../theme/tokens";
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
    <Box>
      <PageHeader
        title={t("title")}
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            {t("newCourse")}
          </Button>
        }
      />

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
        <SegmentedControl
          value={scope}
          onChange={setScope}
          label={t("title")}
          options={[
            { value: "mine", label: t("tabs.mine") },
            { value: "all", label: t("tabs.all") },
          ]}
          sx={{ mb: 3 }}
        />
      )}

      {totalCourses === 0 ? (
        <EmptyState
          icon={SchoolOutlinedIcon}
          title={t("noneDefined")}
          action={{ label: t("newCourse"), onClick: () => setCreateOpen(true) }}
        />
      ) : courses.length === 0 ? (
        // Courses exist, none of them this lecturer's. Saying "no courses"
        // here would contradict the switch right above it.
        <EmptyState
          icon={SchoolOutlinedIcon}
          title={t("noneOwn")}
          action={{ label: t("newCourse"), onClick: () => setCreateOpen(true) }}
        />
      ) : (
        courses.map((course) => (
          <Accordion
            key={course.id}
            expanded={rosterCourseId === course.id}
            onChange={(_, open) => setRosterCourseId(open ? course.id : null)}
            disableGutters
            sx={{
              mb: 2,
              borderRadius: `${RADIUS.card}px !important`,
              "&::before": { display: "none" },
              overflow: "hidden",
            }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 3, py: 1 }}>
              <Box
                aria-hidden
                sx={{
                  width: 48, height: 48, flexShrink: 0, display: "grid", placeItems: "center",
                  borderRadius: `${RADIUS.menu}px`, background: DOCK.gradient.myCourses, color: "common.white",
                  marginInlineEnd: 2,
                }}
              >
                <SchoolOutlinedIcon />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexGrow: 1, flexWrap: "wrap" }}>
                <Typography fontWeight={800} fontSize={18} dir="auto" sx={{ marginInlineEnd: 1 }}>{course.title}</Typography>
                {!course.is_active && <StatusBadge tone="neutral">{t("inactive")}</StatusBadge>}
                <StatusBadge tone="neutral">{course.lecturer_name || t("noLecturer")}</StatusBadge>
                <StatusBadge tone="indigo">{t("students", { count: Number(course.student_count) || 0 })}</StatusBadge>
                <StatusBadge tone="success">{t("lessons", { count: Number(course.media_count) || 0 })}</StatusBadge>
                {!canManage(course) && <StatusBadge tone="neutral">{t("viewOnly")}</StatusBadge>}
                {/* PRD ROST-9 — only the course's manager is sent the count. */}
                {course.pending_join_count > 0 && (
                  <StatusBadge tone="warning">{t("joinRequests", { count: course.pending_join_count })}</StatusBadge>
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
                    <IconButton size="small" sx={{ color: "surface.danger" }} onClick={() => setDeleteTarget(course)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </AccordionSummary>

            <AccordionDetails sx={{ px: 3, pb: 3 }}>
              {/* The course as students follow it, where its lecturer also sets
                  the order of its lessons (PRD CRS-1). A banner on the soft
                  accent, as the mockup draws it. */}
              <Box
                sx={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap",
                  p: 2, mb: 2, borderRadius: `${RADIUS.menu}px`, bgcolor: "surface.accentSoft",
                }}
              >
                {course.description ? (
                  <Typography variant="body2" color="text.secondary" dir="auto" sx={{ flex: 1, minWidth: 200 }}>
                    {course.description}
                  </Typography>
                ) : <Box sx={{ flex: 1 }} />}
                <Button component={RouterLink} to={trackPath(course.id)} size="small" variant="contained">
                  {canManage(course) ? t("pageManage") : t("page")}
                </Button>
              </Box>
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
