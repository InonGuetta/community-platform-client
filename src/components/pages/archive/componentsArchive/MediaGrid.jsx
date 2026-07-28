import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import MediaCard from "./MediaCard";
import NoDataDialog from "../../../features/NoDataDialog/NoDataDialog";
import { statuses } from "../../../../utilities/constant";

const SKELETON_COUNT = 6;

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

const MediaGrid = ({ items, status, onView, user, onDelete, emptyActionLabel, onEmptyAction, filtered = false }) => {
  // Skeletons only on the first load (no items yet). `media.status` is shared with
  // mutations like upload (uploadMedia.pending → loading), so gating on an empty
  // list keeps the existing grid visible during an upload instead of flashing
  // skeletons over it.
  if (status === statuses.loading && !items.length) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <Grid item xs={12} sm={6} md={4} key={i}>
            <MediaCardSkeleton />
          </Grid>
        ))}
      </Grid>
    );
  }

  if (!items.length) {
    // A filter/search that matches nothing is a different case from an empty
    // archive: uploading won't surface results, so the CTA is shown only when the
    // archive is genuinely empty (no active filter).
    return filtered ? (
      <NoDataDialog message="לא נמצאו תוצאות מתאימות" />
    ) : (
      <NoDataDialog message="לא נמצאה מדיה" actionLabel={emptyActionLabel} onAction={onEmptyAction} />
    );
  }

  return (
    <Grid container spacing={3}>
      {items.map((item) => (
        <Grid item xs={12} sm={6} md={4} key={item.id}>
          <MediaCard item={item} onView={onView} user={user} onDelete={onDelete} />
        </Grid>
      ))}
    </Grid>
  );
};

export default MediaGrid;
