import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import ConfirmingDeletionDialog from "../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import SourcePreviewDialog from "../mediaView/componentsMediaView/SourcePreviewDialog";
import ExportSplitDialog from "./componentsNotebook/ExportSplitDialog";
import ExportSourcesDialog from "./componentsNotebook/ExportSourcesDialog";
import UntitledNoteDialog from "../../features/Notes/UntitledNoteDialog";
import { useNotebookPageController } from "./useNotebookPageController";
import NotebookHeader from "./componentsNotebook/NotebookHeader";
import NotesIndex from "./componentsNotebook/NotesIndex";
import BookmarksSidebar from "./componentsNotebook/BookmarksSidebar";
import NotesColumn from "./componentsNotebook/NotesColumn";

// The sticky navbar's height, which this page's own height is measured against.
const NAVBAR_HEIGHT = 64;

// Layout only. What the page does lives in useNotebookPageController; its four
// sections are in componentsNotebook/ (NotebookHeader, NotesIndex,
// BookmarksSidebar, NotesColumn), and the dialogs they open are mounted here.
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
    onNeedBody,
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
      <NotebookHeader
        activeNoteId={activeNoteId}
        askSources={askSources}
        editorApis={editorApis}
        exportAnchor={exportAnchor}
        exporting={exporting}
        formats={formats}
        handleCreate={handleCreate}
        notesToExport={notesToExport}
        selectedCount={selectedCount}
        setExportAnchor={setExportAnchor}
        setSplitOpen={setSplitOpen}
      />

      <Box sx={{ display: "flex", gap: 3, flexGrow: 1, minHeight: 0, flexDirection: { xs: "column", md: "row" } }}>
        {/* List column — an index of the notebook rather than a chooser: every
            note is already open in the column beside it, so a row here scrolls
            to its card. It is also where notes are ticked for a bulk action. */}
        <Paper elevation={0} sx={{ width: { xs: "100%", md: 340 }, flexShrink: 0, height: { md: "100%" }, minHeight: 0, p: 2, borderRadius: 3, border: "1px solid", borderColor: "divider", display: "flex", flexDirection: "column", gap: 1.5 }}>
          <NotesIndex
            activeNoteId={activeNoteId}
            allVisibleSelected={allVisibleSelected}
            drag={drag}
            filtered={filtered}
            goToNote={goToNote}
            isDirty={isDirty}
            items={items}
            reorderHint={reorderHint}
            search={search}
            selectedCount={selectedCount}
            selectedIds={selectedIds}
            selectedNotes={selectedNotes}
            setDeleteTargets={setDeleteTargets}
            setSearch={setSearch}
            someVisibleSelected={someVisibleSelected}
            status={status}
            toggleAllVisible={toggleAllVisible}
            toggleSelected={toggleSelected}
          />

          {/* Every bookmark the user has left across the platform, so the
              notebook is one place for both kinds of personal marking. */}
          <BookmarksSidebar
            bookmarkGroups={bookmarkGroups}
            bookmarks={bookmarks}
            bookmarksStatus={bookmarksStatus}
            openSource={openSource}
          />
        </Paper>

        {/* The notes themselves — every one of them, in the list's order, as a
            scrolling column. This is the pane that moves; everything else on the
            page stays where it is. */}
        <NotesColumn
          activeNoteId={activeNoteId}
          cardNodes={cardNodes}
          draftFor={draftFor}
          onNeedBody={onNeedBody}
          editorApis={editorApis}
          filtered={filtered}
          isDirty={isDirty}
          items={items}
          openSource={openSource}
          renameSource={renameSource}
          reportEditorWarning={reportEditorWarning}
          requestSave={requestSave}
          selectedIds={selectedIds}
          setActiveNoteId={setActiveNoteId}
          setDeleteTargets={setDeleteTargets}
          setDrafts={setDrafts}
          setFormats={setFormats}
          status={status}
        />
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
