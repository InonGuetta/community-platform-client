import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import { fetchNotes } from "../../../store/slicesAndThunks/notesSlice/notesGet";
import { createNote } from "../../../store/slicesAndThunks/notesSlice/notesPost";
import { updateNote } from "../../../store/slicesAndThunks/notesSlice/notesPut";
import { deleteNote } from "../../../store/slicesAndThunks/notesSlice/notesDelete";
import { fetchBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksGet";
import { clearBookmarks } from "../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";
import { statuses, mediaTypeLabels, mediaTypeAccents } from "../../../utilities/constant";
import { formatTime } from "../../../utilities/formatTime";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

const NotebookPage = () => {
  const dispatch = useDispatch();
  const { items, status } = useSelector((state) => state.notes);
  const { items: bookmarks, status: bookmarksStatus } = useSelector((state) => state.bookmarks);

  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    dispatch(fetchNotes());
    // The bookmarks slice is shared with the media page, which loads only one
    // lecture's worth. Clear first so that subset is not briefly rendered here
    // as if it were the user's whole collection.
    dispatch(clearBookmarks());
    dispatch(fetchBookmarks());
  }, [dispatch]);

  const selected = useMemo(() => items.find((n) => n.id === selectedId) || null, [items, selectedId]);

  // Keep the first note selected as data loads / changes, so the editor is
  // never staring at an empty pane when notes exist.
  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].id);
  }, [items, selectedId]);

  // Sync the editable draft whenever the selected note changes.
  useEffect(() => {
    setDraft({ title: selected?.title || "", body: selected?.body || "" });
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((n) =>
      `${n.title || ""} ${n.body || ""} ${n.media_title || ""}`.toLowerCase().includes(q)
    );
  }, [items, search]);

  // Every bookmark the user has left anywhere on the platform, grouped under
  // the lecture it belongs to. The API already returns them ordered by lecture
  // title and then by timestamp, so a single pass preserves that order.
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
    return groups;
  }, [bookmarks, search]);

  const isDirty =
    selected && (draft.title !== (selected.title || "") || draft.body !== (selected.body || ""));

  const handleCreate = async () => {
    const res = await dispatch(createNote({ title: "", body: "" }));
    if (res.meta.requestStatus === "fulfilled") setSelectedId(res.payload.id);
  };

  const handleSave = () => {
    if (!selected) return;
    dispatch(updateNote({ id: selected.id, title: draft.title, body: draft.body }));
  };

  // Deleting is irreversible and the note is the user's own writing, so it goes
  // through a confirmation step rather than firing straight off the icon.
  const handleDeleteConfirm = () => {
    setConfirmDeleteOpen(false);
    if (!selected) return;
    dispatch(deleteNote(selected.id));
    setSelectedId(null);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 64px)", bgcolor: "background.default", p: 3, gap: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h4" fontWeight={800} color="primary">המחברת שלי</Typography>
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

      <Box sx={{ display: "flex", gap: 3, flexGrow: 1, flexDirection: { xs: "column", md: "row" } }}>
        {/* List column */}
        <Paper elevation={0} sx={{ width: { xs: "100%", md: 340 }, flexShrink: 0, p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            placeholder="חיפוש במחברת..."
            InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
          />

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
                const isActive = n.id === selectedId;
                return (
                  <ListItemButton
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    sx={{
                      alignItems: "flex-start", flexDirection: "column", gap: 0.5,
                      borderRadius: 2, mb: 1,
                      bgcolor: isActive ? "primary.light" : "grey.50",
                      color: isActive ? "primary.contrastText" : "inherit",
                      "&:hover": { bgcolor: isActive ? "primary.main" : "grey.100" },
                    }}
                  >
                    <Typography fontWeight={700} noWrap sx={{ width: "100%" }}>
                      {n.title?.trim() || "(ללא כותרת)"}
                    </Typography>
                    <Typography variant="body2" noWrap sx={{ width: "100%", opacity: 0.8 }}>
                      {n.body?.trim() || "—"}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>{formatDate(n.updated_at)}</Typography>
                      {n.media_title && (
                        <Chip size="small" label={n.media_title} sx={{ height: 18, fontSize: "0.65rem", maxWidth: 150 }} />
                      )}
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
                          component={RouterLink}
                          to={`/media/${group.mediaId}?t=${bm.timestamp_seconds}`}
                          sx={{
                            display: "flex", alignItems: "center", gap: 1,
                            borderRadius: 2, mb: 0.5, bgcolor: "grey.50",
                            "&:hover": { bgcolor: "grey.100" },
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

        {/* Editor column */}
        <Paper elevation={0} sx={{ flexGrow: 1, p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 2, minHeight: 400 }}>
          {selected ? (
            <>
              <TextField
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                placeholder="כותרת ההערה"
                variant="standard"
                InputProps={{ disableUnderline: true, sx: { fontSize: "1.5rem", fontWeight: 700 } }}
              />

              {selected.media_id && (
                <Button
                  component={RouterLink}
                  to={`/media/${selected.media_id}${selected.timestamp_seconds != null ? `?t=${selected.timestamp_seconds}` : ""}`}
                  startIcon={<PlayCircleOutlineIcon />}
                  size="small"
                  sx={{ alignSelf: "flex-start", textTransform: "none" }}
                >
                  {`מתוך: ${selected.media_title || "שיעור"}${selected.timestamp_seconds != null ? ` · ${formatTime(selected.timestamp_seconds)}` : ""}`}
                </Button>
              )}

              <TextField
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                placeholder="כתוב כאן את ההערה שלך..."
                multiline
                minRows={12}
                fullWidth
                variant="outlined"
                sx={{ flexGrow: 1 }}
              />

              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">
                  {`עודכן לאחרונה: ${formatDate(selected.updated_at)}`}
                </Typography>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <IconButton color="error" onClick={() => setConfirmDeleteOpen(true)} aria-label="מחיקת הערה">
                    <DeleteIcon />
                  </IconButton>
                  <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!isDirty}
                    sx={{ borderRadius: 2, fontWeight: 700 }}>
                    שמירה
                  </Button>
                </Box>
              </Box>
            </>
          ) : (
            <Box sx={{ flexGrow: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "text.secondary" }}>
              <NoteAltOutlinedIcon sx={{ fontSize: 64, opacity: 0.4 }} />
              <Typography>בחר הערה מהרשימה או צור הערה חדשה.</Typography>
            </Box>
          )}
        </Paper>
      </Box>

      <ConfirmingDeletionDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        message={`האם אתה בטוח שאתה מעוניין למחוק את המחברת "${selected?.title?.trim() || "ללא כותרת"}"?`}
      />
    </Box>
  );
};

export default NotebookPage;
