import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { updateNote } from "../../../store/slicesAndThunks/notesSlice/notesPut";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { noteBodyToHtml, sanitizeNoteHtml } from "../../../utilities/noteHtml";
import { syncChipNames } from "../../../utilities/noteSource";

// Editing a column of note cards — the part the notebook page
// (pages/notebook/useNotebookPageController) and the strip under a lesson
// (pages/mediaView/useLessonNotebook) do by the same rules, so it is written
// once. A second notebook with its own idea of when typing is safe to discard
// is how a user loses a paragraph in one of the two.
//
//   drafts       only for notes actually touched. Anything absent is read from
//                the note itself, so opening the page allocates nothing, a
//                reload of the list cannot silently discard someone's unsaved
//                typing, and "is this dirty" is answered against the same
//                baseline the editor was seeded from.
//   the save     sanitised on the way out, the draft dropped only on success —
//                a failed save leaves the typing exactly where it is.
//   a title      a card with none asks for one first (UntitledNoteDialog), and
//                saves as it is only when the user says so.
//   the caret    which card it is in (activeNoteId): the toolbar is one strip
//                for a column of editors and needs to know which to talk to.
//
// What each page decides for itself stays with it: which notes it shows, how a
// new note is made, when Ctrl+S is its business (saveActiveNote is what it
// does once it is), what a source chip opens, and what deleting involves —
// forgetNotes is what follows a delete that succeeded.
//
// `lightList` is the notebook's list (PRD NOTE-17): a note may arrive without
// its body, and then it has no baseline and no draft — draftFor answers null,
// never an empty draft, so an empty one can never be written over the real
// body; asking to save it calls `onBodyMissing` instead. Under a lesson every
// note arrives whole.
//
// `scrollBlock` is where a card asked for (focusNote) is scrolled to: the top
// of the notebook page, the middle of the strip under a lesson.

const EMPTY_DRAFT_OF = () => ({ title: "", body: "" });

/**
 * @param {object} options
 * @param {any[]} options.notes                    the notes on this page
 * @param {Map<number, string>} options.names      bookmark names, for syncChipNames
 * @param {boolean} [options.lightList]
 * @param {(note: any) => void} [options.onBodyMissing]
 * @param {ScrollLogicalPosition} options.scrollBlock
 */
export const useNoteEditing = ({ notes, names, lightList = false, onBodyMissing, scrollBlock }) => {
  const dispatch = useDispatch();
  const [drafts, setDrafts] = useState({});
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [formats, setFormats] = useState({});

  // The editors' imperative handles and the cards' DOM nodes, by note id. Refs
  // rather than state: nothing on screen depends on them, and re-rendering the
  // page every time one registered would be a render per card on every load.
  const editorApis = useRef(new Map());
  const cardNodes = useRef(new Map());

  // What each note looks like BEFORE anyone edits it — the editor's starting
  // value and the thing "dirty" is measured against.
  //
  // The body goes through noteBodyToHtml because the column holds two kinds of
  // value: markup for anything written since the toolbar existed, and plain text
  // with newlines for everything written before it. Computed once per change to
  // the list rather than per render: the conversion parses HTML, and doing it
  // for every note on every keystroke would be a parse per note per character.
  // Every chip that is a bookmark shows that bookmark's current name — see
  // syncChipNames.
  const baselines = useMemo(() => {
    const map = new Map();
    for (const note of notes) {
      if (lightList && typeof note.body !== "string") continue;
      map.set(note.id, { title: note.title || "", body: syncChipNames(noteBodyToHtml(note.body), names) });
    }
    return map;
  }, [notes, names, lightList]);

  const draftFor = (id) => drafts[id] ?? baselines.get(id) ?? (lightList ? null : EMPTY_DRAFT_OF());

  const isDirty = (id) => {
    const draft = drafts[id];
    const baseline = baselines.get(id);
    if (!draft || !baseline) return false;
    return draft.title !== baseline.title || draft.body !== baseline.body;
  };

  // A card asked for — a new note, or one picked from a list — may not exist
  // yet: a new note only has one after the store has come back and the page has
  // re-rendered. So the request is parked and the effect below spends it as
  // soon as there is something to scroll to.
  const [pendingScrollId, setPendingScrollId] = useState(null);
  useEffect(() => {
    if (!pendingScrollId) return;
    const node = cardNodes.current.get(pendingScrollId);
    if (!node) return;
    node.scrollIntoView?.({ behavior: "smooth", block: scrollBlock });
    setPendingScrollId(null);
  }, [notes, pendingScrollId, scrollBlock]);

  const focusNote = (id) => {
    setActiveNoteId(id);
    setPendingScrollId(id);
  };

  // `title` overrides the draft's — it is the name given in the untitled-note
  // dialog, which has not been through the card's own field.
  const handleSave = async (note, { announce = false, title } = {}) => {
    const draft = draftFor(note.id);
    // Nothing to save until the body has arrived — see draftFor.
    if (!draft) return;
    const res = await dispatch(updateNote({
      id: note.id,
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

  // Every save goes through here, the button and Ctrl+S alike.
  const [titlePrompt, setTitlePrompt] = useState(null);

  const requestSave = (note, options = {}) => {
    const draft = draftFor(note.id);
    if (!draft) {
      onBodyMissing?.(note);
      return;
    }
    if (!draft.title.trim()) {
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

  // Saving the card the caret is in — what Ctrl+S does, on either page, once
  // the page has decided the keystroke is its business. False when no card has
  // the caret, so the page can say what that means where it is.
  //
  // Held in a ref rather than rebuilt for each listener: it reads the drafts,
  // which change on every keystroke, and a window listener keyed on those would
  // detach and re-attach as fast as the user can type.
  const saveActive = useRef(() => false);
  useEffect(() => {
    saveActive.current = () => {
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
  const saveActiveNote = useCallback(() => saveActive.current(), []);

  // After notes are deleted — only those the server actually deleted, which is
  // why each page waits for it: a lingering draft would be re-applied to
  // whatever note reused the id, and a delete that failed must leave the note
  // on screen with its draft, the one state the user cannot recover from.
  const forgetNotes = (ids) => {
    const gone = new Set(ids);
    setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !gone.has(Number(id)))));
    if (activeNoteId !== null && gone.has(activeNoteId)) setActiveNoteId(null);
  };

  return {
    drafts,
    setDrafts,
    draftFor,
    isDirty,
    activeNoteId,
    setActiveNoteId,
    formats,
    setFormats,
    editorApis,
    cardNodes,
    focusNote,
    requestSave,
    titlePrompt,
    setTitlePrompt,
    confirmTitle,
    saveActiveNote,
    forgetNotes,
  };
};
