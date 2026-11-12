import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FilterBar from "./FilterBar";
import EditTagsDialog from "./EditTagsDialog";
import EditMediaDialog from "./EditMediaDialog";
import MediaGrid from "../../../features/MediaGrid/MediaGrid";
import ConfirmingDeletionDialog from "../../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";

// The archive's body — the filters, the count, the cards and the dialogs that
// edit them — shared by the archive itself and a lecturer's page (PRD ATTR-10,
// ARCH-5), which is the same archive with the lecturer already chosen. One
// component so the two cannot drift: a filter added here is on both.
//
// `archive` is what useArchivePageController returns. `chooseCreator` is false
// on the lecturer's page: the lecturer is the page's, so the field choosing one
// is not offered and does not count as a filter.
const ArchiveBrowser = ({ archive: a, user, canUpload, onOpenUpload, chooseCreator = true }) => {
  const deleteTarget = a.filteredMedia.find((i) => i.id === a.deleteTargetId);

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <FilterBar
          selectedTypes={a.selectedTypes}
          onToggleType={a.handleToggleType}
          onPressAllTypes={a.handlePressAllTypes}
          sortOrder={a.sortOrder}
          onSortChange={a.handleSortChange}
          durationRange={a.durationRange}
          onDurationFilter={a.handleDurationFilter}
          lengthOffered={a.lengthOffered}
          onSearch={a.handleSearch}
          creatorFilter={chooseCreator ? a.creatorFilter : ""}
          knownCreators={chooseCreator ? a.knownCreators : []}
          onCreatorFilter={a.handleCreatorFilter}
          tagIds={a.tagIds}
          excludedTagIds={a.excludedTagIds}
          tagTree={a.tagTree}
          onCycleTag={a.handleCycleTag}
          onRemoveTag={a.handleRemoveTag}
          onClearTags={a.handleClearTags}
          uploadedAfter={a.dates.uploadedAfter}
          uploadedBefore={a.dates.uploadedBefore}
          onDateFilter={a.handleDateFilter}
          onClearAll={a.handleClearFilters}
        />
      </Box>
      {/* How many the filter matches in all — the grid shows them 24 at a
          time, so the cards on screen are no longer the answer to "how
          many". Hidden until there is a number, and for an empty result,
          which the grid's own empty state already says. */}
      {a.total > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} aria-live="polite">
          {a.total === 1 ? "תוצאה אחת" : `${a.total.toLocaleString("he-IL")} תוצאות`}
          {a.filteredMedia.length < a.total && ` · מוצגות ${a.filteredMedia.length}`}
        </Typography>
      )}
      <MediaGrid
        items={a.filteredMedia}
        status={a.status}
        onView={a.handleOpenMedia}
        user={user}
        onDelete={a.handleDeleteRequest}
        onTogglePublish={a.handleTogglePublish}
        onEditTags={a.handleEditTags}
        onEditDetails={a.handleEditDetails}
        onOpenCreator={a.handleOpenCreator}
        emptyActionLabel={canUpload && onOpenUpload ? "העלאת מדיה" : undefined}
        onEmptyAction={onOpenUpload}
        filtered={a.hasActiveFilter}
        hasMore={a.hasMore}
        loadingMore={a.loadingMore}
        onLoadMore={a.handleLoadMore}
      />

      {/* Tagging an item that already exists — the only way to tag anything that
          was uploaded before the taxonomy, and the reason the filter had nothing
          to filter. */}
      <EditTagsDialog
        open={Boolean(a.tagTargetItem)}
        item={a.tagTargetItem}
        tagTree={a.tagTree}
        onClose={a.handleEditTagsCancel}
        onSave={a.handleEditTagsSave}
      />

      {/* Keyed by the item, so each lesson opens a fresh form seeded from it. */}
      {a.editTargetItem && (
        <EditMediaDialog
          key={a.editTargetItem.id}
          item={a.editTargetItem}
          courses={a.assignableCourses}
          knownCreators={a.knownCreators}
          onClose={a.handleEditDetailsCancel}
          onSave={a.handleEditDetailsSave}
        />
      )}

      <ConfirmingDeletionDialog
        open={!!a.deleteTargetId}
        onClose={a.handleDeleteCancel}
        onConfirm={a.handleDeleteConfirm}
        itemName={deleteTarget?.title}
        type="media"
      />
    </>
  );
};

export default ArchiveBrowser;
