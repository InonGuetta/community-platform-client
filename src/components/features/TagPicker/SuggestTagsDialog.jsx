import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import AddIcon from "@mui/icons-material/Add";
import TagPicker from "./TagPicker";

// The moment after an upload, when the archive asks what the item is about.
//
// ── Why here and not on the form ────────────────────────────────────────────
//
// Tagging was optional on the upload form and nothing asked twice, so items
// arrived untagged and stayed that way — nineteen items and not one tagged row,
// which made every filter in the application a control over an empty set.
// Making the field mandatory was tried and taken back out: somebody uploading a
// shiur they have just recorded does not always know where it belongs, and a
// form that will not submit is a form they abandon.
//
// So the question is asked at the one moment it costs nothing: the file is
// already stored, the upload has already succeeded, and skipping is a button
// rather than a dead end.
//
// ── Why the suggestions carry their reason ──────────────────────────────────
//
// They are guesses from a title, and some of them are wrong — the rule offers
// "חיזוק כללי" for a shiur about AI because the word "התמודדות" is in the
// title. A suggestion whose reason is visible gets rejected in one click by
// somebody who can see why it was made; a bare list of chips gets accepted
// wholesale, which is how an archive fills with confident nonsense.

// An empty list that is the SAME empty list every render.
//
// `({ suggestions = [] })` looks harmless and is not: a default parameter builds
// a fresh array each time the component renders, so an effect that depends on it
// sees a new value every render, sets state, and renders again — forever, and
// synchronously, which freezes the tab rather than erroring. It only happens
// when the prop is omitted, which is exactly the case nobody clicks through by
// hand.
const EMPTY = [];

const SuggestTagsDialog = ({
  open,
  item,
  suggestions = EMPTY,
  nodes = EMPTY,
  saving = false,
  onSkip,
  onSave,
}) => {
  const [chosen, setChosen] = useState([]);

  // Seeded from the suggestions each time the dialog opens on a new item — every
  // one pre-accepted, because the common case is that they are right and the
  // work should be un-ticking rather than ticking.
  // Keyed on the CONTENT of the suggestions rather than the array holding them:
  // a parent that rebuilds the list on each render is ordinary React, and this
  // effect sets state, so identity in the dependencies is the same loop by
  // another route.
  const suggestedKey = suggestions.map((s) => s.id).join(",");
  useEffect(() => {
    if (!open) return;
    const byId = new Map(nodes.map((node) => [node.id, node]));
    setChosen(suggestions.map((s) => byId.get(s.id)).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id, suggestedKey, nodes]);

  if (!item) return null;

  const isChosen = (id) => chosen.some((tag) => typeof tag !== "string" && tag.id === id);
  const toggle = (suggestion) => {
    const byId = new Map(nodes.map((node) => [node.id, node]));
    setChosen((prev) =>
      isChosen(suggestion.id)
        ? prev.filter((tag) => typeof tag === "string" || tag.id !== suggestion.id)
        : [...prev, byId.get(suggestion.id)].filter(Boolean)
    );
  };

  const handleSave = () =>
    // The two lists the server takes: a pick from the taxonomy is an id, and
    // anything typed is a name that becomes a new root-level tag.
    onSave(item.id, {
      tagIds: chosen.filter((tag) => typeof tag !== "string").map((tag) => tag.id),
      tags: chosen.filter((tag) => typeof tag === "string"),
    });

  return (
    <Dialog open={open} onClose={onSkip} fullWidth maxWidth="sm">
      <DialogTitle sx={{ textAlign: "right" }}>על מה השיעור?</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
          «{item.title}» הועלה בהצלחה. התגיות קובעות איפה הוא יימצא בסינון ובחיפוש.
        </Typography>

        {suggestions.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block", mb: 1 }}>
              הצעות לפי הכותרת — לחיצה מוסיפה או מסירה:
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {suggestions.map((suggestion) => (
                <Box key={suggestion.id} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    size="small"
                    color={isChosen(suggestion.id) ? "primary" : "default"}
                    variant={isChosen(suggestion.id) ? "filled" : "outlined"}
                    icon={isChosen(suggestion.id) ? <CheckIcon /> : <AddIcon />}
                    onClick={() => toggle(suggestion)}
                    aria-pressed={isChosen(suggestion.id)}
                    // Named as a SUGGESTION, because the same tag also appears
                    // just below as a chip in the picker: without this the two
                    // are announced identically, and neither the reader nor the
                    // test can tell which one it is on.
                    aria-label={`הצעה: ${suggestion.name}${suggestion.path ? ` (${suggestion.path})` : ""}`}
                    label={
                      <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5 }}>
                        {suggestion.path && (
                          <Box component="span" sx={{ opacity: 0.7, fontSize: "0.7rem" }}>
                            {suggestion.path} ←
                          </Box>
                        )}
                        <Box component="span" sx={{ fontWeight: 700 }}>{suggestion.name}</Box>
                      </Box>
                    }
                  />
                  {/* The reason, in the open. These are guesses from a title, and
                      one that cannot be checked is one nobody should accept. */}
                  <Typography variant="caption" color="text.secondary">
                    {suggestion.reason}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <TagPicker
          nodes={nodes}
          value={chosen}
          onChange={setChosen}
          label={suggestions.length > 0 ? "התגיות שיישמרו" : "תגיות"}
          helperText={
            suggestions.length > 0
              ? "אפשר להוסיף או להסיר כאן כל תגית, גם כזו שלא הוצעה."
              : "לא נמצאה הצעה מהכותרת — אפשר לבחור ידנית."
          }
        />
      </DialogContent>
      <DialogActions>
        {/* Skipping is a real answer, not a failure: the item is already stored,
            and it can be tagged later from its card in the archive. */}
        <Button onClick={onSkip} disabled={saving}>דלג</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          שמירת התגיות
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SuggestTagsDialog;
