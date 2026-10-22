import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteIcon from "@mui/icons-material/Delete";
import IosShareIcon from "@mui/icons-material/IosShare";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { iconForBookmark } from "../../../utilities/mediaIcons";
import NoteAltOutlinedIcon from "@mui/icons-material/NoteAltOutlined";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import SourcePreviewDialog from "./componentsNotebook/SourcePreviewDialog";
import NoteToolbar from "./componentsNotebook/NoteToolbar";
import NoteCard from "./componentsNotebook/NoteCard";
import ExportSplitDialog from "./componentsNotebook/ExportSplitDialog";
import ExportSourcesDialog from "./componentsNotebook/ExportSourcesDialog";
import UntitledNoteDialog from "./componentsNotebook/UntitledNoteDialog";
import { useNotebookPageController } from "./useNotebookPageController";
import { dropIndicatorSx } from "./componentsNotebook/useDragReorder";
import { statuses, mediaTypeLabels, mediaTypeAccents, listRowSx } from "../../../utilities/constant";
import { noteHtmlToPlainText } from "../../../utilities/noteHtml";
import { BOOKMARK_DRAG_MIME, bookmarkDragPayload } from "../../../utilities/noteSource";
import { placeShortLabel, bookmarkLines } from "../../../utilities/bookmarks";

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : "";

// The sticky navbar's height, which this page's own height is measured against.
const NAVBAR_HEIGHT = 64;

