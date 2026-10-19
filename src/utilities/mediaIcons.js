import VideocamIcon from "@mui/icons-material/Videocam";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { mediaTypes } from "./constant";
import { isTextBookmark, isPageBookmark } from "./bookmarks";

// Which picture stands for a piece of media, in one place.
//
// The notebook already colours a lecture by its type (`mediaTypeAccents`) and
// names it (`mediaTypeLabels`), but the ICON beside it was chosen by asking a
// different question entirely — "is this a book?" — and everything that was not
// a book got a play triangle. A shiur filmed and a shiur recorded looked
// identical in a list whose whole job is telling them apart, next to a coloured
// chip that had already said they were different.
//
// Kept out of constant.js on purpose: these are React components, and that
// module is plain data imported by nearly every page. Icons belong to the
// screens that draw them.
export const mediaTypeIcons = {
  [mediaTypes.video]: VideocamIcon,
  [mediaTypes.audio]: PlayCircleOutlineIcon,
  [mediaTypes.text]: MenuBookIcon,
};

/**
 * The icon for a kind of media, with a fallback that is not a blank space.
 *
 * A type this build does not know is far more likely to be a new one than a
 * broken row, so it borrows the recording's icon rather than showing nothing —
 * a missing icon in a list of icons reads as a broken row.
 */
export const iconForMediaType = (type) => mediaTypeIcons[type] ?? PlayCircleOutlineIcon;

/**
 * The icon for a bookmark.
 *
 * The anchor is asked FIRST and the media type second, because those are two
 * different questions and only the first one is always answerable: a bookmark
 * in a book is a bookmark in a book whether or not the row carrying it
 * remembered to join its media. Asked the other way round, a mark whose
 * media_type did not arrive would show a play triangle in a sefer.
 *
 * Both anchor kinds are named — see CLAUDE.md: `char_position` alone has meant
 * "not a recording" once too often, and a mark on a page of the original has
 * neither that nor a timestamp.
 */
export const iconForBookmark = (bookmark) => {
  if (isTextBookmark(bookmark) || isPageBookmark(bookmark)) return mediaTypeIcons[mediaTypes.text];
  return iconForMediaType(bookmark?.media_type);
};
