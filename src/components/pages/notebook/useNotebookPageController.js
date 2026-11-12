import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useDragReorder } from "../../../utilities/useDragReorder";
import { fetchNotes } from "../../../store/slicesAndThunks/notesSlice/notesGet";
import { createNote } from "../../../store/slicesAndThunks/notesSlice/notesPost";
import { reorderNotes } from "../../../store/slicesAndThunks/notesSlice/notesPut";
import { deleteNote } from "../../../store/slicesAndThunks/notesSlice/notesDelete";
import { fetchBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksGet";
import { clearBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import { updateBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksPut";
import { notify } from "../../../store/slicesAndThunks/snackbarSlice";
import { isSaveShortcut } from "../../../utilities/keyboard";
import { bookmarkNames } from "../../../utilities/noteSource";
import { inReadingOrder } from "../../../utilities/bookmarks";
import { useNoteEditing } from "../../features/Notes/useNoteEditing";
import { useSourceTrail } from "./useSourceTrail";
import { useNoteBodies } from "./useNoteBodies";
import { useNotesSearch } from "./useNotesSearch";
import { useNotesExport } from "./useNotesExport";

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
//
// Four parts are hooks of their own beside it, each with its reasoning:
// useSourceTrail (the floating window's sources), useNoteBodies (loading the
// light list's bodies, NOTE-17), useNotesSearch (the box and what it leaves on
// screen) and useNotesExport (which notes, the sources question, the files).
// What stays here wires them together: the selection, deleting, the order, the
// keyboard, and what the page returns.


export const useNotebookPageController = () => {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.notes);
  const { items: bookmarks, status: bookmarksStatus } = useSelector((state) => state.bookmarks);


  // The notes ticked for a bulk action, and the notes queued for deletion (one
  // from a card's own button, or the whole tick-list).
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [deleteTargets, setDeleteTargets] = useState(null);


  // The sources opened in the floating window — see useSourceTrail.
  const {
    sourceTrail, setSourceTrail, sourceIndex, setSourceIndex, source, openSource, closeCurrentSource, sourceBookmarks,
  } = useSourceTrail(bookmarks);


  useEffect(() => {
    dispatch(fetchNotes());
    // The bookmarks slice is shared with the media page, which loads only one
    // lecture's worth. Clear first so that subset is not briefly rendered here
    // as if it were the user's whole collection.
    dispatch(clearBookmarks());
    dispatch(fetchBookmarks());
  }, [dispatch]);

  // Every chip that is a bookmark shows that bookmark's current name — this page
  // holds all of the user's bookmarks, so all of them. A rename in the sidebar,
  // under a lesson's "הערות אישיות", or with a chip's pencil is one value seen
  // everywhere. See syncChipNames.
  const names = useMemo(() => bookmarkNames(bookmarks), [bookmarks]);

  // ── Loading bodies (NOTE-17) — see useNoteBodies ─────────────────────────
  const { requestBodies, onNeedBody } = useNoteBodies();

  // EVERY note is open for editing at once, one card under the other, so a
  // draft is per note rather than a single "the note being edited". The drafts,
  // the save, the untitled-note question and the caret are the lesson strip's
  // rules too, from one hook (features/Notes/useNoteEditing).
  //
  // The list is light (NOTE-17): a note whose body has not arrived has no
  // draft — draftFor is null, never an empty draft. Its card shows the note's
  // preview and asks for the body, rather than opening an empty editor over a
  // note that has text, and a save asked for it is answered here instead.
  const editing = useNoteEditing({
    notes: items,
    names,
    lightList: true,
    onBodyMissing: (note) => {
      dispatch(notify({ message: "ההערה עוד נטענת. נסה שוב בעוד רגע.", severity: "info" }));
      requestBodies([note.id]);
    },
    scrollBlock: "start",
  });
  const {
    drafts, setDrafts, draftFor, isDirty, activeNoteId, setActiveNoteId, formats, setFormats,
    editorApis, cardNodes, requestSave, titlePrompt, setTitlePrompt, confirmTitle, saveActiveNote,
  } = editing;

  // The search box and what it leaves on screen — see useNotesSearch.
  const { search, setSearch, filtered } = useNotesSearch({ items, drafts });

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


  // A note created or picked from the list is scrolled to the top of the view
  // (useNoteEditing parks the request until its card exists).
  const goToNote = (id) => {
    editing.focusNote(id);
    // The card is about to be on screen; its body should be on its way already.
    requestBodies([id]);
  };

  const handleCreate = async () => {
    const res = await dispatch(createNote({ title: "", body: "" }));
    if (res.meta.requestStatus === "fulfilled") goToNote(res.payload.id);
  };

  // Ctrl+S / Cmd+S saves the card the caret is in, and only that one.
  //
  // Deliberately not "save everything unsaved": the notebook has every note
  // open at once, so a save-all would write notes the user may have edited an
  // hour ago and left open on purpose. The shortcut means what it means in an
  // editor — save the thing I am writing — and the card's own button is right
  // there for anything else. Saving it is useNoteEditing's saveActiveNote, the
  // lesson strip's too; when the keystroke is this page's business is decided
  // here.
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

      // "Nothing to save" is said by saveActiveNote. No card at all used to be
      // silent too: since the shortcut swallows the keystroke either way, a
      // user pressing it and getting NOTHING — no save, no browser dialog, no
      // message — has no way to tell "it saved" from "this application ignores
      // Ctrl+S".
      if (!saveActiveNote()) {
        dispatch(notify({ message: "לא נבחרה הערה. לחץ בתוך הערה ואז שמור.", severity: "info" }));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dispatch, saveActiveNote]);

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
    editing.forgetNotes(gone);
    setSelectedIds((prev) => new Set([...prev].filter((id) => !gone.has(id))));
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

  // What an export writes, and writing it — see useNotesExport.
  const {
    exporting, exportAnchor, setExportAnchor, splitOpen, setSplitOpen,
    pendingExport, setPendingExport, sourceStyle, selectedNotes, notesToExport, askSources, runExport,
  } = useNotesExport({ filtered, selectedIds, names });

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
    onNeedBody,
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
