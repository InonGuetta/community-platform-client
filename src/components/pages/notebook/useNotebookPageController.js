import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDragReorder } from "./componentsNotebook/useDragReorder";
import { fetchNotes } from "../../../store/slicesAndThunks/notesSlice/notesGet";
import { createNote } from "../../../store/slicesAndThunks/notesSlice/notesPost";
import { updateNote, reorderNotes } from "../../../store/slicesAndThunks/notesSlice/notesPut";
import { deleteNote } from "../../../store/slicesAndThunks/notesSlice/notesDelete";
import { fetchBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksGet";
import { clearBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import { updateBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksPut";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { isSaveShortcut } from "../../../utilities/keyboard";
import { noteBodyToHtml, noteHtmlToPlainText, sanitizeNoteHtml } from "../../../utilities/noteHtml";
import { bookmarkNames, syncChipNames } from "../../../utilities/noteSource";
import { inReadingOrder } from "../../../utilities/bookmarks";
import { downloadNotesPdf, downloadNotesWord, downloadNotebooks } from "../../../utilities/notesExport";
import { SOURCE_STYLES } from "../../../utilities/noteFootnotes";

// Everything the notebook page DOES — what it reads from the store, what it
// dispatches, and the state of the editors, the selection, the source window and
// the export — so that NotebookPage.jsx is layout only. The project rule is the
// test: "does it dispatch or select? then it belongs in the controller". It was
// all inside the component, a thousand lines where the logic and the markup could
// only be read together.
//
// Moved, not rewritten: every function below is the one that was in the page,
// with its comments, so the reasoning recorded there still sits next to the code
// it explains.

// Identity of a source entry, for keeping the trail free of duplicates.
//
// A source is a lecture AT a moment, or a book AT a paragraph. The chunk is part
// of the identity for the same reason the timestamp is: two passages marked in
// one sefer are two references, and keying on the media id alone would collapse
// them into a single trail entry that lands on whichever was opened last.
const sourceKey = (entry) =>
  `${entry.mediaId}:${entry.timestampSeconds ?? ""}:${entry.chunkId ?? ""}:${entry.pageNumber ?? ""}`;

export const useNotebookPageController = () => {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.notes);
  const { items: bookmarks, status: bookmarksStatus } = useSelector((state) => state.bookmarks);

  const [search, setSearch] = useState("");

  // EVERY note is open for editing at once, one card under the other, so a
  // draft is per note rather than a single "the note being edited".
  //
  // `drafts` holds only the notes actually touched. Anything absent is read from
  // the note itself, which means opening the notebook allocates nothing, a
  // reload of the list cannot silently discard someone's unsaved typing, and
  // "is this dirty" is answered by comparing against the same baseline the
  // editor was seeded from.
  const [drafts, setDrafts] = useState({});

  // Which card the caret is in. The toolbar is one strip for a column of
  // editors, so it needs to know which of them to talk to — and the card is
  // outlined to say so, because a toolbar acting on an unidentifiable note is
  // worse than no toolbar.
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [formats, setFormats] = useState({});

  // The notes ticked for a bulk action, and the notes queued for deletion (one
  // from a card's own button, or the whole tick-list).
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteTargets, setDeleteTargets] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportAnchor, setExportAnchor] = useState(null);
  const [splitOpen, setSplitOpen] = useState(false);

  // The export waiting on its last question, and the answer that was given last
  // time — which is only the row the question opens on, never an answer given
  // on the user's behalf. See ExportSourcesDialog.
  const [pendingExport, setPendingExport] = useState(null);
  const [sourceStyle, setSourceStyle] = useState(SOURCE_STYLES.footnotes);

  // The editors' imperative handles and the cards' DOM nodes, by note id. Refs
  // rather than state: nothing on screen depends on them, and re-rendering the
  // page every time one registered would be a render per card on every load.
  const editorApis = useRef(new Map());
  const cardNodes = useRef(new Map());
  const [pendingScrollId, setPendingScrollId] = useState(null);

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

  useEffect(() => {
    dispatch(fetchNotes());
    // The bookmarks slice is shared with the media page, which loads only one
    // lecture's worth. Clear first so that subset is not briefly rendered here
    // as if it were the user's whole collection.
    dispatch(clearBookmarks());
    dispatch(fetchBookmarks());
  }, [dispatch]);

  // What each note looks like BEFORE anyone edits it — the editor's starting
  // value and the thing "dirty" is measured against.
  //
  // The body goes through noteBodyToHtml because the column holds two kinds of
  // value: markup for anything written since the toolbar existed, and plain text
  // with newlines for everything written before it. Computed once per change to
  // the list rather than per render: the conversion parses HTML, and doing it
  // for every note on every keystroke would be a parse per note per character.
  // Every chip that is a bookmark shows that bookmark's current name — this page
  // holds all of the user's bookmarks, so all of them. A rename in the sidebar,
  // under a lesson's "הערות אישיות", or with a chip's pencil is one value seen
  // everywhere. See syncChipNames.
  const names = useMemo(() => bookmarkNames(bookmarks), [bookmarks]);

  const baselines = useMemo(() => {
    const map = new Map();
    for (const note of items) {
      map.set(note.id, { title: note.title || "", body: syncChipNames(noteBodyToHtml(note.body), names) });
    }
    return map;
  }, [items, names]);

  const draftFor = (id) => drafts[id] ?? baselines.get(id) ?? { title: "", body: "" };

  const isDirty = (id) => {
    const draft = drafts[id];
    const baseline = baselines.get(id);
    if (!draft || !baseline) return false;
    return draft.title !== baseline.title || draft.body !== baseline.body;
  };

  // Searched on the WORDS, not on the stored body: a body is now markup, and
  // matching it raw would find notes by their tag names ("mark", "li") and miss
  // a phrase that happens to have a bold word in the middle of it.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) =>
      `${n.title || ""} ${noteHtmlToPlainText(n.body)} ${n.media_title || ""}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Every bookmark the user has left anywhere on the platform, grouped under
  // the lecture it belongs to. The API returns them ordered by lecture title
  // and then by timestamp, so one pass builds the groups — but each group is
  // re-sorted at the end, because a bookmark created from the source window is
  // appended to the slice and would otherwise sit at the bottom of its lecture
  // however early in the recording it points at.
  const bookmarkGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const groups = [];
    const byMedia = new Map();

    for (const bm of bookmarks) {
      const mediaTitle = bm.media_title || "שיעור";
      if (q && !`${bm.note || ""} ${mediaTitle}`.toLowerCase().includes(q)) continue;

      let group = byMedia.get(bm.media_id);
      if (!group) {
        group = { mediaId: bm.media_id, mediaTitle, mediaType: bm.media_type, items: [] };
        byMedia.set(bm.media_id, group);
        groups.push(group);
      }
      group.items.push(bm);
    }
    // Each group re-sorted rather than trusted: a bookmark created from the
    // source window is appended to the slice and would otherwise sit at the
    // bottom of its lecture however early it points. The comparator used to be
    // a bare timestamp subtraction, which is NaN for every bookmark in a book —
    // so a sefer's group was in no order at all. See utilities/bookmarks.js.
    for (const group of groups) {
      group.items = inReadingOrder(group.items);
    }
    return groups;
  }, [bookmarks, search]);

  // The lecture's bookmarks, for the preview's timeline and its notes tab.
  // Sorted, not merely filtered: NotesPanel walks the list assuming ascending
  // time and stops at the first entry past the playhead, so a newly created
  // bookmark sitting at the end would make it highlight the wrong one.
  const sourceBookmarks = useMemo(
    () => (source ? inReadingOrder(bookmarks.filter((bm) => bm.media_id === source.mediaId)) : []),
    [bookmarks, source]
  );

  // A note created or picked from the list is scrolled to, but its card may not
  // exist yet — a new note only has one after the store has come back and the
  // page has re-rendered. So the request is parked and the effect below spends
  // it as soon as there is something to scroll to.
  useEffect(() => {
    if (!pendingScrollId) return;
    const node = cardNodes.current.get(pendingScrollId);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingScrollId(null);
  }, [items, pendingScrollId]);

  const goToNote = (id) => {
    setActiveNoteId(id);
    setPendingScrollId(id);
  };

  const handleCreate = async () => {
    const res = await dispatch(createNote({ title: "", body: "" }));
    if (res.meta.requestStatus === "fulfilled") goToNote(res.payload.id);
  };

  // Sanitized on the way out as well as on the way in. The editor already does
  // it when it loses focus, and saving normally moves the focus — but "normally"
  // is not a guarantee, and this is the one path that writes to the database.
  //
  // The draft is dropped only on success: a failed save must leave the user's
  // typing exactly where it is, which is the whole reason the store's copy is
  // not treated as the truth until it agrees.
  const handleSave = async (note, { announce = false, title } = {}) => {
    const draft = draftFor(note.id);
    const res = await dispatch(updateNote({
      id: note.id,
      // The name given in the untitled-note dialog, when there was one.
      title: title ?? draft.title,
      body: sanitizeNoteHtml(draft.body),
    }));
    if (res.meta.requestStatus === "fulfilled") {
      setDrafts((prev) => Object.fromEntries(
        Object.entries(prev).filter(([id]) => Number(id) !== note.id)
      ));
      // A click on the save button is its own receipt — the button greys out
      // under the cursor that pressed it. A keyboard save has no button and no
      // cursor near one, so that path says so out loud instead.
      if (announce) dispatch(notify({ message: "ההערה נשמרה", severity: "success" }));
    }
  };

  // A card with no title asks for one before it is saved — the same question,
  // in the same dialog, as the notebook strip under a lesson. See
  // UntitledNoteDialog for why it is a question and not a refusal.
  const [titlePrompt, setTitlePrompt] = useState(null);

  const requestSave = (note, options = {}) => {
    if (!draftFor(note.id).title.trim()) {
      setTitlePrompt({ note, options });
      return;
    }
    handleSave(note, options);
  };

  const confirmTitle = (name) => {
    const prompt = titlePrompt;
    setTitlePrompt(null);
    if (prompt) handleSave(prompt.note, { ...prompt.options, title: name });
  };

  // Ctrl+S / Cmd+S saves the card the caret is in, and only that one.
  //
  // Deliberately not "save everything unsaved": the notebook has every note
  // open at once, so a save-all would write notes the user may have edited an
  // hour ago and left open on purpose. The shortcut means what it means in an
  // editor — save the thing I am writing — and the card's own button is right
  // there for anything else.
  //
  // Held in a ref rather than listed as dependencies. The handler reads the
  // drafts, which change on every keystroke; an effect keyed on those would
  // detach and re-attach a window listener as fast as the user can type.
  const saveActiveNote = useRef(() => {});
  useEffect(() => {
    saveActiveNote.current = () => {
      const note = items.find((n) => n.id === activeNoteId);
      // Both of these used to be silent. Since the shortcut swallows the
      // keystroke either way, a user pressing it and getting NOTHING — no save,
      // no browser dialog, no message — has no way to tell the difference
      // between "it saved" and "this application ignores Ctrl+S".
      if (!note) {
        dispatch(notify({ message: "לא נבחרה הערה. לחץ בתוך הערה ואז שמור.", severity: "info" }));
        return;
      }
      if (!isDirty(note.id)) {
        dispatch(notify({ message: "אין שינויים לשמירה", severity: "info" }));
        return;
      }
      requestSave(note, { announce: true });
    };
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      // Which key this is — and on which keyboard — is a question with a
      // surprising answer, so it lives in utilities/keyboard.js with the
      // Hebrew-layout bug that prompted it written out in full.
      if (!isSaveShortcut(event)) return;

      // Prevented even when there is nothing to save, and BEFORE deciding
      // whether to act. The browser's "save page as" dialog is never what
      // Ctrl+S meant on a page you are writing on, and an editor that only
      // sometimes swallows the shortcut is worse than one that never does.
      event.preventDefault();

      // A keystroke inside a dialog belongs to the dialog. Without this, Ctrl+S
      // while naming an export file saves a note behind the modal — an edit the
      // user cannot see happening.
      if (event.target?.closest?.('[role="dialog"]')) return;

      saveActiveNote.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  // Deleting is irreversible and the notes are the user's own writing, so both
  // the single-note button and the bulk action go through the same confirmation
  // — the only difference is how many notes are named in it.
  //
  // The local state is cleared for the notes that were actually deleted, which is
  // why this waits. It used to fire the deletes and clear immediately, so a
  // request that failed left the note on screen with its draft and its tick
  // already discarded — the one state the user cannot recover from, since the
  // draft held whatever they had typed and not yet saved.
  //
  // Failures need no handling here: every thunk rejects through rejectionOf and
  // the notification middleware turns that into a toast, so a note that survives
  // says so on its own. What matters is that it survives INTACT.
  const handleDeleteConfirm = async () => {
    const targets = deleteTargets ?? [];
    setDeleteTargets(null);

    const outcomes = await Promise.all(
      targets.map(async (note) => ({
        id: note.id,
        deleted: (await dispatch(deleteNote(note.id))).meta.requestStatus === "fulfilled",
      }))
    );
    const gone = new Set(outcomes.filter((o) => o.deleted).map((o) => o.id));
    if (gone.size === 0) return;

    // Everything the page still holds ABOUT those notes goes with them: a
    // lingering draft would be re-applied to whatever note reused the id, and a
    // lingering tick would keep a deleted note in the selection count.
    setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !gone.has(Number(id)))));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
    if (activeNoteId && gone.has(activeNoteId)) setActiveNoteId(null);
  };

  // Dragging notes into a new order, in the index down the side — which is now
  // the only place it happens. The cards had a grip of their own until it was
  // removed as visual noise; see useDragReorder.
  //
  // Turned off while a search is running. A filtered
  // list is not the notebook: dropping note 9 "above note 2" when notes 3 to 8
  // are hidden gives no answer to where the hidden ones go, and any answer the
  // code picked would move notes the user cannot see.
  const reorderHint = search.trim()
    ? "נקה את החיפוש כדי לשנות את סדר ההערות"
    : (items.length < 2 ? "צריך לפחות שתי הערות כדי לשנות סדר" : "");

  const drag = useDragReorder({
    ids: items.map((note) => note.id),
    onReorder: (ids) => dispatch(reorderNotes(ids)),
    disabled: Boolean(reorderHint),
  });

  const toggleSelected = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // Acts on what is VISIBLE. With a search in the box, "select all" that also
  // ticked the notes filtered out of sight would arm a delete over notes the
  // user cannot see.
  const allVisibleSelected = filtered.length > 0 && filtered.every((n) => selectedIds.has(n.id));
  const someVisibleSelected = filtered.some((n) => selectedIds.has(n.id));

  const toggleAllVisible = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    for (const note of filtered) {
      if (allVisibleSelected) next.delete(note.id); else next.add(note.id);
    }
    return next;
  });

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
  // With the bookmarks' current names in their chips: an export is read away
  // from this page, where a name saved before a rename would be the only one.
  const notesToExport = useMemo(
    () => (selectedNotes.length > 0 ? selectedNotes : filtered).map((note) => {
      const body = syncChipNames(note.body, names);
      return body === note.body ? note : { ...note, body };
    }),
    [selectedNotes, filtered, names]
  );

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
        const written = await downloadNotebooks(books, (bookNotes, options) =>
          write(bookNotes, { ...options, sources }));
        setSplitOpen(false);
        dispatch(notify({ message: `נוצרו ${written} קבצים`, severity: "success" }));
      } else {
        await write(notesToExport, { sources });
      }
      setPendingExport(null);
    } catch {
      dispatch(notify({ message: "הייצוא נכשל. נסה שוב.", severity: "error" }));
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = selectedIds.size;

  // The two things the cards and the source window report back, named here so
  // the page does not have to dispatch anything itself.
  const reportEditorWarning = (message) => dispatch(notify({ message, severity: "warning" }));
  const renameSource = (bookmarkId, name) => dispatch(updateBookmark({ id: bookmarkId, note: name }));

  return {
    activeNoteId,
    allVisibleSelected,
    askSources,
    bookmarkGroups,
    bookmarks,
    bookmarksStatus,
    cardNodes,
    closeCurrentSource,
    confirmTitle,
    deleteTargets,
    draftFor,
    drag,
    editorApis,
    exportAnchor,
    exporting,
    filtered,
    formats,
    goToNote,
    handleCreate,
    handleDeleteConfirm,
    isDirty,
    items,
    notesToExport,
    openSource,
    pendingExport,
    renameSource,
    reorderHint,
    reportEditorWarning,
    requestSave,
    runExport,
    search,
    selectedCount,
    selectedIds,
    selectedNotes,
    setActiveNoteId,
    setDeleteTargets,
    setDrafts,
    setExportAnchor,
    setFormats,
    setPendingExport,
    setSearch,
    setSourceIndex,
    setSourceTrail,
    setSplitOpen,
    setTitlePrompt,
    someVisibleSelected,
    source,
    sourceBookmarks,
    sourceIndex,
    sourceStyle,
    sourceTrail,
    splitOpen,
    status,
    titlePrompt,
    toggleAllVisible,
    toggleSelected,
  };
};
