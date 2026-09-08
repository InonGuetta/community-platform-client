import { useMemo } from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import BlockIcon from "@mui/icons-material/Block";
import CancelIcon from "@mui/icons-material/Cancel";
import { buildTagRelations, countUnder } from "./tagStates";

// The tags currently being filtered by, all of them, in one row.
//
// It exists because the drill-down can only ever show ONE level at a time. Choose
// "וירא" under Bereshit, walk back up and into מוסר, choose another — and the
// first choice is now three screens away with nothing on screen to say it is
// still narrowing the results. This is the answer to "what am I actually
// filtering by", which the panel could not otherwise give without being
// abandoned as a navigation and rebuilt as a list.
//
// Each chip carries its PATH, not just its name, and that is not decoration:
// five names in this taxonomy occur in two branches, so "שופטים" alone does not
// say which one is selected — and the two are genuinely different filters.
//
// ── Two rows, because there are two directions ──────────────────────────────
//
// A tag taken OUT of the filter narrows the archive exactly as much as one put
// in, and an exclusion visible only three levels down inside the drill-down is a
// hidden filter — the failure the count on the filter button exists to prevent.
// It gets its own line rather than a differently-coloured chip in the same one,
// because "מסונן לפי: תורה, שמות" would read as two choices when the second is
// the opposite of one.
//
// ── The number on each chip ────────────────────────────────────────────────
//
// Choosing תורה is one click and fifty-four tags, and the filter used to say
// "1". The count says what the choice actually reaches — and on a branch with an
// exclusion inside it, what it reaches AFTER the hole, which is the number a
// person would otherwise have to work out from two rows of chips.

const SelectedTags = ({ nodes = [], selectedIds = [], excludedIds = [], onRemove, onClear }) => {
  const { chosen, removed } = useMemo(() => {
    const relations = buildTagRelations(nodes);
    const selection = { includedIds: selectedIds, excludedIds };

    // The path down to a node, and the number of tags its decision accounts for.
    // Unknown ids are dropped: a tag deleted from the vocabulary while it sat in
    // somebody's filter has no name to show, and a chip reading "undefined" is
    // worse than one chip fewer. Clearing it out of the filter itself is the
    // normalisation step's job, not this row's.
    const describe = (id, decision) => {
      const node = relations.byId.get(id);
      if (!node) return null;
      const path = relations
        .ancestorsOf(id)
        .map((ancestorId) => relations.byId.get(ancestorId)?.name)
        .filter(Boolean)
        .join(" ← ");
      return { ...node, path, count: countUnder(relations, selection, id, decision) };
    };

    return {
      chosen: selectedIds.map((id) => describe(id, "included")).filter(Boolean),
      removed: excludedIds.map((id) => describe(id, "excluded")).filter(Boolean),
    };
  }, [nodes, selectedIds, excludedIds]);

  // Nothing chosen is not an empty row — it is no row. A permanently reserved
  // strip of whitespace above the drill-down would push it down for no reason on
  // the ordinary case, which is nothing selected.
  if (chosen.length === 0 && removed.length === 0) return null;

  const chipFor = (node, { out }) => (
    <Chip
      key={node.id}
      size="small"
      color={out ? "error" : "primary"}
      // Announced as what it is, in the direction it points. Two chips that mean
      // opposite things were read out as the same bare tag name, distinguished
      // only by a colour and the row they happened to be on.
      aria-label={[
        out ? "הוצא מהסינון" : "מסונן לפי",
        node.path ? `${node.path} ←` : "",
        node.name,
        node.count > 1 ? `${node.count} תגיות` : "",
      ]
        .filter(Boolean)
        .join(" ")}
      // Deleting from HERE is the reliable way out. Un-choosing from the
      // drill-down means navigating back to wherever the tag was, which for
      // a four-level tree is the whole reason people give up and reload.
      onDelete={() => onRemove(node.id)}
      // Without this the × is announced as "cancel", which says what the icon is
      // rather than what it does to which tag.
      deleteIcon={<CancelIcon titleAccess={`הסרת ${node.name} מהסינון`} />}
      label={
        <Box component="span" sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5 }}>
          {out && <BlockIcon sx={{ fontSize: 13, alignSelf: "center" }} />}
          {node.path && (
            <Box component="span" sx={{ opacity: 0.7, fontSize: "0.7rem" }}>
              {node.path} ←
            </Box>
          )}
          <Box component="span" sx={{ fontWeight: 700 }}>{node.name}</Box>
          {/* Only where it says something the name does not: a leaf accounts for
              itself, and "(1)" beside every parasha is noise. */}
          {node.count > 1 && (
            <Box component="span" sx={{ opacity: 0.75, fontSize: "0.7rem" }}>
              ({node.count} תגיות)
            </Box>
          )}
        </Box>
      }
      sx={{ maxWidth: "100%", "& .MuiChip-label": { overflow: "hidden", textOverflow: "ellipsis" } }}
    />
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, width: "100%" }}>
      {chosen.length > 0 && (
        <Box
          role="group"
          aria-label="תגיות שנבחרו לסינון"
          sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}
        >
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            מסונן לפי:
          </Typography>
          {chosen.map((node) => chipFor(node, { out: false }))}
        </Box>
      )}

      {removed.length > 0 && (
        <Box
          role="group"
          aria-label="תגיות שהוצאו מהסינון"
          sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.75 }}
        >
          <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
            ללא:
          </Typography>
          {removed.map((node) => chipFor(node, { out: true }))}
        </Box>
      )}

      {/* Only from two upwards: with one chip its own × already does this, and a
          second control beside it would be two ways to do one thing. */}
      {chosen.length + removed.length > 1 && (
        <Box>
          <Chip size="small" variant="outlined" label="ניקוי התגיות" onClick={onClear} />
        </Box>
      )}
    </Box>
  );
};

export default SelectedTags;
