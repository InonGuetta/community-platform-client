import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import FilterBar from "./FilterBar";
import ArchiveToolbar from "./ArchiveToolbar";
import { activeFilterCount } from "./filterCount";
import EditTagsDialog from "./EditTagsDialog";
import EditMediaDialog from "./EditMediaDialog";
import MediaGrid from "../../../features/MediaGrid/MediaGrid";
import ConfirmingDeletionDialog from "../../../features/ConfirmingDeletionDialog/ConfirmingDeletionDialog";
import { useTranslation } from "react-i18next";
import { formatNumber } from "../../../../utilities/formatDate";

// The archive's body — the toolbar, the filter panel, the count, the tiles and
// the dialogs that edit them — shared by the archive itself and a lecturer's page (PRD ATTR-10,
// ARCH-5), which is the same archive with the lecturer already chosen. One
// component so the two cannot drift: a filter added here is on both.
//
// `archive` is what useArchivePageController returns. `chooseCreator` is false
// on the lecturer's page: the lecturer is the page's, so the field choosing one
// is not offered and does not count as a filter.
const ArchiveBrowser = ({ archive: a, user, canUpload, onOpenUpload, chooseCreator = true }) => {
  const { t } = useTranslation("archive");
  const deleteTarget = a.filteredMedia.find((i) => i.id === a.deleteTargetId);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const creatorFilter = chooseCreator ? a.creatorFilter : "";
  const filterCount = activeFilterCount({
    creatorFilter,
    tagIds: a.tagIds,
    excludedTagIds: a.excludedTagIds,
    uploadedAfter: a.dates.uploadedAfter,
    uploadedBefore: a.dates.uploadedBefore,
    lengthOffered: a.lengthOffered,
    durationRange: a.durationRange,
  });

  return (
    <>
      <ArchiveToolbar
        selectedTypes={a.selectedTypes}
        onToggleType={a.handleToggleType}
        onPressAllTypes={a.handlePressAllTypes}
        onSearch={a.handleSearch}
        sortOrder={a.sortOrder}
        onSortChange={a.handleSortChange}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((prev) => !prev)}
        filterCount={filterCount}
        onDismissFilters={() => setFiltersOpen(false)}
        panel={
          <FilterBar
            open={filtersOpen}
            durationRange={a.durationRange}
            onDurationFilter={a.handleDurationFilter}
            lengthOffered={a.lengthOffered}
            creatorFilter={creatorFilter}
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
        }
      />

      {/* "כל הפריטים", and how many the filter matches in all — the grid
          shows them 24 at a time, so the tiles on screen are no longer the
          answer to "how many" (D-34). The number is hidden until there is
          one, and for an empty result, which the grid's own empty state says. */}
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mt: { xs: 4, md: 5 }, mb: { xs: 3, md: 4 } }}>
        <Typography variant="display" component="h2" sx={{ fontSize: 28 }}>
          {t("allItems")}
        </Typography>
        {a.total > 0 && (
          <Typography sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }} aria-live="polite">
            {t("results", { count: a.total, formatted: formatNumber(a.total) })}
            {a.filteredMedia.length < a.total && t("showing", { n: a.filteredMedia.length })}
          </Typography>
        )}
      </Box>
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
        emptyActionLabel={canUpload && onOpenUpload ? t("upload") : undefined}
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
