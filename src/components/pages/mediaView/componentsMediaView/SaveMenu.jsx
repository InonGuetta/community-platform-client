import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Divider from "@mui/material/Divider";
import Checkbox from "@mui/material/Checkbox";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ConfirmingDeletionDialog from "../../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import { fetchPlaylists } from "../../../../store/slicesAndThunks/savesSlice/savesGet";
import { createPlaylist, addMediaToPlaylist } from "../../../../store/slicesAndThunks/savesSlice/savesPost";
import { renamePlaylist } from "../../../../store/slicesAndThunks/savesSlice/savesPatch";
import { deletePlaylist, removeMediaFromPlaylist } from "../../../../store/slicesAndThunks/savesSlice/savesDelete";
import { statuses, playlistTitleMaxLength } from "../../../../utilities/constant";
import { countLabel } from "../../../../utilities/countLabel";

// Which of the user's own lists this lecture is filed in, and the way to make a
// new one. The general save is NOT here — that is the button this menu hangs off
// — so everything in this menu is about grouping something already kept.
//
// The menu deliberately stays open as rows are ticked: filing one lecture in
// three lists is one trip, not three.

// Anchored to a button at the BOTTOM of a panel, so the menu has to grow upwards
// or it opens off-screen.
const ORIGINS = {
  anchorOrigin: { vertical: "top", horizontal: "right" },
  transformOrigin: { vertical: "bottom", horizontal: "right" },
};

// MenuItem inherits a physical `text-align: left` from MUI, and this app runs
// RTL without the stylis flip plugin, so the label drifts away from its icon.
const itemSx = { textAlign: "start" };

// The two things that can be done TO a list, as opposed to with it, sit together
// at the end of its row and are drawn the same way: quiet until pointed at, and
// then the colour of what they do.
//
// The colour is the whole signal. Red for discarding is a convention nobody has
// to be taught; editing takes the app's own primary, which is what every other
// "carry on and change something" control in the UI is painted with — a second
// alarm colour next to the first would have made both of them mean "careful".
const rowActionSx = (hoverColour) => ({
  color: "text.disabled",
  transition: "color 120ms ease",
  "&:hover": { color: hoverColour, bgcolor: "action.hover" },
});

/**
 * The one row in this menu that is a text field: naming a new list and renaming
 * an existing one are the same act on the same field, with the same cap and the
 * same keys, so they are the same component rather than two rows that started
 * identical and would not have stayed that way.
 *
 * Not a MenuItem: MenuList's keyboard handling treats every keystroke in its
 * children as type-ahead navigation. stopPropagation on the wrapper is what
 * keeps typing a name from jumping the selection around the menu — and what
 * lets Escape mean "abandon this edit" instead of closing the whole menu.
 */
const TitleField = ({ value, onChange, onSubmit, onCancel, actionLabel }) => (
  <Box
    sx={{ display: "flex", gap: 1, px: 1.5, py: 1 }}
    onKeyDown={(e) => e.stopPropagation()}
  >
    <TextField
      autoFocus
      size="small"
      fullWidth
      placeholder="שם הרשימה"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit();
        if (e.key === "Escape") onCancel?.();
      }}
      // Capping the input turns the server's 400 into a field that simply stops
      // accepting.
      slotProps={{ htmlInput: { maxLength: playlistTitleMaxLength } }}
    />
    <Button
      onClick={onSubmit}
      disabled={!value.trim()}
      variant="contained"
      sx={{ flexShrink: 0 }}
    >
      {actionLabel}
    </Button>
  </Box>
);

