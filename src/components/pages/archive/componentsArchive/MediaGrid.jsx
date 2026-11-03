import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import Button from "@mui/material/Button";
import useLoadMoreTrigger from "./useLoadMoreTrigger";
import MediaCard from "./MediaCard";
import NoDataDialog from "../../../features/NoDataDialog/NoDataDialog";
import { statuses } from "../../../../utilities/constant";

const SKELETON_COUNT = 6;

// The cards' grid: one column on a phone, two on a tablet, three from md up.
//
// A CSS grid with `gap`, not MUI's Grid. MUI's Grid spaces its items with a
// negative margin on the container and a width of 100% plus the spacing, and
// in this right-to-left app — which runs without the stylis flip plugin — that
// margin lands on the wrong side: the grid stuck 24px out past the page's left
// edge, and on a 375px phone the whole archive scrolled sideways (found in the
// PRD MOB-7 review). A gap has no side to get wrong. minmax(0, 1fr) so a long
// unbroken title cannot widen its column past the screen either.
const gridSx = {
  display: "grid",
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", md: "repeat(3, minmax(0, 1fr))" },
  gap: 3,
};

// A placeholder that mirrors MediaCard's shape (image area + two text lines) so
// the grid keeps its layout while loading instead of collapsing to a spinner.
const MediaCardSkeleton = () => (
  <Box sx={{ height: "100%" }}>
    <Skeleton
      variant="rectangular"
      height={180}
      sx={{ borderTopLeftRadius: "20px", borderBottomRightRadius: "20px" }}
    />
    <Box sx={{ px: 2, pt: 1.5 }}>
      <Skeleton width="70%" />
      <Skeleton width="90%" />
    </Box>
  </Box>
);

// `emptyMessage` defaults to the archive's wording, which is what every existing
// caller relies on; the likes page overrides it because "no media found" reads
// as a fault there rather than as an empty personal list.
// Paging (PRD ARCH-1) is optional: `hasMore`, `loadingMore` and `onLoadMore`
// come from the archive, which loads 24 at a time. The likes page passes none
// of them and gets the whole list it already had.
const MediaGrid = ({
  items, status, onView, user, onDelete, onTogglePublish, onEditTags, onEditDetails, onOpenCreator,
  emptyActionLabel, onEmptyAction, filtered = false, emptyMessage = "לא נמצאה מדיה",
  hasMore = false, loadingMore = false, onLoadMore,
}) => {
  // Before the early returns: a hook must run on every render.
  const loadMoreRef = useLoadMoreTrigger(onLoadMore, { enabled: Boolean(onLoadMore && hasMore) });

  // Skeletons only on the first load (no items yet). `media.status` is shared with
  // mutations like upload (uploadMedia.pending → loading), so gating on an empty
  // list keeps the existing grid visible during an upload instead of flashing
  // skeletons over it.
  if (status === statuses.loading && !items.length) {
    return (
      <Box sx={gridSx}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <MediaCardSkeleton key={i} />
        ))}
      </Box>
    );
  }

  if (!items.length) {
    // A filter/search that matches nothing is a different case from an empty
    // archive: uploading won't surface results, so the CTA is shown only when the
    // archive is genuinely empty (no active filter).
    return filtered ? (
      <NoDataDialog message="לא נמצאו תוצאות מתאימות" />
    ) : (
      <NoDataDialog message={emptyMessage} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
    );
  }

  return (
    <>
      <Box sx={gridSx}>
        {items.map((item) => (
          <Box key={item.id} sx={{ minWidth: 0 }}>
            <MediaCard item={item} onView={onView} user={user} onDelete={onDelete} onTogglePublish={onTogglePublish} onEditTags={onEditTags} onEditDetails={onEditDetails} onOpenCreator={onOpenCreator} />
          </Box>
        ))}
        {/* The next page on its way: placeholder cards where it will land, so
            the grid grows rather than the page jumping when it arrives. */}
        {loadingMore &&
          Array.from({ length: 3 }).map((_, i) => (
            <MediaCardSkeleton key={`more-${i}`} />
          ))}
      </Box>

      {onLoadMore && hasMore && (
        // The sentinel the scroll watches, and the same thing as a button:
        // for a browser without IntersectionObserver, and for anybody moving
        // through the page with a keyboard rather than a wheel.
        <Box ref={loadMoreRef} sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Button variant="outlined" onClick={onLoadMore} disabled={loadingMore}>
            {loadingMore ? "טוען..." : "טעינת עוד"}
          </Button>
        </Box>
      )}
    </>
  );
};

export default MediaGrid;
