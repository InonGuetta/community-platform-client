import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { useCourseRoster, MIN_SEARCH_LENGTH } from "./useCourseRoster";

// The enrolled students of one course, plus the control that adds another.
//
// `canEnroll` is now "do you manage THIS course" rather than "are you an admin":
// the server opened enrolment to the lecturer who teaches it, and gates it on
// ownership. The flag still decides whether the picker is rendered at all,
// rather than letting somebody press a button that answers 403.
//
// ── Why the picker searches instead of listing ──────────────────────────────
//
// It used to take a `students` array from the page, which came from
// fetchAllUsers — an ADMIN-ONLY endpoint, loaded behind `if (isAdmin)`. So for a
// lecturer the list was empty and would have stayed empty even after the server
// opened enrolment: a picker with no options and no error explaining why.
//
// The fix is not to open "all users" to lecturers. That would hand the community
// address book to everyone approved as a lecturer. It is to ask a question the
// server can answer safely — a search, minimum two characters, capped, scoped to
// this course and to people not already in it.
//
// `onUnenroll` receives the whole student, not an id: the page asks before
// removing anybody (ROST-8), and the question names the person.
const CourseRoster = ({ courseId, canEnroll, onEnroll, onUnenroll, onExport }) => {
  const { enrolled, picked, setPicked, query, setQuery, options, searching, add } = useCourseRoster({ courseId, canEnroll, onEnroll });

  return (
    <Box sx={{ pt: 1 }}>
      {canEnroll && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Autocomplete
            size="small"
            sx={{ flexGrow: 1 }}
            options={options}
            value={picked}
            onChange={(_, v) => setPicked(v)}
            inputValue={query}
            onInputChange={(_, v) => setQuery(v)}
            // The server already excludes people in this course, so no local
            // filter — and filterOptions off, because the list IS the search
            // result and re-filtering it client-side would hide matches the
            // server found by email while the user typed a name.
            filterOptions={(x) => x}
            loading={searching}
            getOptionLabel={(o) => o.display_name || o.email}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            noOptionsText={
              query.trim().length < MIN_SEARCH_LENGTH
                ? "הקלד לפחות שתי אותיות לחיפוש"
                : "לא נמצאו משתמשים"
            }
            renderInput={(params) => (
              <TextField {...params} label="חיפוש משתמש להוספה לקורס" />
            )}
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

      {canEnroll && onExport && enrolled.length > 0 && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
          <Button size="small" startIcon={<FileDownloadIcon />} onClick={() => onExport(enrolled)}>
            ייצוא ל‑CSV
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
              onDelete={canEnroll ? () => onUnenroll(courseId, s) : undefined}
              variant="outlined"
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default CourseRoster;
