import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { fetchNoteBodies } from "../../../store/slicesAndThunks/notesSlice/notesGet";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { syncChipNames } from "../../../utilities/noteSource";
import { downloadNotesPdf, downloadNotesWord, downloadNotebooks } from "../../../utilities/notesExport";
import { SOURCE_STYLES } from "../../../utilities/noteFootnotes";

// Exporting the notebook: which notes, the one question asked before writing
// (ExportSourcesDialog), and the files — one, or one per notebook when split.
/**
 * @param {{ filtered: any[], selectedIds: Set<number>, names: Map<number, string> }} args
 */
export const useNotesExport = ({ filtered, selectedIds, names }) => {
  const dispatch = useDispatch();
  const [exporting, setExporting] = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [splitOpen, setSplitOpen] = useState(false);

  // The export waiting on its last question, and the answer that was given last
  // time — which is only the row the question opens on, never an answer given
  // on the user's behalf. See ExportSourcesDialog.
  const [pendingExport, setPendingExport] = useState(null);
  const [sourceStyle, setSourceStyle] = useState(SOURCE_STYLES.footnotes);

  // What an export writes: the ticked notes, in the order the page shows them
  // rather than the order they were ticked, so the document reads the way the
  // notebook does.
  //
  // With NOTHING ticked it falls back to everything on screen. A greyed-out
  // export button is a dead end that says nothing about how to un-grey it, and
  // "export the notebook" is a reasonable thing to have meant; the menu says
  // which of the two is about to happen either way.
  const selectedNotes = useMemo(
    () => filtered.filter((note) => selectedIds.has(note.id)),
    [filtered, selectedIds]
  );
  // Which notes — not yet their bodies. The list is light (NOTE-17), so the
  // bodies are filled in when the export actually runs; see withBodies.
  const notesToExport = useMemo(
    () => (selectedNotes.length > 0 ? selectedNotes : filtered),
    [selectedNotes, filtered]
  );

  // The notes an export writes, whole. Bodies not yet loaded are fetched in one
  // request first; a note whose body cannot be had stops the export rather
  // than writing an empty page where it should be. And with the bookmarks'
  // current names in their chips: an export is read away from this page, where
  // a name saved before a rename would be the only one.
  const withBodies = async (notes) => {
    const missing = notes.filter((n) => typeof n.body !== "string").map((n) => n.id);
    const fetched = new Map();
    if (missing.length > 0) {
      const result = await dispatch(fetchNoteBodies(missing));
      if (result.meta.requestStatus !== "fulfilled") throw new Error("bodies");
      for (const n of result.payload) fetched.set(n.id, n.body);
    }
    return notes.map((note) => {
      const raw = typeof note.body === "string" ? note.body : fetched.get(note.id);
      if (typeof raw !== "string") throw new Error(`no body for note ${note.id}`);
      return { ...note, body: syncChipNames(raw, names) };
    });
  };

  // An export the user has asked for, held while the one remaining question is
  // put to them. `{ format }` is the whole notebook to one file; a `books` list
  // is the split export, already divided and ordered by its dialog.
  //
  // Nothing is written until a source style comes back, which is what makes the
  // question a step rather than a setting: cancelling it exports nothing.
  const askSources = (request) => {
    setExportAnchor(null);
    setPendingExport(request);
  };

  // Every export ends here, single file or many.
  //
  // Both formats pull their machinery in on demand — jsPDF, the bidi tables and
  // the Hebrew font for one — so this is async and can fail. A failure is
  // reported rather than swallowed: from the user's side a silent no-op is
  // indistinguishable from a click that missed.
  //
  // The count is reported for a split export because those files land in a
  // downloads folder rather than on screen: three notebooks that produced two
  // files is worth knowing at the moment it happens, not when the third is
  // looked for later.
  const runExport = async (sources) => {
    const { format, books } = pendingExport ?? {};
    if (!format) return;

    // Remembered as the default the next dialog opens on: most people export
    // the same way every time.
    setSourceStyle(sources);
    setExporting(true);
    try {
      const write = format === "pdf" ? downloadNotesPdf : downloadNotesWord;

      if (books) {
        // Every book's notes, whole, in one request rather than one per book.
        const whole = new Map((await withBodies(books.flatMap((book) => book.notes))).map((n) => [n.id, n]));
        const ready = books.map((book) => ({ ...book, notes: book.notes.map((n) => whole.get(n.id)) }));
        const written = await downloadNotebooks(ready, (bookNotes, options) =>
          write(bookNotes, { ...options, sources }));
        setSplitOpen(false);
        dispatch(notify({ message: `נוצרו ${written} קבצים`, severity: "success" }));
      } else {
        await write(await withBodies(notesToExport), { sources });
      }
      setPendingExport(null);
    } catch {
      dispatch(notify({ message: "הייצוא נכשל. נסה שוב.", severity: "error" }));
    } finally {
      setExporting(false);
    }
  };

  return {
    exporting, exportAnchor, setExportAnchor, splitOpen, setSplitOpen,
    pendingExport, setPendingExport, sourceStyle, selectedNotes, notesToExport, askSources, runExport,
  };
};
