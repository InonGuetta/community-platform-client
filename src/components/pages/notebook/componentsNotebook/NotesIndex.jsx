import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { alpha } from "@mui/material/styles";
import SectionCard from "../../../features/SectionCard/SectionCard";
import SearchBar from "../../../features/SearchBar/SearchBar";
import FilterChip from "../../../features/FilterChip/FilterChip";
import { RADIUS } from "../../../../theme/tokens";
import { dropIndicatorSx } from "../../../../utilities/useDragReorder";
import { statuses } from "../../../../utilities/constant";
import { noteHtmlToPlainText } from "../../../../utilities/noteHtml";
import { formatDate } from "../../../../utilities/formatDate";
import StatusBadge from "../../../features/StatusBadge/StatusBadge";
import { useTranslation } from "react-i18next";

// The index of the notebook: the search box, the tick-all bar with its bulk
// delete, and one row per note — a row scrolls to its card, is ticked for a
// bulk action, and is dragged (or moved with the arrow keys) to reorder.
// Layout only — every value and handler is useNotebookPageController's.

// The small tags under a row's date (not saved, the lecture): the tag chip of
// the design (component 5) at the row's meta size.
const META_CHIP_SX = { height: 20, fontSize: 11, fontWeight: 600, borderRadius: `${RADIUS.pill}px` };

const NotesIndex = ({
  activeNoteId,
  allVisibleSelected,
  drag,
  filtered,
  goToNote,
  isDirty,
  items,
  reorderHint,
  selectedCount,
  selectedIds,
  selectedNotes,
  selecting,
  startSelecting,
  cancelSelecting,
  setDeleteTargets,
  setSearch,
  someVisibleSelected,
  status,
  toggleAllVisible,
  toggleSelected,
}) => {
  const { t } = useTranslation(["notebook", "notes"]);
  return (
  <SectionCard>
    {/* Redesign v4 (screen 05): the search pill and, beside it, the chip that
        ticks every note on screen ("בחירה מרובה", or how many are ticked) —
        the tick-all box it replaces, with the same three states: none, some
        (aria-pressed="mixed") and all. Delete joins the row once something is
        ticked: a delete button that can only ever act on nothing is a trap. */}
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, flexWrap: "wrap" }}>
      <SearchBar
        onSearch={setSearch}
        placeholder={t("index.search")}
        label={t("index.searchLabel")}
        sx={{ flex: 1, minWidth: { xs: 0, sm: 160 } }}
      />
      {/* The tick boxes are drawn only while "בחירה מרובה" is on (UI_UX_FIXES
          4.5, over D-123). In the mode the same chip becomes "ביטול בחירה",
          and beside it come tick-all (the three states it always had), how
          many are ticked, and delete. */}
      {items.length > 0 && !selecting && (
        <FilterChip label={t("index.multiSelect")} onClick={startSelecting} />
      )}
      {items.length > 0 && selecting && (
        <>
          <FilterChip label={t("index.cancelSelect")} onClick={cancelSelecting} />
          <FilterChip
            label={t("index.selectAllShort")}
            selected={allVisibleSelected}
            aria-pressed={allVisibleSelected ? true : (someVisibleSelected ? "mixed" : false)}
            aria-label={t("index.selectAll")}
            onClick={toggleAllVisible}
          />
          {selectedCount > 0 && (
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: "text.secondary" }}>
              {t("index.selected", { count: selectedCount })}
            </Typography>
          )}
        </>
      )}
      {/* Only delete lives here. Export is in the page header beside "new
          note" — offering it in two places would be two things to keep in
          step for one action. */}
      {selecting && selectedCount > 0 && (
        <Tooltip title={t("index.deleteSelected")}>
          <IconButton
            color="error"
            onClick={() => setDeleteTargets(selectedNotes)}
            aria-label={t("index.deleteSelected")}
            sx={{ width: 36, height: 36, "&:hover": { bgcolor: "badge.error.bg" } }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>

    <Box>
    {status === statuses.loading && items.length === 0 ? (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}><CircularProgress size={28} /></Box>
    ) : filtered.length === 0 ? (
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 4 }}>
        {items.length === 0 ? t("noNotes") : t("noMatchingNotesShort")}
      </Typography>
    ) : (
      <List disablePadding sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {filtered.map((n) => {
          const isActive = n.id === activeNoteId;
          return (
            <ListItemButton
              key={n.id}
              onClick={() => goToNote(n.id)}
              // A row IS the note, so the whole row is the grip — there is
              // no separate handle to press and none to look at. The
              // cursor is the only affordance, which is the trade the
              // notebook's owner chose over a visible one.
              {...drag.itemProps(n.id)}
              // And the same reordering from the keyboard: focus a row,
              // press the arrow keys. Rows are focusable already, so this
              // costs nothing on screen — see useDragReorder.keyProps.
              {...drag.keyProps(n.id)}
              // Redesign v4: a row is a soft 16-radius tile that fills on
              // hover; the note the caret is in sits on the accent tint
              // inside a faint accent ring.
              sx={{
                alignItems: "flex-start", gap: 1,
                p: 2, borderRadius: `${RADIUS.menu}px`,
                cursor: reorderHint ? "pointer" : "grab",
                "&:active": { cursor: reorderHint ? "pointer" : "grabbing" },
                "&:hover": { bgcolor: "surface.fill2" },
                ...(isActive && {
                  bgcolor: "surface.accentSoft",
                  boxShadow: (theme) => `inset 0 0 0 1px ${alpha(theme.palette.primary.main, 0.3)}`,
                  "&:hover": { bgcolor: "surface.accentSoft" },
                }),
                opacity: drag.isDragging(n.id) ? 0.4 : 1,
                ...dropIndicatorSx(drag.markerFor(n.id)),
              }}
            >
              {/* Ticking a note is not opening it, so the box swallows the
                  click that would otherwise scroll the column away from
                  whatever the user was reading. */}
              {selecting && (
                <Checkbox
                  size="small"
                  checked={selectedIds.has(n.id)}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelected(n.id)}
                  inputProps={{ "aria-label": t("index.selectNote", { title: n.title?.trim() || t("notes:untitledBare") }) }}
                  sx={{ p: 0.5, mt: -0.5 }}
                />
              )}

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, flexGrow: 1 }}>
                <Typography noWrap sx={{ width: "100%", fontSize: 15, fontWeight: 700, lineHeight: 1.35 }}>
                  {n.title?.trim() || t("notes:untitled")}
                </Typography>
                <Typography noWrap sx={{ width: "100%", fontSize: 13, color: "surface.ink2" }}>
                  {/* The one line of preview is text, not markup — the row
                      is a single line and rendering the note's formatting
                      in it would only make the line taller. */}
                  {/* The server's preview (NOTE-17) — the list carries no bodies. */}
                  {(n.preview ?? noteHtmlToPlainText(n.body)).trim() || "—"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Typography sx={{ fontSize: 12, color: "text.secondary", flexShrink: 0 }}>{formatDate(n.updated_at)}</Typography>
                  {isDirty(n.id) && (
                    <StatusBadge size="small" tone="warning">{t("index.notSaved")}</StatusBadge>
                  )}
                  {n.media_title && (
                    <Chip size="small" label={n.media_title} sx={{ ...META_CHIP_SX, maxWidth: 150, bgcolor: "surface.accentSoft", color: "primary.main" }} />
                  )}
                </Box>
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    )}
    </Box>
  </SectionCard>
  );
};

export default NotesIndex;
