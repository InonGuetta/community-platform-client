import { useCallback, useEffect, useState } from "react";
import { pageAnchorFromSelection } from "../../../../utilities/pageAnchors";

// A passage selected on a page, turned into a bookmark: the panel's state, and
// saving it through onAddBookmark.
export const usePdfMarkSelection = ({ containerRef, onAddBookmark }) => {
  // containerRef (and any setter) is in the dependency lists below only because
  // it arrives as an argument: it is one object for the viewer's life, so it
  // never re-runs anything.
  // ── Marking a line of the original ───────────────────────────────────────
  //
  // Captured when the selection settles, not read when Save is pressed: the
  // panel below contains a text field, and focusing it collapses the selection.
  // Reading it at save time would read nothing.
  //
  // That is also why the panel shows the words back — by the time the reader is
  // typing, the blue highlight they made is gone, so the quote is what says
  // which mark the note belongs to.
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const box = containerRef.current;
    if (!box || !onAddBookmark) return undefined;

    // selectionchange rather than mouseup, so selecting with Shift+arrows works
    // too — a keyboard user gets no mouse event at all.
    const onSelectionChange = () => {
      const anchor = pageAnchorFromSelection(document.getSelection());
      // A cleared selection must not close a panel the reader is typing into.
      // Putting it away is Cancel's job, and Escape's.
      if (!anchor) return;
      setPending((previous) => {
        const key = `${anchor.pageNumber}:${anchor.rect.x}:${anchor.rect.y}`;
        const wasKey = previous && `${previous.pageNumber}:${previous.rect.x}:${previous.rect.y}`;
        // A new mark discards the note typed for the last one. Keeping it would
        // file words written about one line against a different one, and the
        // reader — whose selection has just moved — has no reason to look at the
        // field again before saving.
        if (key !== wasKey) setNote("");
        return anchor;
      });
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [containerRef, onAddBookmark]);

  const dismiss = useCallback(() => {
    setPending(null);
    setNote("");
  }, []);

  const save = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      // The page, the rectangle, the words as a label, and the note — one
      // request. Nothing here carries a chunk or an offset: this anchor owes
      // nothing to the extracted text, which is why re-running the pipeline
      // cannot touch it.
      await onAddBookmark({
        pageNumber: pending.pageNumber,
        rect: pending.rect,
        quotedText: pending.text || undefined,
        note: note.trim() || undefined,
      });
      dismiss();
      // The selection is stale the moment the mark is stored: the page re-renders
      // with the highlight on it.
      document.getSelection()?.removeAllRanges();
    } finally {
      setSaving(false);
    }
  };

  return { pending, note, setNote, saving, save, dismiss };
};
