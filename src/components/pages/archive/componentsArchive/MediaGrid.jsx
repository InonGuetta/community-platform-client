import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import MediaCard from "./MediaCard";
import NoDataDialog from "../../../features/NoDataDialog/NoDataDialog";
import { statuses } from "../../../../utilities/constant";

const MediaGrid = ({ items, status, onView, user, onDelete }) => {
  if (status === statuses.loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!items.length) return <NoDataDialog message="No media found" />;

  return (
    <Grid container spacing={3}>
      {items.map((item) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={item.id}>
          <MediaCard item={item} onView={onView} user={user} onDelete={onDelete} />
        </Grid>
      ))}
    </Grid>
  );
};

export default MediaGrid;
