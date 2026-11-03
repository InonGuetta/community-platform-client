// Where to go once signed in: the page a signed-out reader was on their way to.
//
// Every sign-in used to land on the archive, so a link shared in a group — a
// lesson, or a course's join link (PRD ROST-9, /my-courses?join=CODE) — lost
// what it pointed at for anybody not already signed in. ProtectedRoute records
// the address when it sends someone to sign in; the three ways of signing in
// (the form, sign-up, Google's round trip) take it back.
//
// sessionStorage: it survives the trip to Google and back in the same tab, and
// is gone with the tab — a stale destination should not ambush a later visit.

const KEY = "returnTo";

// Only a path inside this app. "//evil.example" is a URL to another site as far
// as the browser is concerned, and an address from storage is not trusted to be
// anything in particular.
export const safeReturnPath = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : null;

const storage = () => {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
};

export const rememberReturnTo = (path) => {
  const safe = safeReturnPath(path);
  try {
    if (safe) storage()?.setItem(KEY, safe);
  } catch {
    // Not remembered; the reader lands on the archive as before.
  }
};

// Read once: a destination is used by one sign-in, not by every later one.
export const takeReturnTo = (fallback = "/archive") => {
  try {
    const value = safeReturnPath(storage()?.getItem(KEY));
    storage()?.removeItem(KEY);
    return value || fallback;
  } catch {
    return fallback;
  }
};
