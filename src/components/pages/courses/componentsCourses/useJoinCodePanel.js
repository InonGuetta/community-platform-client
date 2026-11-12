import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchJoinRequests } from "../../../../store/slicesAndThunks/coursesSlice/coursesGet";
import { createJoinCode, decideJoinRequest } from "../../../../store/slicesAndThunks/coursesSlice/coursesPost";
import { removeJoinCode } from "../../../../store/slicesAndThunks/coursesSlice/coursesDelete";
import { notify } from "../../../../store/slicesAndThunks/snackbarSlice";
import { ERROR_CODES } from "../../../../utilities/apiError";

// The lecturer's half of joining a course by its code (PRD ROST-9): the code,
// the link that carries it, and the people waiting for an answer. Rendered in a
// course's panel only for whoever manages that course — the server refuses
// everyone else, and the code never reaches them in the first place.

// The link a lecturer shares. It opens "הקורסים שלי" with the code typed in;
// a reader who is not signed in is brought back to it after signing in.
export const joinLink = (code, origin = typeof window !== "undefined" ? window.location.origin : "") =>
  `${origin}/my-courses?join=${encodeURIComponent(code)}`;

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

const useJoinCodePanel = (course) => {
  const dispatch = useDispatch();
  const requests = useSelector((state) => state.courses.joinRequestsByCourse[course.id]);
  const [busy, setBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  // Read when the panel opens (the course's accordion), not with the catalogue:
  // the queue is names and addresses, and only the open course needs them.
  useEffect(() => {
    dispatch(fetchJoinRequests(course.id));
  }, [dispatch, course.id]);

  const run = async (action) => {
    setBusy(true);
    try {
      return await dispatch(action);
    } finally {
      setBusy(false);
    }
  };

  const copyAndSay = async (text, what) => {
    const ok = await copy(text);
    dispatch(notify(ok
      ? { message: `${what} הועתק`, severity: "success" }
      : { message: "ההעתקה לא הצליחה. אפשר לסמן ולהעתיק ידנית.", severity: "warning" }));
  };

  const decide = async (requestId, approve) => {
    const result = await run(decideJoinRequest({ courseId: course.id, requestId, approve }));
    // Answered in another tab already: the list on screen is stale, so it is
    // read again rather than left showing a request that is gone.
    if (result.payload?.code === ERROR_CODES.JOIN_REQUEST_DECIDED) dispatch(fetchJoinRequests(course.id));
  };

  return {
    code: course.join_code || null,
    requests: requests ?? [],
    loaded: requests !== undefined,
    busy,
    createCode: () => run(createJoinCode(course.id)),
    // Replacing a code that is already out stops it working for everyone it
    // was given to, so it asks first.
    confirmReplace,
    askReplace: () => setConfirmReplace(true),
    cancelReplace: () => setConfirmReplace(false),
    replaceCode: () => { setConfirmReplace(false); return run(createJoinCode(course.id)); },
    removeCode: () => run(removeJoinCode(course.id)),
    copyCode: () => copyAndSay(course.join_code, "הקוד"),
    copyLink: () => copyAndSay(joinLink(course.join_code), "הקישור"),
    approve: (requestId) => decide(requestId, true),
    reject: (requestId) => decide(requestId, false),
  };
};

export default useJoinCodePanel;
