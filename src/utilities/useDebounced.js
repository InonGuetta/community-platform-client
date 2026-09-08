import { useEffect, useState } from "react";

// A value, delayed.
//
// Written for the archive's search box, which fires on every keystroke. That was
// free while filtering happened in the browser; now that the server does it,
// every keystroke is a request — and the last one to arrive wins, not the last
// one sent, so a slow early response could overwrite the results for a query the
// user has already moved past.
//
// Delaying the VALUE rather than the request is what keeps that simple: the
// effect that fetches depends on this, so it only ever sees settled input and
// there is no in-flight request to cancel.
export const useDebounced = (value, delayMs = 300) => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return settled;
};
