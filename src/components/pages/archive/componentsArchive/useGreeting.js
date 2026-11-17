import { useEffect, useState } from "react";
import { partOfDay } from "../../../../utilities/greeting";

// The part of the day for the archive's greeting, looked at again every few
// minutes — a tab left open over lunch should not still say "good morning".
const RECHECK_MS = 5 * 60 * 1000;

export const useGreeting = () => {
  const [part, setPart] = useState(() => partOfDay());
  useEffect(() => {
    const timer = setInterval(() => setPart(partOfDay()), RECHECK_MS);
    return () => clearInterval(timer);
  }, []);
  return part;
};
