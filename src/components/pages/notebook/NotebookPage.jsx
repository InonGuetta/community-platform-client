import Box from "@mui/material/Box";
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
import { useTranslation } from "react-i18next";
import NoteToolbar from "../../features/Notes/NoteToolbar";
import { HEADER_HEIGHT } from "../../layout/shellGeometry";

// The side column's distance below the site header while it sticks.
const SIDE_GAP = 12;

// Layout only. What the page does lives in useNotebookPageController; its four
// sections are in componentsNotebook/ (NotebookHeader, NotesIndex,
// BookmarksSidebar, NotesColumn), the formatting strip is features/Notes'
// NoteToolbar, and the dialogs they open are mounted here.
const NotebookPage = () => {
  const { t } = useTranslation(["notebook", "notes"]);
  const {
    activeNoteId,
    allVisibleSelected,
    askSources,
    bookmarkSections,
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
    selectedCount,
    selectedIds,
    selectedNotes,
    selecting,
    startSelecting,
    cancelSelecting,
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
    dockOffset,
  } = useNotebookPageController();

  // The strip is live whenever there is a note to format (UI_UX_FIXES 4.4):
  // before the caret has been anywhere it aims at the first note, and the
  // press moves the focus into that editor (exec restores or creates the
  // selection) and applies there.
  const targetNoteId = activeNoteId ?? filtered[0]?.id ?? null;

  return (
    // Redesign v4 (screen 05). PageContainer already gives the page its width
    // and padding, so there is no wrapper of its own: the header, then two
    // columns — the notes (7) and, beside them, the index and the bookmarks
    // (5) — stacked on a phone with the index first, as before.
    //
    // The PAGE scrolls now (D-119, superseding D-37's inner scrolling): from
    // md the formatting strip sticks under the site header at the top of the
    // notes, and the side column sticks beside them and scrolls inside itself
    // when it is taller than the window — so both stay in reach down a long
    // notebook without the page having to guess a height for itself.
    <>
      <NotebookHeader
        askSources={askSources}
        exportAnchor={exportAnchor}
        exporting={exporting}
        handleCreate={handleCreate}
        notesToExport={notesToExport}
        selectedCount={selectedCount}
        setExportAnchor={setExportAnchor}
        setSplitOpen={setSplitOpen}
      />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(12, minmax(0, 1fr))" },
          gap: 3,
          alignItems: "start",
        }}
      >
        {/* The index — every note is already open in the column beside it, so
            a row scrolls to its card; it is also where notes are ticked for a
            bulk action — and every bookmark the user has left across the
            platform, so the notebook is one place for both kinds of personal
            marking. */}
        <Box
          sx={{
            gridColumn: { md: "span 5" },
            // First in the document — read and tabbed to first, and on top on
            // a phone, as the list always was — but drawn after the notes
            // from md, where the notes take the start side.
            order: { md: 1 },
            minWidth: 0,
            display: "flex", flexDirection: "column", gap: 3,
            position: { md: "sticky" },
            top: { md: HEADER_HEIGHT + SIDE_GAP },
            maxHeight: { md: `calc(100vh - ${HEADER_HEIGHT + SIDE_GAP}px - ${dockOffset.md}px)` },
            overflowY: { md: "auto" },
          }}
        >
          <NotesIndex
            activeNoteId={activeNoteId}
            allVisibleSelected={allVisibleSelected}
            drag={drag}
            filtered={filtered}
            goToNote={goToNote}
            isDirty={isDirty}
            items={items}
            reorderHint={reorderHint}
            selectedCount={selectedCount}
            selectedIds={selectedIds}
            selectedNotes={selectedNotes}
            selecting={selecting}
            startSelecting={startSelecting}
            cancelSelecting={cancelSelecting}
            setDeleteTargets={setDeleteTargets}
            setSearch={setSearch}
            someVisibleSelected={someVisibleSelected}
            status={status}
            toggleAllVisible={toggleAllVisible}
            toggleSelected={toggleSelected}
          />

          <BookmarksSidebar
            bookmarkSections={bookmarkSections}
            bookmarks={bookmarks}
            bookmarksStatus={bookmarksStatus}
            openSource={openSource}
          />
        </Box>
        {/* The notes themselves — every one of them, in the list's order —
            under the strip that formats whichever one the caret is in. */}
        <Box sx={{ gridColumn: { md: "span 7" }, minWidth: 0 }}>
          <Box
            sx={{
              position: { md: "sticky" },
              top: { md: HEADER_HEIGHT },
              zIndex: 2,
              // The page's own colour behind the strip, so the cards scrolling
              // up under it do not show through the gap above and below it.
              bgcolor: "background.default",
              py: { md: 1.5 },
              mt: { md: -1.5 },
              mb: { xs: 2, md: 1.5 },
            }}
          >
            <NoteToolbar
              onCommand={(command, value) => editorApis.current.get(targetNoteId)?.exec(command, value)}
              // A pixel size is not an execCommand — see
              // RichNoteEditor.setFontSize — so it has its own way in rather
              // than a fake command name.
              onFontSize={(px) => editorApis.current.get(targetNoteId)?.setFontSize(px)}
              formats={formats}
              // Faded only when there is no note at all to format.
              disabled={!targetNoteId}
            />
          </Box>

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
          ? t("export.summaryFiles", { count: pendingExport.books.length, format: pendingExport.format === "pdf" ? "PDF" : "Word" })
          : t("export.summaryNotes", { count: notesToExport.length, format: pendingExport?.format === "pdf" ? "PDF" : "Word" })}
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
            ? t("delete.one", { title: deleteTargets[0].title?.trim() || t("notes:untitledBare") })
            : t("delete.many", { count: deleteTargets?.length ?? 0 })
        }
      />
    </>
  );
};

export default NotebookPage;
