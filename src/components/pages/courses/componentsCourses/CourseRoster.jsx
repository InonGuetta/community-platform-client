import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { selectCourseStudents } from "../../../../store/selectors/coursesSelectors";
import { coursesApi } from "../../../../api/coursesApi";

// Below this the server answers an empty list, so asking is pure round trip.
// Mirrored from MIN_SEARCH_LENGTH in the server's servicesCourses.js — the two
// repositories share no code, and the mismatch is harmless in this direction:
// a client that asks too early only wastes a request.
const MIN_SEARCH_LENGTH = 2;

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
const CourseRoster = ({ courseId, canEnroll, onEnroll, onUnenroll }) => {
  const selectRoster = useMemo(() => selectCourseStudents(courseId), [courseId]);
  const enrolled = useSelector(selectRoster);
  const [picked, setPicked] = useState(null);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [searching, setSearching] = useState(false);

  // Debounced, because this fires per keystroke and each one is a request.
  // The cleanup both cancels the pending timer and marks the in-flight result
  // stale, so a slow early response cannot land after a faster later one and
  // repopulate the list with results for a query the user has moved on from.
  useEffect(() => {
    const term = query.trim();
    if (!canEnroll || term.length < MIN_SEARCH_LENGTH) {
      setOptions([]);
      return undefined;
    }

    let stale = false;
    setSearching(true);
    const timer = setTimeout(() => {
      coursesApi
        .searchEnrollable(courseId, term)
        .then((rows) => { if (!stale) setOptions(rows); })
        // Silent: a failed type-ahead shows no options, which is the same thing
        // the user sees while typing anyway. A toast per keystroke is worse than
        // the empty list.
        .catch(() => { if (!stale) setOptions([]); })
        .finally(() => { if (!stale) setSearching(false); });
    }, 250);

    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, courseId, canEnroll]);

  const add = async () => {
    if (!picked) return;
    await onEnroll(courseId, picked.id);
    setPicked(null);
    // Clearing the query empties the options through the effect, so the person
    // just added cannot be offered a second time from a stale list.
    setQuery("");
  };

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
