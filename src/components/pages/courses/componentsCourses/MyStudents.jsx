import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import { RADIUS } from "../../../../theme/tokens";
import Divider from "@mui/material/Divider";
import { useTranslation } from "react-i18next";

// "Who learns with me" — every distinct person enrolled in any course this
// lecturer teaches.
//
// A different question from the per-course roster, and therefore a different
// screen rather than a filter on it. The roster answers "who is in this course";
// this answers "how many people am I actually teaching", which a lecturer with
// four courses cannot get by opening four accordions and adding up.
//
// The server groups it, so somebody in three of these courses arrives ONCE with
// three course chips. Ungrouped it would read as a roster of thirty for a
// lecturer who teaches ten people.

const MyStudents = ({ students = [] }) => {
  const { t } = useTranslation("courses");
  return (
  <Paper sx={{ p: 3, borderRadius: `${RADIUS.card}px` }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      <Typography variant="subtitle1" component="h2" fontWeight={800} fontSize={18}>
        {t("myStudents.title")}
      </Typography>
      {students.length > 0 && <StatusBadge tone="indigo">{students.length}</StatusBadge>}
    </Box>

    {students.length === 0 ? (
      // Distinguishes "nobody yet" from "still loading" by saying what to do
      // next rather than describing the emptiness.
      <Typography variant="body2" color="text.secondary">
        {t("myStudents.empty")}
      </Typography>
    ) : (
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {students.map((student, index) => (
          <Box key={student.id}>
            {index > 0 && <Divider />}
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
                py: 1.25,
                opacity: student.is_active ? 1 : 0.5,
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" fontWeight={600} noWrap>
                  {student.display_name || student.email}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {student.email}
                </Typography>
              </Box>

              {/* Which of MY courses they are in. The chips are the answer to
                  "why is this person on my list", which a bare name is not. */}
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {(student.courses || []).map((course) => (
                  <StatusBadge key={course.id} tone="neutral" size="small">{course.title}</StatusBadge>
                ))}
              </Box>

              {!student.is_active && <StatusBadge tone="neutral" size="small">{t("inactive")}</StatusBadge>}
            </Box>
          </Box>
        ))}
      </Box>
    )}
  </Paper>
  );
};

export default MyStudents;
