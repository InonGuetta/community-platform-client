import { useEffect, useMemo, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import TagParentPicker from "./TagParentPicker";
import { pathOf } from "./tagOptions";
import { buildTagRelations } from "../../../utilities/tagStates";
import { useTranslation } from "react-i18next";

// A tag that does not exist yet: its name, and where in the tree it goes.
//
// Used twice with the same shape — a lecturer proposing one, and an admin
// correcting a proposal before approving it — so the name, the place and the
// checks below cannot differ between the person asking and the person deciding.
//
// ── The two checks made here, before the server ─────────────────────────────
//
// The same name under the same parent is refused by the server (TAG_EXISTS);
// saying so while typing saves a round trip and a dead end. The same name
// ELSEWHERE is allowed — five names already legitimately occur twice — but is
// worth showing: most of the time it is the tag the person was looking for,
// under a heading they did not think to open.

// Matches TAG_MAX in the server's servicesTags.js and VARCHAR(60) in 024.
const TAG_MAX = 60;

const normalise = (value) => value.trim().replace(/\s+/g, " ");

const ProposeTagDialog = ({
  open,
  nodes,
  // Absent, the shared words (tags:propose.*).
  title,
  submitLabel,
  note,
  initialName = "",
  initialParentId = null,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation(["tags", "common"]);
  const [name, setName] = useState(initialName);
  const [parentId, setParentId] = useState(initialParentId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset on every opening: a half-typed name from a dialog that was cancelled
  // must not reappear on the next item.
  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setParentId(initialParentId);
    setError(null);
  }, [open, initialName, initialParentId]);

  const relations = useMemo(() => buildTagRelations(nodes), [nodes]);
  const clean = normalise(name);
  const key = clean.toLowerCase();

  const siblings = relations.childrenOf(parentId ?? "root");
  const existsHere = Boolean(clean) && siblings.some((node) => node.name.toLowerCase() === key);
  const elsewhere = clean
    ? nodes.filter((node) => node.name.toLowerCase() === key && (node.parent_id ?? null) !== parentId)
    : [];

  const place = pathOf(relations, parentId);
  const tooLong = clean.length > TAG_MAX;
  const canSubmit = Boolean(clean) && !existsHere && !tooLong && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ name: clean, parentId });
    } catch (err) {
      // The caller turns the rejection into Hebrew; anything it could not name
      // still gets a sentence rather than nothing.
      setError(err?.userMessage || t("propose.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ textAlign: "start" }}>{title ?? t("propose.title")}</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <TextField
          autoFocus
          fullWidth
          size="small"
          label={t("propose.name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          error={existsHere || tooLong}
          helperText={
            tooLong
              ? t("propose.maxLength", { n: TAG_MAX })
              : existsHere
                ? t("propose.existsHere")
                : " "
          }
          sx={{ mt: 1 }}
        />

        {elsewhere.length > 0 && !existsHere && (
          <Alert severity="info" sx={{ mb: 1.5 }}>
            {t("propose.existsElsewhere", { places: elsewhere.map((node) => pathOf(relations, node.parent_id).join(" ← ") || t("root")).join(" · ") })}
          </Alert>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
          {t("propose.whichParent")}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
          {t("propose.parentHint")}
        </Typography>
        <TagParentPicker nodes={nodes} value={parentId} onChange={setParentId} />

        {/* Spelled out, because the breadcrumbs are a place and this is a
            decision: exactly what will be created, and where. */}
        <Box
          sx={{ mt: 2, p: 1.5, borderRadius: 1, bgcolor: "action.hover" }}
          aria-live="polite"
          data-testid="tag-placement"
        >
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
            {t("propose.placement")}
          </Typography>
          <Typography variant="body2">
            {place.length > 0 ? `${place.join(" ← ")} ← ` : t("propose.topLevelPrefix")}
            <Box component="strong">{clean || "…"}</Box>
          </Typography>
        </Box>

        {(note ?? t("propose.note")) && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            {note ?? t("propose.note")}
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          {t("common:actions.cancel")}
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={!canSubmit}>
          {submitLabel ?? t("propose.submit")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProposeTagDialog;
