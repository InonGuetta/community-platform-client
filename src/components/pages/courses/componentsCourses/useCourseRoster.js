import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { selectCourseStudents } from "../../../../store/selectors/coursesSelectors";
import { coursesApi } from "../../../../api/coursesApi";

// What a course's roster does — who is in it, the type-ahead that finds
// someone to add, and adding them — so that CourseRoster.jsx is layout only.

// Below this the server answers an empty list, so asking is pure round trip.
// Mirrored from MIN_SEARCH_LENGTH in the server's servicesCourses.js — the two
// repositories share no code, and the mismatch is harmless in this direction:
// a client that asks too early only wastes a request.
export const MIN_SEARCH_LENGTH = 2;

/**
 * @param {{ courseId: number, canEnroll: boolean, onEnroll: (courseId: number, userId: number) => Promise<any> }} props
 */
export const useCourseRoster = ({ courseId, canEnroll, onEnroll }) => {
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

  return { enrolled, picked, setPicked, query, setQuery, options, searching, add };
};
