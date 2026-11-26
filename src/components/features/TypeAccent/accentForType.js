import { TYPE_ACCENT } from "../../../theme/tokens";
import { mediaTypes } from "../../../utilities/constant";

// Which of TYPE_ACCENT's colours a lesson is drawn in (D-146): a video orange,
// a book purple, and a recording — or anything unknown — the site's own accent.
export const accentKeyFor = (mediaType) => {
  if (mediaType === mediaTypes.video) return "video";
  if (mediaType === mediaTypes.text) return "text";
  return "audio";
};

// The shade for a mode, or null when nothing is to change: audio keeps the
// theme it is given, untouched, so a recording looks exactly as it did.
export const accentOverrideFor = (mediaType, mode) => {
  const key = accentKeyFor(mediaType);
  if (key === "audio") return null;
  return TYPE_ACCENT[key][mode === "dark" ? "dark" : "light"];
};
