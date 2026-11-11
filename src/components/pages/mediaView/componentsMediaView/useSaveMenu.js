import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchPlaylists } from "../../../../store/slicesAndThunks/savesSlice/savesGet";
import { createPlaylist, addMediaToPlaylist } from "../../../../store/slicesAndThunks/savesSlice/savesPost";
import { renamePlaylist } from "../../../../store/slicesAndThunks/savesSlice/savesPatch";
import { deletePlaylist, removeMediaFromPlaylist } from "../../../../store/slicesAndThunks/savesSlice/savesDelete";
import { notify } from "../../../../store/slicesAndThunks/notificationSlice";
import {
  selectPlaylists, selectPlaylistsStatus, selectPlaylistsForMediaId,
} from "../../../../store/selectors/savesSelectors";
import { statuses } from "../../../../utilities/constant";

// What the save menu does — which of the user's lists this lecture is in,
// ticking, making, renaming and deleting a list — so that SaveMenu.jsx is
// layout only. See SaveMenu.jsx for what the menu is for.

// How long a fresh tick stays on screen before the menu closes.
const CLOSE_AFTER_ADD_MS = 300;

/**
 * @param {{ open: boolean, onClose: () => void, mediaId: number|string }} props
 */
export const useSaveMenu = ({ open, onClose, mediaId }) => {
  const dispatch = useDispatch();
  const playlists = useSelector(selectPlaylists);
  const status = useSelector(selectPlaylistsStatus);
  const playlistsForMediaId = useSelector(selectPlaylistsForMediaId);

  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  // The list being renamed, held with its half-typed name: `{ id, title }`.
  const [editing, setEditing] = useState(null);

  const id = Number(mediaId) || null;

  // The pending close after a tick. Cleared on unmount, so a menu that went away
  // for some other reason is not told to close a third of a second later.
  const closeTimer = useRef(null);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Fetched on every open rather than once: the `contains` flags describe THIS
  // lecture, and the lists may have changed in another tab since the last look.
  useEffect(() => {
    if (open && id) dispatch(fetchPlaylists({ mediaId: id }));
  }, [dispatch, open, id]);

  // A half-typed list name should not be waiting there the next time the menu is
  // opened on a different lecture — neither a new one nor an abandoned rename.
  useEffect(() => {
    if (!open) { setCreating(false); setNewTitle(""); setEditing(null); }
  }, [open]);

  const toggle = async (playlist) => {
    const args = { playlistId: playlist.id, mediaId: id };
    if (playlist.contains) {
      dispatch(removeMediaFromPlaylist(args));
      return;
    }

    // The tick is optimistic, so it is already on screen; the menu closes without
    // waiting for the server. The toast does wait — it says the lecture IS in the
    // list, and only the server can say that. A failure has its own red toast.
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(onClose, CLOSE_AFTER_ADD_MS);
    const result = await dispatch(addMediaToPlaylist(args));
    if (result.meta.requestStatus === "fulfilled") {
      dispatch(notify({ message: `השיעור נוסף לרשימה "${playlist.title}"`, severity: "success" }));
    }
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

  return {
    playlists,
    showsThisMedia,
    failed,
    loading,
    newTitle,
    setNewTitle,
    creating,
    setCreating,
    editing,
    setEditing,
    pendingDelete,
    setPendingDelete,
    toggle,
    handleCreate,
    handleRename,
    confirmDelete,
  };
};
