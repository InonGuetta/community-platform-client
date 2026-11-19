import { useState } from "react";
import { tileActions } from "./tileActions";

// The ⋯ menu of one tile: whether it is open, the download menu it hands over
// to (D-16 — the existing DownloadMenu, opened from the same ⋯ button), and
// each action wired to the page's handler.
//
// Every handler closes the menu first: the dialogs they open (edit, tags, the
// delete confirmation) belong to the page, and a menu left open behind a
// dialog would take the focus back when the dialog closes.
export const useMediaTileMenu = ({ item, user, showAdmin, onEditDetails, onEditTags, onTogglePublish, onDelete }) => {
  const [anchor, setAnchor] = useState(null);
  const [downloadAnchor, setDownloadAnchor] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const actions = tileActions({ user, item, showAdmin, onEditDetails, onEditTags, onTogglePublish, onDelete });

  const openMenu = (e) => setAnchor(e.currentTarget);
  const closeMenu = () => setAnchor(null);

  // The download menu opens where the ⋯ menu was, from the same button.
  const openDownload = () => {
    setDownloadAnchor(anchor);
    setAnchor(null);
  };
  const closeDownload = () => setDownloadAnchor(null);

  const editDetails = () => {
    closeMenu();
    onEditDetails(item);
  };
  const editTags = () => {
    closeMenu();
    onEditTags(item);
  };
  // Publishing is what puts a lesson in front of students; the page confirms
  // it with a toast (useArchivePageController.handleTogglePublish).
  const togglePublish = async () => {
    closeMenu();
    setPublishing(true);
    try {
      await onTogglePublish(item);
    } finally {
      setPublishing(false);
    }
  };
  // The page asks before anything is deleted (ConfirmingDeletionDialog).
  const requestDelete = () => {
    closeMenu();
    onDelete(item.id);
  };

  return {
    actions, anchor, open: Boolean(anchor), openMenu, closeMenu,
    downloadAnchor, openDownload, closeDownload,
    publishing, editDetails, editTags, togglePublish, requestDelete,
  };
};

export default useMediaTileMenu;
