import { useMemo, useState } from "react";
import { inReadingOrder } from "../../../utilities/bookmarks";

// The sources a notebook visit opens in the floating window, and which one it
// shows: opening, walking, putting the window away and closing entries. Local
// state — nothing outside this page reads the trail.

// Identity of a source entry, for keeping the trail free of duplicates.
//
// A source is a lecture AT a moment, or a book AT a paragraph. The chunk is part
// of the identity for the same reason the timestamp is: two passages marked in
// one sefer are two references, and keying on the media id alone would collapse
// them into a single trail entry that lands on whichever was opened last.
const sourceKey = (entry) =>
  `${entry.mediaId}:${entry.timestampSeconds ?? ""}:${entry.chunkId ?? ""}:${entry.pageNumber ?? ""}`;

/** @param {any[]} bookmarks  every bookmark the page holds */
export const useSourceTrail = (bookmarks) => {
  // Every source opened in this visit, in the order they were opened, and which
  // of them the window is showing. Closing only moves the pointer back to -1 —
  // the trail itself is kept, so reopening a source lands back in the same run
  // of lectures rather than starting from nothing.
  const [sourceTrail, setSourceTrail] = useState([]);
  const [sourceIndex, setSourceIndex] = useState(-1);

  const source = sourceIndex >= 0 ? sourceTrail[sourceIndex] ?? null : null;

  // A source is a lecture AT a moment: the same lecture opened from two
  // different bookmarks is two entries, and opening either one twice is one.
  const openSource = (entry) => {
    const existing = sourceTrail.findIndex((e) => sourceKey(e) === sourceKey(entry));
    if (existing !== -1) {
      // Rewritten rather than reused: the note may have been edited since it
      // was last opened, and the header shows its text.
      setSourceTrail(sourceTrail.map((e, i) => (i === existing ? entry : e)));
      setSourceIndex(existing);
      return;
    }
    setSourceTrail([...sourceTrail, entry]);
    setSourceIndex(sourceTrail.length);
  };

  // Drop just the source being viewed and land on a neighbour, the way closing
  // a browser tab does: the one after it slides into place, unless this was the
  // last, in which case the one before it. Emptying the trail closes the window,
  // because a window of nothing is not a state worth showing.
  const closeCurrentSource = () => {
    if (sourceIndex < 0) return;
    const remaining = sourceTrail.filter((_, i) => i !== sourceIndex);
    setSourceTrail(remaining);
    setSourceIndex(remaining.length === 0 ? -1 : Math.min(sourceIndex, remaining.length - 1));
  };

  // The lecture's bookmarks, for the preview's timeline and its notes tab.
  // Sorted, not merely filtered: NotesPanel walks the list assuming ascending
  // time and stops at the first entry past the playhead, so a newly created
  // bookmark sitting at the end would make it highlight the wrong one.
  const sourceBookmarks = useMemo(
    () => (source ? inReadingOrder(bookmarks.filter((bm) => bm.media_id === source.mediaId)) : []),
    [bookmarks, source]
  );

  return { sourceTrail, setSourceTrail, sourceIndex, setSourceIndex, source, openSource, closeCurrentSource, sourceBookmarks };
};
