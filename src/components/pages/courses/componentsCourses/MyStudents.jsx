import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";

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

const MyStudents = ({ students = [] }) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
      <Typography variant="subtitle1" fontWeight={700}>
        התלמידים שלי
      </Typography>
      {students.length > 0 && <Chip label={students.length} size="small" color="info" />}
    </Box>

    {students.length === 0 ? (
      // Distinguishes "nobody yet" from "still loading" by saying what to do
      // next rather than describing the emptiness.
      <Typography variant="body2" color="text.secondary">
        אין עדיין תלמידים רשומים לקורסים שלך. ניתן לצרף תלמידים מתוך כל קורס למטה.
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
                  <Chip key={course.id} label={course.title} size="small" variant="outlined" />
                ))}
              </Box>

              {!student.is_active && <Chip label="לא פעיל" size="small" />}
            </Box>
          </Box>
        ))}
      </Box>
    )}
  </Paper>
);

export default MyStudents;
