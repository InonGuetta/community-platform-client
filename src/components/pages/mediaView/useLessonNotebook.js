import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchNotes } from "../../../store/slicesAndThunks/notesSlice/notesGet";
import { createNote } from "../../../store/slicesAndThunks/notesSlice/notesPost";
import { updateNote } from "../../../store/slicesAndThunks/notesSlice/notesPut";
import { deleteNote } from "../../../store/slicesAndThunks/notesSlice/notesDelete";
import { createBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksPost";
import { updateBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksPut";
import { deleteBookmark } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksDelete";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { statuses } from "../../../utilities/constant";
import { isSaveShortcut } from "../../../utilities/keyboard";
import { noteBodyToHtml, sanitizeNoteHtml } from "../../../utilities/noteHtml";
import {
  isNoteAboutMedia, sourceChipHtml, referencesBlockHtml, GENERAL_REFERENCE_LABEL,
  bookmarkNames, syncChipNames,
} from "../../../utilities/noteSource";
import { isPageBookmark } from "../../../utilities/bookmarks";

// Where the bookmark that accompanies a new lesson note sits.
//
// A recording: the second the player is at (zero before playback starts — the
// start is where the user was). A book: the page the reader is showing. A book
// whose reader has not reported a page yet has nowhere to put one, so it gets
// no bookmark — the note's chip still opens the book, at its start.
//
// The server stores a mark on a page as a rectangle on it (migration 027), and
// the reader paints that rectangle yellow. A reference to the page in general
// has no passage to cover, and painting the whole page would bury the text, so
// it is a thin band along the top edge: enough to see that the page is marked,
// over the margin rather than the words.
export const GENERAL_PAGE_MARK = { x: 0, y: 0, w: 1, h: 0.02 };

export const generalBookmarkPlace = ({ isText, currentTime, page }) => {
  if (!isText) return { timestampSeconds: Math.floor(currentTime > 0 ? currentTime : 0) };
  if (!Number.isInteger(page) || page <= 0) return null;
  return { pageNumber: page, rect: GENERAL_PAGE_MARK };
};

// The notebook, narrowed to one lesson, under that lesson's player.
//
// The same notes as /notebook and the same slice — a note edited here is edited
// there, because there is only one of it. What differs is the selection (only
// the notes about THIS lesson, see isNoteAboutMedia) and what a source chip does
// when clicked: a chip pointing at the lesson already on screen moves the player
// or the reader instead of opening a second copy of it in a window.
//
// The draft handling is deliberately the notebook page's, rule for rule — drafts
// only for notes actually touched, dropped only on a successful save, the body
// sanitised on the way out. A second notebook with its own idea of when typing
// is safe to discard is how a user loses a paragraph in one of the two.
// One empty list for every render that has none, so the names memoised from it
// below are not rebuilt — and every note re-synced — on each render.
const NO_BOOKMARKS = [];

const useLessonNotebook = ({
  media, isText, currentTime, readerPage = null, bookmarks = NO_BOOKMARKS, onSeek, onJumpTo,
}) => {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.notes);
  const mediaId = media?.id;

  useEffect(() => {
    // Every visit, not once: a note written in /notebook since this slice was
    // last filled would otherwise be missing here until a full reload.
    dispatch(fetchNotes());
  }, [dispatch]);

  // A note created here comes back from the server without the joined
  // media_title and media_type (the INSERT returns the bare row), so its card
  // would read "מתוך: שיעור". This page knows the lesson, so it fills them in.
  const notes = useMemo(
    () => items
      .filter((note) => isNoteAboutMedia(note, mediaId))
      .map((note) => (Number(note.media_id) === Number(mediaId) && !note.media_title
        ? { ...note, media_title: media?.title, media_type: media?.media_type }
        : note)),
    [items, mediaId, media?.title, media?.media_type]
  );

  const [drafts, setDrafts] = useState({});
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [formats, setFormats] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [preview, setPreview] = useState(null);
  const editorApis = useRef(new Map());
  const cardNodes = useRef(new Map());
  const [pendingScrollId, setPendingScrollId] = useState(null);

  // Leaving for another lesson starts clean: a toolbar still pointed at a note
  // from the previous lesson would format a card that is no longer on screen.
  useEffect(() => {
    setActiveNoteId(null);
    setPreview(null);
  }, [mediaId]);

  // Every chip that is one of this lesson's bookmarks shows that bookmark's
  // current name, however the note was saved — so a rename under "הערות
  // אישיות" appears in the note the moment it is made. See syncChipNames.
  const names = useMemo(() => bookmarkNames(bookmarks), [bookmarks]);

  const baselines = useMemo(() => {
    const map = new Map();
    for (const note of notes) {
      map.set(note.id, { title: note.title || "", body: syncChipNames(noteBodyToHtml(note.body), names) });
    }
    return map;
  }, [notes, names]);

  const draftFor = (id) => drafts[id] ?? baselines.get(id) ?? { title: "", body: "" };

  const isDirty = (id) => {
    const draft = drafts[id];
    const baseline = baselines.get(id);
    if (!draft || !baseline) return false;
    return draft.title !== baseline.title || draft.body !== baseline.body;
  };

  // Same parking as the notebook page: a new note's card exists only after the
  // store answers and the list re-renders.
  useEffect(() => {
    if (!pendingScrollId) return;
    const node = cardNodes.current.get(pendingScrollId);
    if (!node) return;
    node.scrollIntoView?.({ behavior: "smooth", block: "center" });
    setPendingScrollId(null);
  }, [notes, pendingScrollId]);

  // A new note opens with one line to write on and, under it, a reference back
  // to where the user is: the second the player is at, or the page the reader
  // is showing. It is named "הפנייה כללית" until they rename it (the pencil on
  // the chip, see RichNoteEditor) — a chip like any other, so it opens, exports
  // and footnotes like one.
  //
  // The note's own timestamp is kept as before, for the card's "מתוך" link. A
  // book has no moment; zero is the start of a recording, which says nothing a
  // note without a time does not — but the chip still points there, because
  // "the start" is where the user was.
  const handleCreate = async () => {
    if (!mediaId) return;
    const seconds = !isText && currentTime > 0 ? Math.floor(currentTime) : undefined;
    const page = isText && Number.isInteger(readerPage) && readerPage > 0 ? readerPage : null;

    // The bookmark first, so the chip can BE it rather than a copy of it: the
    // chip carries its id, and its name is then the bookmark's wherever either
    // is renamed. A bookmark that could not be made leaves a plain chip — the
    // note is still what the user asked for.
    const place = generalBookmarkPlace({ isText, currentTime, page });
    let bookmarkId = null;
    if (place) {
      const made = await dispatch(createBookmark({ mediaId: Number(mediaId), note: GENERAL_REFERENCE_LABEL, ...place }));
      if (made.meta.requestStatus === "fulfilled") bookmarkId = made.payload?.id ?? null;
    }

    const chip = sourceChipHtml({
      bookmarkId,
      mediaId: Number(mediaId),
      timestampSeconds: isText ? null : Math.floor(currentTime > 0 ? currentTime : 0),
      pageNumber: page,
      mediaTitle: media?.title,
      note: GENERAL_REFERENCE_LABEL,
      mediaType: media?.media_type,
    });
    const res = await dispatch(createNote({
      title: "",
      // On the references line, like any chip dropped on blank space — so the
      // next one dragged in joins it there. See appendToReferences.
      body: `<p><br></p>${referencesBlockHtml(chip)}`,
      mediaId: Number(mediaId),
      ...(seconds !== undefined && { timestampSeconds: seconds }),
    }));
    if (res.meta.requestStatus !== "fulfilled") {
      // No note, so no reference: the bookmark made for it would be an orphan
      // named "הפנייה כללית" pointing at nothing the user wrote.
      if (bookmarkId) dispatch(deleteBookmark(bookmarkId));
      return;
    }
    setActiveNoteId(res.payload.id);
    setPendingScrollId(res.payload.id);
  };

  // `title` overrides the draft's — it is the name given in the untitled-note
  // dialog, which has not been through the card's own field.
  const handleSave = async (note, { announce = false, title } = {}) => {
    const draft = draftFor(note.id);
    const res = await dispatch(updateNote({
      id: note.id,
      title: title ?? draft.title,
      body: sanitizeNoteHtml(draft.body),
    }));
    if (res.meta.requestStatus === "fulfilled") {
      setDrafts((prev) => Object.fromEntries(
        Object.entries(prev).filter(([id]) => Number(id) !== note.id)
      ));
      if (announce) dispatch(notify({ message: "ההערה נשמרה", severity: "success" }));
    }
  };

  // Every save goes through here, the button and Ctrl+S alike: a card with no
  // title asks for one first (UntitledNoteDialog), and saves as it is only when
  // the user says so.
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
    if (!prompt) return;
    handleSave(prompt.note, { ...prompt.options, title: name });
  };

  // Waits for the delete before forgetting the draft — see the notebook page's
  // handleDeleteConfirm for the note that was lost when it did not.
  const handleDeleteConfirm = async () => {
    const note = deleteTarget;
    setDeleteTarget(null);
    if (!note) return;
    const res = await dispatch(deleteNote(note.id));
    if (res.meta.requestStatus !== "fulfilled") return;
    setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => Number(id) !== note.id)));
    if (activeNoteId === note.id) setActiveNoteId(null);
  };

  // A chip, or a card's "מתוך" button.
  //
  // This lesson: move what is already on the page. A recording seeks; a book
  // scrolls to the mark the chip came from — looked up by chunk first, then by
  // page, exactly as SourcePreviewDialog does, because a text bookmark also
  // carries a page and matching on that first would land on a neighbour.
  //
  // Any other lesson: the floating window, so the note and its unsaved draft
  // stay where they are.
  const openSource = (entry) => {
    if (!entry) return;
    if (Number(entry.mediaId) !== Number(mediaId)) {
      setPreview(entry);
      return;
    }
    if (isText) {
      const found = Number.isInteger(entry.chunkId)
        ? bookmarks.find((b) => b.chunk_id === entry.chunkId)
        : bookmarks.find((b) => isPageBookmark(b) && b.page_number === entry.pageNumber);
      // A copy, so a second click on the same chip is a new target and scrolls
      // again rather than being an unchanged prop the reader ignores.
      if (found) onJumpTo?.({ ...found });
      else if (Number.isInteger(entry.pageNumber)) onJumpTo?.({ page_number: entry.pageNumber });
      else onJumpTo?.(null);
      return;
    }
    onSeek?.(entry.timestampSeconds ?? 0);
  };

  // Ctrl+S saves the card the caret is in. Unlike the notebook page, the
  // keystroke is only taken when there IS such a card: this is a lesson page
  // first, and swallowing the browser's shortcut for someone who never touched
  // a note would be this strip reaching outside itself.
  const saveActiveNote = useRef(() => false);
  useEffect(() => {
    saveActiveNote.current = () => {
      const note = notes.find((n) => n.id === activeNoteId);
      if (!note) return false;
      if (!isDirty(note.id)) {
        dispatch(notify({ message: "אין שינויים לשמירה", severity: "info" }));
      } else {
        requestSave(note, { announce: true });
      }
      return true;
    };
  });

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!isSaveShortcut(event)) return;
      if (event.target?.closest?.('[role="dialog"]')) return;
      if (saveActiveNote.current()) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const cardProps = (note) => ({
    note,
    draft: draftFor(note.id),
    isDirty: isDirty(note.id),
    isActive: note.id === activeNoteId,
    editorRef: (api) => {
      if (api) editorApis.current.set(note.id, api);
      else editorApis.current.delete(note.id);
    },
    cardRef: (node) => {
      if (node) cardNodes.current.set(note.id, node);
      else cardNodes.current.delete(note.id);
    },
    onDraftChange: (draft) => setDrafts((prev) => ({ ...prev, [note.id]: draft })),
    onFormatsChange: setFormats,
    onFocus: () => setActiveNoteId(note.id),
    onError: (message) => dispatch(notify({ message, severity: "warning" })),
    onSave: () => requestSave(note),
    onDelete: () => setDeleteTarget(note),
    onOpenSource: openSource,
    // The pencil on a chip that is a bookmark renames the bookmark — one value,
    // shown in the note and under "הערות אישיות" alike.
    onRenameSource: (bookmarkId, name) => dispatch(updateBookmark({ id: bookmarkId, note: name })),
    onDropSource: (bookmark, point) => {
      editorApis.current.get(note.id)?.insertSource(bookmark, point);
      setActiveNoteId(note.id);
    },
  });

  return {
    notes,
    loading: status === statuses.loading && items.length === 0,
    cardProps,
    handleCreate,
    activeNoteId,
    formats,
    execCommand: (command, value) => editorApis.current.get(activeNoteId)?.exec(command, value),
    setFontSize: (px) => editorApis.current.get(activeNoteId)?.setFontSize(px),
    deleteTarget,
    cancelDelete: () => setDeleteTarget(null),
    handleDeleteConfirm,
    preview,
    closePreview: () => setPreview(null),
    titlePromptOpen: Boolean(titlePrompt),
    confirmTitle,
    cancelTitle: () => setTitlePrompt(null),
  };
};

export default useLessonNotebook;
