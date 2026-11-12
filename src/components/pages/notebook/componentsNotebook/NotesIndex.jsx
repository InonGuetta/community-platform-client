import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import { dropIndicatorSx } from "../../../../utilities/useDragReorder";
import { statuses, listRowSx } from "../../../../utilities/constant";
import { noteHtmlToPlainText } from "../../../../utilities/noteHtml";
import { formatHebrewDate } from "../../../../utilities/formatDate";

// The index of the notebook: the search box, the tick-all bar with its bulk
// delete, and one row per note — a row scrolls to its card, is ticked for a
// bulk action, and is dragged (or moved with the arrow keys) to reorder.
// Layout only — every value and handler is useNotebookPageController's.
const NotesIndex = ({
  activeNoteId,
  allVisibleSelected,
  drag,
  filtered,
  goToNote,
  isDirty,
  items,
  reorderHint,
  search,
  selectedCount,
  selectedIds,
  selectedNotes,
  setDeleteTargets,
  setSearch,
  someVisibleSelected,
  status,
  toggleAllVisible,
  toggleSelected,
}) => (
  <>
    <TextField
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      size="small"
      fullWidth
      placeholder="חיפוש במחברת..."
      inputProps={{ "aria-label": "חיפוש במחברת" }}
      InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>) }}
    />

    {/* The bulk bar. Always present so the tick-all box has a fixed home,
        but the actions only appear once something is ticked — a delete
        button that can only ever act on nothing is just a trap. */}
    {items.length > 0 && (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minHeight: 34 }}>
        <Checkbox
          size="small"
          checked={allVisibleSelected}
          indeterminate={someVisibleSelected && !allVisibleSelected}
          onChange={toggleAllVisible}
          inputProps={{ "aria-label": "בחירת כל ההערות המוצגות" }}
          sx={{ p: 0.5 }}
        />
        <Typography variant="caption" color="text.secondary">
          {selectedCount > 0 ? `${selectedCount} נבחרו` : "בחירה מרובה"}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* Only delete lives here. Export moved up beside "new note" —
            see the header — and offering it in two places would be two
            things to keep in step for one action. */}
        {selectedCount > 0 && (
          <Tooltip title="מחיקת הנבחרות">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteTargets(selectedNotes)}
              aria-label="מחיקת הנבחרות"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    )}

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
              sx={{
                alignItems: "flex-start", gap: 1,
                borderRadius: 2, mb: 1,
                cursor: reorderHint ? "pointer" : "grab",
                "&:active": { cursor: reorderHint ? "pointer" : "grabbing" },
                ...listRowSx,
                ...(isActive && {
                  bgcolor: "primary.light",
                  color: "primary.contrastText",
                  "&:hover": { bgcolor: "primary.main" },
                }),
                opacity: drag.isDragging(n.id) ? 0.4 : 1,
                ...dropIndicatorSx(drag.markerFor(n.id)),
              }}
            >
              {/* Ticking a note is not opening it, so the box swallows the
                  click that would otherwise scroll the column away from
                  whatever the user was reading. */}
              <Checkbox
                size="small"
                checked={selectedIds.has(n.id)}
                onClick={(e) => e.stopPropagation()}
                onChange={() => toggleSelected(n.id)}
                inputProps={{ "aria-label": `בחירת ההערה ${n.title?.trim() || "ללא כותרת"}` }}
                sx={{ p: 0.5, mt: -0.25, color: "inherit" }}
              />

              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, minWidth: 0, flexGrow: 1 }}>
                <Typography fontWeight={700} noWrap sx={{ width: "100%" }}>
                  {n.title?.trim() || "(ללא כותרת)"}
                </Typography>
                <Typography variant="body2" noWrap sx={{ width: "100%", opacity: 0.8 }}>
                  {/* The one line of preview is text, not markup — the row
                      is a single line and rendering the note's formatting
                      in it would only make the line taller. */}
                  {/* The server's preview (NOTE-17) — the list carries no bodies. */}
                  {(n.preview ?? noteHtmlToPlainText(n.body)).trim() || "—"}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>{formatHebrewDate(n.updated_at)}</Typography>
                  {isDirty(n.id) && (
                    <Chip size="small" color="warning" label="לא נשמר" sx={{ height: 18, fontSize: "0.65rem" }} />
                  )}
                  {n.media_title && (
                    <Chip size="small" label={n.media_title} sx={{ height: 18, fontSize: "0.65rem", maxWidth: 150 }} />
                  )}
                </Box>
              </Box>
            </ListItemButton>
          );
        })}
      </List>
    )}
    </Box>
  </>
);

export default NotesIndex;
