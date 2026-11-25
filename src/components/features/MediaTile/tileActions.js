import { canManageMedia } from "../../../utilities/permissions";

// What the ⋯ menu on a tile offers (component 5; D-14, D-15).
//
// Download is everybody's, always — it was an icon on every card for every
// reader, and it stays theirs. Each management action needs all three of:
//   * permission — the same ownership rule the server enforces (canManageMedia);
//   * "תצוגת מנהל" on (showAdmin — a display preference, never a permission);
//   * a handler from the page. A shelf that passes none gets none: before this,
//     the personal pages showed publish and delete buttons that threw a
//     TypeError when pressed, because nothing had been handed to them.
//
// The order is the spec's: download · edit · tags · hide/show · — · delete.
export const tileActions = ({ user, item, showAdmin, onEditDetails, onEditTags, onTogglePublish, onDelete }) => {
  const manage = Boolean(showAdmin) && canManageMedia(user, item);
  return {
    download: true,
    edit: manage && typeof onEditDetails === "function",
    tags: manage && typeof onEditTags === "function",
    publish: manage && typeof onTogglePublish === "function",
    delete: manage && typeof onDelete === "function",
  };
};

/** Whether the draft / public badge is shown: managers, with the switch on. */
export const showsStatusBadge = ({ user, item, showAdmin }) => Boolean(showAdmin) && canManageMedia(user, item);
