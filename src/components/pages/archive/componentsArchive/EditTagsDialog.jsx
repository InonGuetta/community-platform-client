import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TagPicker from "../../../features/TagPicker/TagPicker";

// Tagging an item that already exists.
//
// ── Why this had to be built ────────────────────────────────────────────────
//
// Tags could only ever be set while uploading. The server has always accepted
// them on PUT /media/update/:id — the client simply never called it with any,
// because the only update the archive ever sent was the publish toggle. So an
// item uploaded before the taxonomy existed, or uploaded in a hurry, could never
// be tagged at all.
//
// The effect of that was not subtle: the archive held nineteen items and the
// media_tags table held zero rows. Every tag in the filter matched nothing,
// every count read 0, and the entire filter — drill-down, exclusions, the lot —
// was a control over an empty set. A filter is only ever as good as the tagging,
// and there was no way to do the tagging.
//
// ── Tags alone, not an edit form ────────────────────────────────────────────
//
// Deliberately narrow. A general "edit item" dialog is a bigger question — which
// fields a lecturer may change after publication, what happens to a title
// somebody has already linked to — and answering it is not a prerequisite for
// making the archive searchable. This does the one thing that is blocking.
//
// ── Ids, not names ──────────────────────────────────────────────────────────
//
// The current tags are restored from `tag_ids`, not from the names the card
// shows. Five names in this taxonomy occur in two branches, so re-saving a
// name-matched tag would file the item under whichever branch was found first —
// silently moving it in the tree it is filtered by.

// An empty list that is the SAME empty list every render.
//
// `({ suggestions = [] })` looks harmless and is not: a default parameter builds
// a fresh array each time the component renders, so an effect that depends on it
// sees a new value every render, sets state, and renders again — forever, and
// synchronously, which freezes the tab rather than erroring. It only happens
// when the prop is omitted, which is exactly the case nobody clicks through by
// hand.
const EMPTY = [];

const EditTagsDialog = ({ open, item, tagTree = EMPTY, onClose, onSave }) => {
  const [chosen, setChosen] = useState([]);
  const [saving, setSaving] = useState(false);

  // Re-seeded whenever a different item is opened. Without the id in the
  // dependencies the dialog would keep the first item's tags for the second,
  // which is the kind of bug that ends with somebody's tags on the wrong shiur.
  useEffect(() => {
    if (!open || !item) return;
    const byId = new Map(tagTree.map((node) => [node.id, node]));
    const known = (item.tag_ids || []).map((id) => byId.get(id)).filter(Boolean);
    // Tags typed rather than picked live at the root and have ids like any
    // other, so anything left over is a tag the tree no longer holds — dropped
    // here rather than re-saved by accident.
    setChosen(known);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, item?.tag_ids?.join(","), tagTree]);

  if (!item) return null;

  const handleSave = async () => {
    setSaving(true);
    // Two lists, because the server takes them differently: a pick from the
    // taxonomy is an id, and anything typed is a name that becomes a new
    // root-level tag.
    await onSave(item.id, {
      tagIds: chosen.filter((tag) => typeof tag !== "string").map((tag) => tag.id),
      tags: chosen.filter((tag) => typeof tag === "string"),
    });
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ textAlign: "right" }}>תגיות — {item.title}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          התגיות קובעות איפה הפריט יימצא בסינון ובחיפוש.
        </Typography>
        <TagPicker nodes={tagTree} value={chosen} onChange={setChosen} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>ביטול</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          שמירה
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditTagsDialog;
