import { formatTime } from "./formatTime";
import { TIME_PARAM, PAGE_PARAM } from "./deepLink";

// Where a passage of a lesson is, for the "דיון עם AI" tab — a search hit and
// a chat citation both carry the same fields (start_time, page_number,
// chunk_index), and both are opened the same way.
//
//   time  a moment in a recording → seek the player
//   page  a page of a PDF          → open the reader there
//   none  a .txt / .docx passage   → nothing to open; labelled by position
//
// The same rule, in the same order, as passageLabel on the server
// (services/discussion/context.js), so the label the model cited in an answer
// and the label on the chip under it are the same words.
//
// `!= null` and not truthiness, deliberately: 0 is the first second of every
// recording, and "0 is falsy, so this has no time" is exactly the slip
// utilities/bookmarks.js exists to stop.
//
// A citation from the archive chat (PRD ASK-2) also names its lesson
// (media_id, media_title): the place then carries the lesson's id, and its
// label starts with the lesson's title — "«שיחת הכנה», 12:34" — because
// "12:34" alone does not say in which of eight lessons.
const placeIn = (item) => {
  if (item?.start_time != null) {
    const seconds = Number(item.start_time);
    return { kind: "time", seconds, label: formatTime(seconds) };
  }
  if (item?.page_number != null) {
    const page = Number(item.page_number);
    return { kind: "page", page, label: `עמ' ${page}` };
  }
  return { kind: "none", label: `קטע ${Number(item?.chunk_index ?? 0) + 1}` };
};

export const placeOf = (item) => {
  const place = placeIn(item);
  if (item?.media_id == null) return place;
  const title = String(item.media_title ?? "").trim();
  return { ...place, mediaId: Number(item.media_id), label: title ? `«${title}», ${place.label}` : place.label };
};

// The lesson page, opened at the cited place — for a citation that names its
// lesson. The same parameters the lesson page reads (utilities/deepLink.js).
export const placeHref = (place) => {
  const base = `/media/${place.mediaId}`;
  if (place.kind === "time" && place.seconds > 0) return `${base}?${TIME_PARAM}=${Math.floor(place.seconds)}`;
  if (place.kind === "page" && place.page > 1) return `${base}?${PAGE_PARAM}=${place.page}`;
  return base;
};

// Whether this place can be opened with what the page offers. A book has no
// player and a recording no reader, so the page passes only the one that fits.
export const canOpenPlace = (place, { onSeek, onOpenPage } = {}) =>
  (place.kind === "time" && typeof onSeek === "function") ||
  (place.kind === "page" && typeof onOpenPage === "function");

export const openPlace = (place, { onSeek, onOpenPage } = {}) => {
  if (place.kind === "time") onSeek?.(place.seconds);
  else if (place.kind === "page") onOpenPage?.(place.page);
};