const SaveMenu = ({ anchorEl, open, onClose, mediaId }) => {
  const dispatch = useDispatch();
  const playlists = useSelector((state) => state.saves.playlists);
  const status = useSelector((state) => state.saves.playlistsStatus);
  const playlistsForMediaId = useSelector((state) => state.saves.playlistsForMediaId);

  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  // The list being renamed, held with its half-typed name: `{ id, title }`.
  const [editing, setEditing] = useState(null);

  const id = Number(mediaId) || null;

  // Fetched on every open rather than once: the `contains` flags describe THIS
  // lecture, and the lists may have changed in another tab since the last look.
  useEffect(() => {
    if (open && id) dispatch(fetchPlaylists(id));
  }, [dispatch, open, id]);

  // A half-typed list name should not be waiting there the next time the menu is
  // opened on a different lecture — neither a new one nor an abandoned rename.
  useEffect(() => {
    if (!open) { setCreating(false); setNewTitle(""); setEditing(null); }
  }, [open]);

  const toggle = (playlist) => {
    const args = { playlistId: playlist.id, mediaId: id };
    dispatch(playlist.contains ? removeMediaFromPlaylist(args) : addMediaToPlaylist(args));
  };

  // Creating a list from here files the lecture into it straight away — wanting
  // somewhere to put THIS lecture is the only reason to make a list at this
  // moment, and leaving it empty would make the user tick it themselves.
  //
  // One request, not two: the server creates the list and files the lecture in a
  // single transaction. As two calls, a failure of the second left an empty list
  // the user never asked for, with a toast that could not explain it.
  const handleCreate = async () => {
    const title = newTitle.trim();
    if (!title) return;
    const result = await dispatch(createPlaylist({ title, mediaId: id }));
    if (result.meta.requestStatus !== "fulfilled") return; // the toast explains it
    setNewTitle("");
    setCreating(false);
  };

  // The row goes back to being a row only once the server has taken the new
  // name. A rename can be refused — two lists of the user's own cannot share a
  // title — and closing the field on a rejection would put the old name back
  // with no sign that anything had been turned down; the toast would be
  // explaining an edit that had already disappeared.
  const handleRename = async () => {
    const title = editing.title.trim();
    if (!title) return;
    const result = await dispatch(renamePlaylist({ playlistId: editing.id, title }));
    if (result.meta.requestStatus !== "fulfilled") return; // the toast explains it
    setEditing(null);
  };

  const confirmDelete = () => {
    dispatch(deletePlaylist(pendingDelete.id));
    setPendingDelete(null);
  };

  // Whether the rows in the store describe THIS lecture. The store holds one
  // list array and its `contains` flags belong to whichever lecture was loaded
  // last, so this is the difference between showing ticks and showing someone
  // else's ticks. Reopening the same lecture matches immediately, so there is no
  // flicker while the background refresh runs.
  const showsThisMedia = playlistsForMediaId === id;

  // Told apart from "no lists yet" deliberately. They looked identical here at
  // first — an empty list was drawn whenever nothing had loaded — so a request
  // failing with a 500 presented as a cheerful "you have not made any lists",
  // which is the one message guaranteed to send someone looking in the wrong
  // place. An empty state must only ever mean the server said "empty".
  const failed = status === statuses.failed;
  const loading = !failed && !showsThisMedia;

  return (
    <>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        {...ORIGINS}
        slotProps={{ paper: { sx: { minWidth: 290, maxWidth: 360 } } }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", px: 2, pt: 0.5, pb: 1 }}
        >
          הוספה לרשימת שיעורים
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={22} />
          </Box>
        )}

        {failed && (
          <Typography variant="body2" color="error" sx={{ px: 2, pb: 1.5 }}>
            טעינת הרשימות נכשלה. נסה לפתוח שוב.
          </Typography>
        )}

        {showsThisMedia && playlists.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2, pb: 1.5 }}>
            עדיין אין לך רשימות. אפשר ליצור אחת כאן.
          </Typography>
        )}

        {/* Rendered only once the rows are known to be this lecture's — see
            showsThisMedia. Drawing them earlier meant drawing another lecture's
            ticks, and a click then sent the opposite operation. */}
        {showsThisMedia && playlists.map((playlist) => (
          editing?.id === playlist.id ? (
            <TitleField
              key={playlist.id}
              value={editing.title}
              onChange={(title) => setEditing({ ...editing, title })}
              onSubmit={handleRename}
              onCancel={() => setEditing(null)}
              actionLabel="עדכון"
            />
          ) : (
          <MenuItem key={playlist.id} onClick={() => toggle(playlist)} sx={itemSx}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              {/* tabIndex -1 / disableRipple: the row is the control, and the
                  checkbox inside it must not be a second tab stop that toggles
                  the same thing. */}
              <Checkbox
                edge={false}
                size="small"
                checked={Boolean(playlist.contains)}
                tabIndex={-1}
                disableRipple
                sx={{ p: 0 }}
              />
            </ListItemIcon>
            <ListItemText
              primary={playlist.title}
              secondary={countLabel(playlist.item_count, "שיעור אחד", "שיעורים")}
              slotProps={{ primary: { noWrap: true } }}
            />
            {/* stopPropagation on both, or acting on a list would first tick
                it — the row itself is the toggle. */}
            <IconButton
              size="small"
              aria-label={`שינוי שם הרשימה ${playlist.title}`}
              onClick={(e) => { e.stopPropagation(); setEditing({ id: playlist.id, title: playlist.title }); }}
              sx={{ ml: -0.5, ...rowActionSx("primary.main") }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              aria-label={`מחיקת הרשימה ${playlist.title}`}
              onClick={(e) => { e.stopPropagation(); setPendingDelete(playlist); }}
              sx={rowActionSx("error.main")}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </MenuItem>
          )
        ))}

        {/* Hidden while the lists could not be loaded. Creating one then would
            add a row to a list the user cannot see the rest of, and the new
            entry would sit alone above an error message as if it were the only
            list they had. */}
        {!failed && <Divider />}

        {failed ? null : creating ? (
          <TitleField
            value={newTitle}
            onChange={setNewTitle}
            onSubmit={handleCreate}
            onCancel={() => { setCreating(false); setNewTitle(""); }}
            actionLabel="יצירה"
          />
        ) : (
          <MenuItem onClick={() => setCreating(true)} sx={itemSx}>
            <ListItemIcon sx={{ minWidth: 36 }}><AddIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="רשימה חדשה" />
          </MenuItem>
        )}
      </Menu>

      {/* Outside the Menu on purpose: a dialog rendered as a menu child inherits
          the menu's focus management, and closing one would close both. */}
      <ConfirmingDeletionDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        itemName={pendingDelete?.title}
        message={
          <>
            האם למחוק את הרשימה <strong>{pendingDelete?.title}</strong>? השיעורים עצמם יישארו
            שמורים, רק הרשימה תימחק.
          </>
        }
      />
    </>
  );
};

export default SaveMenu;
