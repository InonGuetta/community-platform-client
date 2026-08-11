import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import IosShareIcon from "@mui/icons-material/IosShare";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import SourcePreviewDialog from "./componentsNotebook/SourcePreviewDialog";
import NoteToolbar from "./componentsNotebook/NoteToolbar";
import NoteCard from "./componentsNotebook/NoteCard";
import { fetchNotes } from "../../../store/slicesAndThunks/notesSlice/notesGet";
import { createNote } from "../../../store/slicesAndThunks/notesSlice/notesPost";
import { updateNote } from "../../../store/slicesAndThunks/notesSlice/notesPut";
import { deleteNote } from "../../../store/slicesAndThunks/notesSlice/notesDelete";
import { fetchBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksGet";
import { clearBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import { notify } from "../../../store/slicesAndThunks/notificationSlice";
import { statuses, mediaTypeLabels, mediaTypeAccents, listRowSx } from "../../../utilities/constant";
import { formatTime } from "../../../utilities/formatTime";
import { noteBodyToHtml, noteHtmlToPlainText, sanitizeNoteHtml } from "../../../utilities/noteHtml";
import { downloadNotesPdf, downloadNotesWord } from "../../../utilities/notesExport";

// Identity of a source entry, for keeping the trail free of duplicates.
const sourceKey = (entry) => `${entry.mediaId}:${entry.timestampSeconds ?? ""}`;

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

// The sticky navbar's height, which this page's own height is measured against.
const NAVBAR_HEIGHT = 64;

const NotebookPage = () => {
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
  const baselines = useMemo(() => {
    const map = new Map();
    for (const note of items) {
      map.set(note.id, { title: note.title || "", body: noteBodyToHtml(note.body) });
    }
    return map;
  }, [items]);

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
    for (const group of groups) {
      group.items.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
    }
    return groups;
  }, [bookmarks, search]);

  // The lecture's bookmarks, for the preview's timeline and its notes tab.
  // Sorted, not merely filtered: NotesPanel walks the list assuming ascending
  // time and stops at the first entry past the playhead, so a newly created
  // bookmark sitting at the end would make it highlight the wrong one.
  const sourceBookmarks = useMemo(
    () => (source
      ? bookmarks
        .filter((bm) => bm.media_id === source.mediaId)
        .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
      : []),
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
  const handleSave = async (note) => {
    const draft = draftFor(note.id);
    const res = await dispatch(updateNote({
      id: note.id,
      title: draft.title,
      body: sanitizeNoteHtml(draft.body),
    }));
    if (res.meta.requestStatus === "fulfilled") {
      setDrafts((prev) => Object.fromEntries(
        Object.entries(prev).filter(([id]) => Number(id) !== note.id)
      ));
    }
  };

  // Deleting is irreversible and the notes are the user's own writing, so both
  // the single-note button and the bulk action go through the same confirmation
  // — the only difference is how many notes are named in it.
  const handleDeleteConfirm = () => {
    const targets = deleteTargets ?? [];
    setDeleteTargets(null);
    const ids = new Set(targets.map((note) => note.id));

    for (const id of ids) dispatch(deleteNote(id));

    // Everything the page still holds ABOUT those notes goes with them: a
    // lingering draft would be re-applied to whatever note reused the id, and a
    // lingering tick would keep a deleted note in the selection count.
    setDrafts((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !ids.has(Number(id)))));
    setSelectedIds((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    if (activeNoteId && ids.has(activeNoteId)) setActiveNoteId(null);
  };

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
  const notesToExport = selectedNotes.length > 0 ? selectedNotes : filtered;

  // Both formats pull their machinery in on demand — jsPDF, the bidi tables and
  // the Hebrew font for one — so this is async and can fail. A failure is
  // reported rather than swallowed: from the user's side a silent no-op is
  // indistinguishable from a click that missed.
  const handleExport = async (write) => {
    setExportAnchor(null);
    setExporting(true);
    try {
      await write(notesToExport);
    } catch {
      dispatch(notify({ message: "הייצוא נכשל. נסה שוב.", severity: "error" }));
    } finally {
      setExporting(false);
    }
  };

  const selectedCount = selectedIds.size;

  return (
    <Box
      sx={{
        display: "flex", flexDirection: "column", gap: 2, p: 3,
        bgcolor: "background.default",
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        // From md up the PAGE does not scroll — the column of notes does. That
        // is what keeps the formatting strip and the notes list in place while
        // the user moves down a long notebook, without either of them having to
        // be positioned by hand against a header of a height nobody can predict
        // once it starts wrapping. Below md the two stack and the page scrolls
        // normally, where a pinned strip would eat most of a phone's screen.
        height: { md: `calc(100vh - ${NAVBAR_HEIGHT}px)` },
        overflow: { md: "hidden" },
      }}
    >
      {/* Header — title, the formatting strip, and the one action that makes a
          new note. The toolbar sits BETWEEN them, filling the space the header
          had going spare, and wraps under the title on a narrow screen rather
          than squeezing the two ends together. */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", flexShrink: 0 }}>
        <Typography variant="h4" fontWeight={800} color="primary">המחברת שלי</Typography>

        <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", minWidth: 300 }}>
          <NoteToolbar
            onCommand={(command, value) => editorApis.current.get(activeNoteId)?.exec(command, value)}
            // A pixel size is not an execCommand — see RichNoteEditor.setFontSize
            // — so it has its own way in rather than a fake command name.
            onFontSize={(px) => editorApis.current.get(activeNoteId)?.setFontSize(px)}
            formats={formats}
            // Nothing to format until the caret is in one of the cards. The
            // strip stays in place and fades, so the header does not change
            // shape as the user moves between notes.
            disabled={!activeNoteId}
          />
        </Box>

        {/* Export sits next to "new note" rather than down in the list with the
            tick boxes: it acts on the notebook, like the button beside it, and
            the two formats are a choice worth showing by name. */}
        <Tooltip title={selectedCount > 0 ? `ייצוא ${selectedCount} ההערות שנבחרו` : "ייצוא כל ההערות המוצגות"}>
          <span>
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={18} /> : <IosShareIcon />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
              disabled={exporting || notesToExport.length === 0}
              aria-haspopup="menu"
              sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
            >
              ייצוא
            </Button>
          </span>
        </Tooltip>

        <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
          {/* Named so the user knows what is about to be written before it is
              written — the count, and which of the two documents it will be. */}
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
            {selectedCount > 0 ? `${selectedCount} הערות שנבחרו` : `כל ההערות המוצגות (${notesToExport.length})`}
          </Typography>
          <MenuItem onClick={() => handleExport(downloadNotesPdf)} sx={{ textAlign: "start" }}>
            <ListItemIcon><PictureAsPdfOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="ייצוא ל-PDF" secondary="טקסט בלבד, ללא עיצוב ותמונות" />
          </MenuItem>
          <MenuItem onClick={() => handleExport(downloadNotesWord)} sx={{ textAlign: "start" }}>
            <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="ייצוא ל-Word" secondary="עם העיצוב והתמונות" />
          </MenuItem>
        </Menu>

        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}
          sx={{
            background: "linear-gradient(135deg, #29b6d8 0%, #1597bb 100%)",
            "&:hover": { background: "linear-gradient(135deg, #1ea7ca 0%, #128aab 100%)" },
            borderRadius: 2, fontWeight: 700, px: 3, boxShadow: "0 3px 10px rgba(21,151,187,0.35)",
          }}
        >
          הערה חדשה
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexGrow: 1, minHeight: 0, flexDirection: { xs: "column", md: "row" } }}>
        {/* List column — an index of the notebook rather than a chooser: every
            note is already open in the column beside it, so a row here scrolls
            to its card. It is also where notes are ticked for a bulk action. */}
        <Paper elevation={0} sx={{ width: { xs: "100%", md: 340 }, flexShrink: 0, height: { md: "100%" }, minHeight: 0, p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            placeholder="חיפוש במחברת..."
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          />

          {/* The bulk bar. Always present so the tick-all box has a fixed home,
              but the actions only appear once something is ticked — a delete
              button that can only ever act on nothing is just a trap. */}
          {items.length > 0 && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minHeight: 34 }}>
              <Checkbox
                size="small"
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected && !allVisibleSelected}
                onChange={toggleAllVisible}
                inputProps={{ "aria-label": "בחירת כל ההערות המוצגות" }}
                sx={{ p: 0.5 }}
              />
              <Typography variant="caption" color="text.secondary">
                {selectedCount > 0 ? `${selectedCount} נבחרו` : "בחירה מרובה"}
              </Typography>

              <Box sx={{ flexGrow: 1 }} />

              {/* Only delete lives here. Export moved up beside "new note" —
                  see the header — and offering it in two places would be two
                  things to keep in step for one action. */}
              {selectedCount > 0 && (
                <Tooltip title="מחיקת הנבחרות">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => setDeleteTargets(selectedNotes)}
                    aria-label="מחיקת הנבחרות"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}

          <Box sx={{ flexGrow: 1, minHeight: 100, overflowY: "auto" }}>
          {status === statuses.loading && items.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>
          ) : filtered.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
              {items.length === 0 ? "עדיין אין הערות. צור הערה חדשה כדי להתחיל." : "לא נמצאו הערות תואמות."}
            </Typography>
          ) : (
            <List dense disablePadding sx={{ overflowY: "auto" }}>
              {filtered.map((n) => {
                const isActive = n.id === activeNoteId;
                return (
                  <ListItemButton
                    key={n.id}
                    onClick={() => goToNote(n.id)}
                    sx={{
                      alignItems: "flex-start", gap: 1,
                      borderRadius: 2, mb: 1,
                      ...listRowSx,
                      ...(isActive && {
                        bgcolor: "primary.light",
                        color: "primary.contrastText",
                        "&:hover": { bgcolor: "primary.main" },
                      }),
                    }}
                  >
                    {/* Ticking a note is not opening it, so the box swallows the
                        click that would otherwise scroll the column away from
                        whatever the user was reading. */}
                    <Checkbox
                      size="small"
                      checked={selectedIds.has(n.id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => toggleSelected(n.id)}
                      inputProps={{ "aria-label": `בחירת ההערה ${n.title?.trim() || "ללא כותרת"}` }}
                      sx={{ p: 0.5, mt: -0.25, color: "inherit" }}
                    />

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, flexGrow: 1 }}>
                      <Typography fontWeight={700} noWrap sx={{ width: "100%" }}>
                        {n.title?.trim() || "(ללא כותרת)"}
                      </Typography>
                      <Typography variant="body2" noWrap sx={{ width: "100%", opacity: 0.8 }}>
                        {/* The one line of preview is text, not markup — the row
                            is a single line and rendering the note's formatting
                            in it would only make the line taller. */}
                        {noteHtmlToPlainText(n.body).trim() || "—"}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{formatDate(n.updated_at)}</Typography>
                        {isDirty(n.id) && (
                          <Chip size="small" color="warning" label="לא נשמר" sx={{ height: 18, fontSize: "0.65rem" }} />
                        )}
                        {n.media_title && (
                          <Chip size="small" label={n.media_title} sx={{ height: 18, fontSize: "0.65rem", maxWidth: 150 }} />
                        )}
                      </Box>
                    </Box>
                  </ListItemButton>
                );
              })}
            </List>
          )}
          </Box>

          {/* Every bookmark the user has left across the platform, so the
              notebook is one place for both kinds of personal marking. */}
          <Divider />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: "45%", minHeight: 120 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BookmarkIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" fontWeight={700}>הסימניות שלי</Typography>
              {bookmarks.length > 0 && (
                <Chip size="small" label={bookmarks.length} sx={{ height: 18, fontSize: "0.65rem" }} />
              )}
            </Box>

            {bookmarksStatus === statuses.loading && bookmarks.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={22} /></Box>
            ) : bookmarkGroups.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
                {bookmarks.length === 0
                  ? "עדיין אין סימניות. סמן נקודות בשיעורים והן יופיעו כאן."
                  : "לא נמצאו סימניות תואמות."}
              </Typography>
            ) : (
              <Box sx={{ overflowY: "auto" }}>
                {bookmarkGroups.map((group) => (
                  <Box key={group.mediaId} sx={{ mb: 1.5 }}>
                    {/* "וידאו | כותרת השיעור", on the same accent the archive
                        card uses for that type, so a bookmark is recognisable
                        as video / audio / text at a glance. */}
                    <Box
                      sx={{
                        display: "flex", alignItems: "center", gap: 0.75,
                        px: 1, py: 0.5, mb: 0.5, borderRadius: 1.5,
                        bgcolor: mediaTypeAccents[group.mediaType] || "grey.600",
                        color: "#fff",
                      }}
                      title={group.mediaTitle}
                    >
                      <Typography variant="caption" fontWeight={800} sx={{ flexShrink: 0 }}>
                        {mediaTypeLabels[group.mediaType] || "שיעור"}
                      </Typography>
                      <Box sx={{ width: "1px", alignSelf: "stretch", bgcolor: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
                      <Typography variant="caption" fontWeight={700} noWrap sx={{ minWidth: 0 }}>
                        {group.mediaTitle}
                      </Typography>
                    </Box>
                    <List dense disablePadding>
                      {group.items.map((bm) => (
                        <ListItemButton
                          key={bm.id}
                          onClick={() => openSource({
                            mediaId: group.mediaId,
                            timestampSeconds: bm.timestamp_seconds,
                            mediaTitle: group.mediaTitle,
                            noteText: bm.note,
                          })}
                          sx={{
                            display: "flex", alignItems: "center", gap: 1,
                            borderRadius: 2, mb: 0.5,
                            ...listRowSx,
                          }}
                        >
                          <PlayCircleOutlineIcon fontSize="small" sx={{ color: "primary.main", flexShrink: 0 }} />
                          <Typography variant="body2" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
                            {bm.note?.trim() || "(ללא כותרת)"}
                          </Typography>
                          <Chip
                            size="small"
                            label={formatTime(bm.timestamp_seconds)}
                            sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Paper>

        {/* The notes themselves — every one of them, in the list's order, as a
            scrolling column. This is the pane that moves; everything else on the
            page stays where it is. */}
        <Box
          sx={{
            flexGrow: 1, minWidth: 0, minHeight: 0,
            display: "flex", flexDirection: "column", gap: 2,
            overflowY: { md: "auto" },
            // Room for the scrollbar so it does not sit on the cards' edge.
            pl: { md: 1 },
          }}
        >
          {status === statuses.loading && items.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Paper elevation={0} sx={{ flexGrow: 1, p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "text.secondary", minHeight: 400 }}>
              <NoteAltOutlinedIcon sx={{ fontSize: 64, opacity: 0.4 }} />
              <Typography>
                {items.length === 0 ? "עדיין אין הערות. צור הערה חדשה כדי להתחיל." : "אין הערות התואמות את החיפוש."}
              </Typography>
            </Paper>
          ) : (
            filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                draft={draftFor(note.id)}
                isDirty={isDirty(note.id)}
                isActive={note.id === activeNoteId}
                // Callback refs, so a card that leaves the list takes its entry
                // with it instead of leaving a handle to a dead editor behind.
                editorRef={(api) => {
                  if (api) editorApis.current.set(note.id, api);
                  else editorApis.current.delete(note.id);
                }}
                cardRef={(node) => {
                  if (node) cardNodes.current.set(note.id, node);
                  else cardNodes.current.delete(note.id);
                }}
                onDraftChange={(draft) => setDrafts((prev) => ({ ...prev, [note.id]: draft }))}
                onFormatsChange={setFormats}
                onFocus={() => setActiveNoteId(note.id)}
                // A paste that could not be embedded — an image over the size
                // cap, a file that would not read. Silence would look like a
                // paste that simply did nothing.
                onError={(message) => dispatch(notify({ message, severity: "warning" }))}
                onSave={() => handleSave(note)}
                onDelete={() => setDeleteTargets([note])}
                onOpenSource={openSource}
              />
            ))
          )}
        </Box>
      </Box>

      {/* Mounted only while a source is open, rather than sitting there closed.
          The window renders nothing without one, but its HOOKS still ran — and
          they fetch the viewer's liked and saved id sets for the actions bar
          inside it, so simply opening the notebook cost two requests for a
          window nobody had asked for. Nothing is lost by unmounting: the trail
          lives in this page's state, and the window re-fetches its lecture on
          every open in any case. */}
      {source && (
      <SourcePreviewDialog
        open
        // Two different closes: the X only puts the window away, so the trail
        // survives and reopening a source rejoins it. The footer button ends
        // the run outright.
        onClose={() => setSourceIndex(-1)}
        onCloseCurrent={closeCurrentSource}
        onCloseAll={() => { setSourceIndex(-1); setSourceTrail([]); }}
        mediaId={source?.mediaId}
        timestampSeconds={source?.timestampSeconds}
        fallbackTitle={source?.mediaTitle}
        noteText={source?.noteText}
        bookmarks={sourceBookmarks}
        trailPosition={sourceIndex + 1}
        trailLength={sourceTrail.length}
        onPrev={sourceIndex > 0 ? () => setSourceIndex(sourceIndex - 1) : null}
        onNext={sourceIndex < sourceTrail.length - 1 ? () => setSourceIndex(sourceIndex + 1) : null}
      />
      )}

      <ConfirmingDeletionDialog
        open={Boolean(deleteTargets)}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleDeleteConfirm}
        message={
          deleteTargets?.length === 1
            ? `האם אתה בטוח שאתה מעוניין למחוק את ההערה "${deleteTargets[0].title?.trim() || "ללא כותרת"}"?`
            : `האם אתה בטוח שאתה מעוניין למחוק ${deleteTargets?.length ?? 0} הערות? לא ניתן לבטל פעולה זו.`
        }
      />
    </Box>
  );
};

export default NotebookPage;
