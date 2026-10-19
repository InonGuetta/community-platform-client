import { mediaTypes } from "../../../../utilities/constant";

// The archive's length filter: four ranges, chosen one at a time.
//
// Each range is sent as `minDuration` / `maxDuration` in seconds — the server's
// lib/validate.js durationRangeFilter, min inclusive and max exclusive — so the
// four meet without overlapping: a lesson of exactly fifteen minutes is in the
// second range and not in both.
//
// Asking for a length means asking for something to listen to or watch, so
// the server leaves documents out while one is chosen, and recordings whose
// length is not known. With only "קריאה" chosen there is nothing a length could
// apply to, so the field is not offered at all (see lengthApplies).
//
// The `value` is what the address carries (`len=short`), and it is this file's
// own name rather than the seconds: a shared link outlives a decision to move
// a boundary, and should keep meaning "short".

const MINUTE = 60;

// Labelled in minutes, as numbers: a range is read at a glance as "0–15", where
// "רבע שעה עד חצי שעה" had to be read word by word. The en dash is the range
// mark, and the minutes go first so the line reads in the same direction as
// the rest of the RTL menu.
export const DURATION_OPTIONS = [
  { value: "short", label: "0–15 דקות", max: 15 * MINUTE },
  { value: "medium", label: "15–30 דקות", min: 15 * MINUTE, max: 30 * MINUTE },
  { value: "long", label: "30–60 דקות", min: 30 * MINUTE, max: 60 * MINUTE },
  { value: "xlong", label: "מעל 60 דקות", min: 60 * MINUTE },
];

const BY_VALUE = new Map(DURATION_OPTIONS.map((option) => [option.value, option]));

/** A range from outside — an address — reduced to one the field can show, or "". */
export const readDuration = (value) => (BY_VALUE.has(value) ? value : "");

/**
 * The request parameters for a chosen range: `{ minDuration?, maxDuration? }`,
 * or nothing at all when no range is chosen.
 */
export const durationParams = (value) => {
  const option = BY_VALUE.get(value);
  if (!option) return {};
  return {
    ...(option.min !== undefined && { minDuration: option.min }),
    ...(option.max !== undefined && { maxDuration: option.max }),
  };
};

/** Whether a length means anything for the chosen types: not for reading alone. */
export const lengthApplies = (selectedTypes = []) =>
  !(selectedTypes.length === 1 && selectedTypes[0] === mediaTypes.text);

/**
 * A recording's length as a card says it: "42 דק׳", "1 שע׳ 58 דק׳", or seconds
 * for a clip under a minute. Null when there is nothing to say — a document, or
 * a length that was never measured — so the card simply shows no chip.
 */
export const lengthLabel = (seconds) => {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;
  if (total < MINUTE) return `${Math.round(total)} שנ׳`;
  const minutes = Math.round(total / MINUTE);
  if (minutes < 60) return `${minutes} דק׳`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} שע׳` : `${hours} שע׳ ${rest} דק׳`;
};
