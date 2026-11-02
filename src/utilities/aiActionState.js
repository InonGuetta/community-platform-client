// The two on-demand AI actions on a transcript — "תיקון עברית" and "כותרות
// משנה" — run on the server's queue (PRD PIPE-5) and report back through the
// transcript row: `hebrew_fix_status` and `headings_status`, each
// queued → running → done | error (server migration 039).
//
// These are the rules the page reads them by, in one place.

const BUSY = new Set(["queued", "running"]);

// Still to come back: the page keeps polling, and the button stays pressed.
export const isAiActionBusy = (status) => BUSY.has(status);

// What changed between two looks at one action's status, if it is something
// to announce: it finished, or it failed. A row first seen already 'done' (a
// reload long after the run) is not an event, and neither is anything else.
export const aiActionOutcome = (previous, next) => {
  if (!isAiActionBusy(previous)) return null;
  if (next === "done") return "done";
  if (next === "error") return "error";
  return null;
};

// The two actions, as the transcript row names their columns.
export const AI_ACTION_FIELDS = Object.freeze({
  hebrewFix: { status: "hebrew_fix_status", error: "hebrew_fix_error" },
  headings: { status: "headings_status", error: "headings_error" },
});
