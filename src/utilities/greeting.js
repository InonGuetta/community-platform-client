// Which part of the day it is where the reader is — for the archive's
// "good morning" (archive:greeting.<part>). The reader's own clock, not
// Israel's: a greeting is about the person reading it.
//
//   05:00–11:59  morning      17:00–20:59  evening
//   12:00–16:59  afternoon    21:00–04:59  night

/** @param {Date} [now] @returns {"morning" | "afternoon" | "evening" | "night"} */
export const partOfDay = (now = new Date()) => {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
};
