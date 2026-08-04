import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { selectCourseStudents } from "../../../../store/selectors/coursesSelectors";

// The enrolled students of one course, plus the control that adds another.
// Enrolling is admin-only on the server, so `canEnroll` decides whether the
// picker is rendered at all rather than letting a lecturer press a button that
// answers 403.
const CourseRoster = ({ courseId, students, canEnroll, onEnroll, onUnenroll }) => {
  const selectRoster = useMemo(() => selectCourseStudents(courseId), [courseId]);
  const enrolled = useSelector(selectRoster);
  const [picked, setPicked] = useState(null);

  // Someone already in the course must not be offered again — the server would
  // answer 409, which is correct but a pointless way to find out.
  const enrolledIds = new Set(enrolled.map((s) => s.id));
  const available = students.filter((s) => !enrolledIds.has(s.id));

  const add = async () => {
    if (!picked) return;
    await onEnroll(courseId, picked.id);
    setPicked(null);
  };

  return (
    <Box sx={{ pt: 1 }}>
      {canEnroll && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Autocomplete
            size="small"
            sx={{ flexGrow: 1 }}
            options={available}
            value={picked}
            onChange={(_, v) => setPicked(v)}
            getOptionLabel={(o) => o.display_name || o.email}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            noOptionsText="אין תלמידים זמינים"
            renderInput={(params) => <TextField {...params} label="הוספת תלמיד לקורס" />}
          />
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            onClick={add}
            disabled={!picked}
          >
            הוספה
          </Button>
        </Box>
      )}

      {enrolled.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          אין תלמידים רשומים לקורס זה.
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
          {enrolled.map((s) => (
            <Chip
              key={s.id}
              label={s.display_name || s.email}
              // onDelete is what renders the X, so a lecturer viewing the roster
              // sees names without a remove affordance they cannot use.
              onDelete={canEnroll ? () => onUnenroll(courseId, s.id) : undefined}
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CourseRoster;