// Layout only. What the page does lives in useNotebookPageController.
const NotebookPage = () => {
  const {
    activeNoteId,
    allVisibleSelected,
    askSources,
    bookmarkGroups,
    bookmarks,
    bookmarksStatus,
    cardNodes,
    closeCurrentSource,
    confirmTitle,
    deleteTargets,
    draftFor,
    drag,
    editorApis,
    exportAnchor,
    exporting,
    filtered,
    formats,
    goToNote,
    handleCreate,
    handleDeleteConfirm,
    isDirty,
    items,
    notesToExport,
    openSource,
    pendingExport,
    renameSource,
    reorderHint,
    reportEditorWarning,
    requestSave,
    runExport,
    search,
    selectedCount,
    selectedIds,
    selectedNotes,
    setActiveNoteId,
    setDeleteTargets,
    setDrafts,
    setExportAnchor,
    setFormats,
    setPendingExport,
    setSearch,
    setSourceIndex,
    setSourceTrail,
    setSplitOpen,
    setTitlePrompt,
    someVisibleSelected,
    source,
    sourceBookmarks,
    sourceIndex,
    sourceStyle,
    sourceTrail,
    splitOpen,
    status,
    titlePrompt,
    toggleAllVisible,
    toggleSelected,
  } = useNotebookPageController();

  return (
    <Box
      sx={{
        display: "flex", flexDirection: "column", gap: 2, p: 3,
        bgcolor: "background.default",
        minHeight: `calc(100vh - ${NAVBAR_HEIGHT}px)`,
        // From md up the PAGE does not scroll — the column of notes does. That
        // is what keeps the formatting strip and the notes list in place while
        // the user moves down a long notebook, without either of them having to
        // be positioned by hand against a header of a height nobody can predict
        // once it starts wrapping. Below md the two stack and the page scrolls
        // normally, where a pinned strip would eat most of a phone's screen.
        height: { md: `calc(100vh - ${NAVBAR_HEIGHT}px)` },
        overflow: { md: "hidden" },
      }}
    >
      {/* Header — title, the formatting strip, and the one action that makes a
          new note. The toolbar sits BETWEEN them, filling the space the header
          had going spare, and wraps under the title on a narrow screen rather
          than squeezing the two ends together. */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap", flexShrink: 0 }}>
        <Typography variant="h4" fontWeight={800} color="primary">המחברת שלי</Typography>

        <Box sx={{ flexGrow: 1, display: "flex", justifyContent: "center", minWidth: 300 }}>
          <NoteToolbar
            onCommand={(command, value) => editorApis.current.get(activeNoteId)?.exec(command, value)}
            // A pixel size is not an execCommand — see RichNoteEditor.setFontSize
            // — so it has its own way in rather than a fake command name.
            onFontSize={(px) => editorApis.current.get(activeNoteId)?.setFontSize(px)}
            formats={formats}
            // Nothing to format until the caret is in one of the cards. The
            // strip stays in place and fades, so the header does not change
            // shape as the user moves between notes.
            disabled={!activeNoteId}
          />
        </Box>

        {/* Export sits next to "new note" rather than down in the list with the
            tick boxes: it acts on the notebook, like the button beside it, and
            the two formats are a choice worth showing by name. */}
        <Tooltip title={selectedCount > 0 ? `ייצוא ${selectedCount} ההערות שנבחרו` : "ייצוא כל ההערות המוצגות"}>
          <span>
            <Button
              variant="outlined"
              startIcon={exporting ? <CircularProgress size={18} /> : <IosShareIcon />}
              onClick={(e) => setExportAnchor(e.currentTarget)}
              disabled={exporting || notesToExport.length === 0}
              aria-haspopup="menu"
              sx={{ borderRadius: 2, fontWeight: 700, px: 2.5 }}
            >
              ייצוא
            </Button>
          </span>
        </Tooltip>

        <Menu anchorEl={exportAnchor} open={Boolean(exportAnchor)} onClose={() => setExportAnchor(null)}>
          {/* Named so the user knows what is about to be written before it is
              written — the count, and which of the two documents it will be. */}
          <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: "block" }}>
            {selectedCount > 0 ? `${selectedCount} הערות שנבחרו` : `כל ההערות המוצגות (${notesToExport.length})`}
          </Typography>

          {/* Three rows and nothing else. What happens to the SOURCES is asked
              after one of them is pressed — see ExportSourcesDialog — because
              it is a decision with three real answers rather than a setting to
              read past on the way to the button everybody came for. */}
          <MenuItem onClick={() => askSources({ format: "pdf" })} sx={{ textAlign: "start" }}>
            <ListItemIcon><PictureAsPdfOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="ייצוא ל-PDF" secondary="טקסט בלבד, ללא עיצוב ותמונות" />
          </MenuItem>
          <MenuItem onClick={() => askSources({ format: "word" })} sx={{ textAlign: "start" }}>
            <ListItemIcon><DescriptionOutlinedIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="ייצוא ל-Word" secondary="עם העיצוב והתמונות" />
          </MenuItem>

          {/* Offered only when there is something to divide. An array rather
              than a fragment: MUI walks a Menu's children to drive keyboard
              navigation, and a fragment hides them from it. */}
          {notesToExport.length >= 2 && [
            <Divider key="split-divider" />,
            <MenuItem key="split" onClick={() => { setExportAnchor(null); setSplitOpen(true); }} sx={{ textAlign: "start" }}>
              <ListItemIcon><CallSplitIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="פיצול למספר מחברות…" secondary="לבחור כמה קבצים, ומה נכנס לכל אחד" />
            </MenuItem>,
          ]}
        </Menu>

        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}
          sx={{
            background: "linear-gradient(135deg, #29b6d8 0%, #1597bb 100%)",
            "&:hover": { background: "linear-gradient(135deg, #1ea7ca 0%, #128aab 100%)" },
            borderRadius: 2, fontWeight: 700, px: 3, boxShadow: "0 3px 10px rgba(21,151,187,0.35)",
          }}
        >
          הערה חדשה
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 3, flexGrow: 1, minHeight: 0, flexDirection: { xs: "column", md: "row" } }}>
        {/* List column — an index of the notebook rather than a chooser: every
            note is already open in the column beside it, so a row here scrolls
            to its card. It is also where notes are ticked for a bulk action. */}
        <Paper elevation={0} sx={{ width: { xs: "100%", md: 340 }, flexShrink: 0, height: { md: "100%" }, minHeight: 0, p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <TextField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            fullWidth
            placeholder="חיפוש במחברת..."
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
                        {noteHtmlToPlainText(n.body).trim() || "—"}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                        <Typography variant="caption" sx={{ opacity: 0.7 }}>{formatDate(n.updated_at)}</Typography>
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

          {/* Every bookmark the user has left across the platform, so the
              notebook is one place for both kinds of personal marking. */}
          <Divider />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, maxHeight: "45%", minHeight: 120 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BookmarkIcon fontSize="small" color="primary" sx={{ flexShrink: 0 }} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ flexShrink: 0 }}>הסימניות שלי</Typography>
              {bookmarks.length > 0 && (
                <Chip size="small" label={bookmarks.length} sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }} />
              )}
              {/* The one thing about this list that is not visible from looking
                  at it. Shown next to the count rather than as a tooltip on the
                  rows, because a feature nobody hovers over is a feature nobody
                  finds — and it is the ONLY thing here allowed to be squeezed
                  out, because the heading and the count are what the panel is. */}
              {bookmarks.length > 0 && (
                <Typography variant="caption" color="text.secondary" noWrap sx={{ ml: "auto", minWidth: 0 }}>
                  גרור אל תוך הערה ↩
                </Typography>
              )}
            </Box>

            {bookmarksStatus === statuses.loading && bookmarks.length === 0 ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={22} /></Box>
            ) : bookmarkGroups.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 3 }}>
                {bookmarks.length === 0
                  ? "עדיין אין סימניות. סמן נקודות בשיעורים והן יופיעו כאן."
                  : "לא נמצאו סימניות תואמות."}
              </Typography>
            ) : (
              <Box sx={{ overflowY: "auto" }}>
                {bookmarkGroups.map((group) => (
                  <Box key={group.mediaId} sx={{ mb: 1.5 }}>
                    {/* "וידאו | כותרת השיעור", on the same accent the archive
                        card uses for that type, so a bookmark is recognisable
                        as video / audio / text at a glance. */}
                    <Box
                      sx={{
                        display: "flex", alignItems: "center", gap: 0.75,
                        px: 1, py: 0.5, mb: 0.5, borderRadius: 1.5,
                        bgcolor: mediaTypeAccents[group.mediaType] || "grey.600",
                        color: "#fff",
                      }}
                      title={group.mediaTitle}
                    >
                      <Typography variant="caption" fontWeight={800} sx={{ flexShrink: 0 }}>
                        {mediaTypeLabels[group.mediaType] || "שיעור"}
                      </Typography>
                      <Box sx={{ width: "1px", alignSelf: "stretch", bgcolor: "rgba(255,255,255,0.55)", flexShrink: 0 }} />
                      {/* Wrapped rather than cut off. A lecture's real name is
                          longer than this column is wide, and an ellipsis in
                          the heading that says WHICH lecture these bookmarks
                          belong to defeats the grouping. overflowWrap covers
                          the case wrapping alone cannot: a title with no spaces
                          in it, which would otherwise push the coloured bar out
                          past the edge of the panel. */}
                      <Typography variant="caption" fontWeight={700} sx={{ minWidth: 0, lineHeight: 1.3, overflowWrap: "anywhere" }}>
                        {group.mediaTitle}
                      </Typography>
                    </Box>
                    <List dense disablePadding>
                      {group.items.map((bm) => (
                        <ListItemButton
                          key={bm.id}
                          onClick={() => openSource({
                            mediaId: group.mediaId,
                            timestampSeconds: bm.timestamp_seconds,
                            // The book half. Without it the window opened the
                            // sefer at its first paragraph — second zero of a
                            // thing with no seconds — however far in the
                            // bookmark actually pointed.
                            chunkId: bm.chunk_id ?? null,
                            // The third kind's half of the anchor. Without it two
                            // marks on different pages of one sefer are one entry
                            // in the trail, and the window opens on whichever was
                            // looked at last.
                            pageNumber: bm.page_number ?? null,
                            mediaTitle: group.mediaTitle,
                            // The note alone. What the OCR made of the page is
                            // not something to print in a window header — see
                            // bookmarkLines in utilities/bookmarks.js.
                            noteText: bm.note,
                          })}
                          // Dragged into a note, where it becomes a source chip
                          // — an inline reference that reopens the lecture at
                          // this second. The payload is the bookmark, not the
                          // markup: what a chip is made of belongs to
                          // utilities/noteSource.js, and the sidebar should not
                          // have to know.
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData(
                              BOOKMARK_DRAG_MIME,
                              JSON.stringify(bookmarkDragPayload(bm, group.mediaTitle))
                            );
                            event.dataTransfer.effectAllowed = "copy";
                          }}
                          sx={{
                            display: "flex", alignItems: "center", gap: 1,
                            borderRadius: 2, mb: 0.5,
                            cursor: "grab",
                            "&:active": { cursor: "grabbing" },
                            ...listRowSx,
                          }}
                        >
                          {/* A book does not play, and a filmed shiur is not a
                              recorded one. Same size and colour, so the list
                              still reads as one list — see utilities/mediaIcons. */}
                          {(() => {
                            const Icon = iconForBookmark(bm);
                            return <Icon fontSize="small" sx={{ color: "primary.main", flexShrink: 0 }} />;
                          })()}
                          {/* One line per bookmark keeps the list scannable,
                              but the full text is a hover away — the row is
                              also what gets dragged into a note, so knowing
                              which one it is matters. */}
                          {/* The place stands in when nothing was written. It
                              used to be the marked words, which in this archive
                              are the OCR's reading of a photographed page and
                              are frequently wrong — see bookmarkLines. */}
                          <Typography
                            variant="body2"
                            noWrap
                            title={bookmarkLines(bm).title}
                            sx={{ flexGrow: 1, minWidth: 0 }}
                          >
                            {bookmarkLines(bm).title}
                          </Typography>
                          <Chip
                            size="small"
                            // formatTime(null) is "0:00", so every bookmark in
                            // every sefer wore a timestamp it does not have.
                            label={placeShortLabel(bm)}
                            sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Paper>

        {/* The notes themselves — every one of them, in the list's order, as a
            scrolling column. This is the pane that moves; everything else on the
            page stays where it is. */}
        <Box
          sx={{
            flexGrow: 1, minWidth: 0, minHeight: 0,
            display: "flex", flexDirection: "column", gap: 2,
            overflowY: { md: "auto" },
            // Room for the scrollbar so it does not sit on the cards' edge.
            pl: { md: 1 },
          }}
        >
          {status === statuses.loading && items.length === 0 ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress /></Box>
          ) : filtered.length === 0 ? (
            <Paper elevation={0} sx={{ flexGrow: 1, p: 3, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, color: "text.secondary", minHeight: 400 }}>
              <NoteAltOutlinedIcon sx={{ fontSize: 64, opacity: 0.4 }} />
              <Typography>
                {items.length === 0 ? "עדיין אין הערות. צור הערה חדשה כדי להתחיל." : "אין הערות התואמות את החיפוש."}
              </Typography>
            </Paper>
          ) : (
            filtered.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                draft={draftFor(note.id)}
                isDirty={isDirty(note.id)}
                isActive={note.id === activeNoteId}
                isSelected={selectedIds.has(note.id)}
                // Callback refs, so a card that leaves the list takes its entry
                // with it instead of leaving a handle to a dead editor behind.
                editorRef={(api) => {
                  if (api) editorApis.current.set(note.id, api);
                  else editorApis.current.delete(note.id);
                }}
                cardRef={(node) => {
                  if (node) cardNodes.current.set(note.id, node);
                  else cardNodes.current.delete(note.id);
                }}
                onDraftChange={(draft) => setDrafts((prev) => ({ ...prev, [note.id]: draft }))}
                onFormatsChange={setFormats}
                onFocus={() => setActiveNoteId(note.id)}
                // A paste that could not be embedded — an image over the size
                // cap, a file that would not read. Silence would look like a
                // paste that simply did nothing.
                onError={reportEditorWarning}
                onSave={() => requestSave(note)}
                onDelete={() => setDeleteTargets([note])}
                onOpenSource={openSource}
                // The pencil on a chip that is a bookmark renames the bookmark.
                onRenameSource={renameSource}
                // A bookmark dropped anywhere on the card is written into the
                // note's body at the point it landed. The card owns the drop
                // (it is the target the user aims at); the editor owns the
                // caret, and this is the one line that joins them.
                onDropSource={(bookmark, point) => {
                  editorApis.current.get(note.id)?.insertSource(bookmark, point);
                  setActiveNoteId(note.id);
                }}
              />
            ))
          )}
        </Box>
      </Box>

      {/* Mounted only while a source is open, rather than sitting there closed.
          The window renders nothing without one, but its HOOKS still ran — and
          they fetch the viewer's liked and saved id sets for the actions bar
          inside it, so simply opening the notebook cost two requests for a
          window nobody had asked for. Nothing is lost by unmounting: the trail
          lives in this page's state, and the window re-fetches its lecture on
          every open in any case. */}
      {source && (
      <SourcePreviewDialog
        open
        // Two different closes: the X only puts the window away, so the trail
        // survives and reopening a source rejoins it. The footer button ends
        // the run outright.
        onClose={() => setSourceIndex(-1)}
        onCloseCurrent={closeCurrentSource}
        onCloseAll={() => { setSourceIndex(-1); setSourceTrail([]); }}
        mediaId={source?.mediaId}
        timestampSeconds={source?.timestampSeconds}
        chunkId={source?.chunkId}
        pageNumber={source?.pageNumber}
        fallbackTitle={source?.mediaTitle}
        noteText={source?.noteText}
        bookmarks={sourceBookmarks}
        trailPosition={sourceIndex + 1}
        trailLength={sourceTrail.length}
        onPrev={sourceIndex > 0 ? () => setSourceIndex(sourceIndex - 1) : null}
        onNext={sourceIndex < sourceTrail.length - 1 ? () => setSourceIndex(sourceIndex + 1) : null}
      />
      )}

      {/* Mounted only while it is open, for the same reason the source window
          is: it seeds its plan from the current selection on open, and a closed
          copy holding a plan for notes that have since been unticked is state
          nobody asked it to keep. */}
      {splitOpen && (
        <ExportSplitDialog
          open
          notes={notesToExport}
          exporting={exporting}
          onClose={() => setSplitOpen(false)}
          // Not an export yet: the plan goes on to the same last question every
          // other export answers, and the dialog stays open behind it so that
          // cancelling comes back to the arrangement rather than losing it.
          onExport={(books, format) => askSources({ format, books })}
        />
      )}

      <ExportSourcesDialog
        open={Boolean(pendingExport)}
        current={sourceStyle}
        exporting={exporting}
        summary={pendingExport?.books
          ? `${pendingExport.books.length} קבצים · ${pendingExport.format === "pdf" ? "PDF" : "Word"}`
          : `${notesToExport.length} הערות · ${pendingExport?.format === "pdf" ? "PDF" : "Word"}`}
        onChoose={runExport}
        onClose={() => setPendingExport(null)}
      />

      <UntitledNoteDialog
        open={Boolean(titlePrompt)}
        onCancel={() => setTitlePrompt(null)}
        onSave={confirmTitle}
      />

      <ConfirmingDeletionDialog
        open={Boolean(deleteTargets)}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleDeleteConfirm}
        message={
          deleteTargets?.length === 1
            ? `האם אתה בטוח שאתה מעוניין למחוק את ההערה "${deleteTargets[0].title?.trim() || "ללא כותרת"}"?`
            : `האם אתה בטוח שאתה מעוניין למחוק ${deleteTargets?.length ?? 0} הערות? לא ניתן לבטל פעולה זו.`
        }
      />
    </Box>
  );
};

export default NotebookPage;
