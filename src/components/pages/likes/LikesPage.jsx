import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MediaGrid from "../archive/componentsArchive/MediaGrid";
import { fetchLikedMedia } from "../../../store/slicesAndThunks/likesSlice/likesGet";
import { selectUser } from "../../../store/selectors/authSelectors";

// The same card grid as the archive rather than a list of its own: these are the
// same lectures, and a liked item should look and behave exactly as it does
// where the user found it. `onDelete`/`onTogglePublish` are deliberately not
// passed — MediaCard hides those controls when it has no handler, and this page
// is a personal reading list, not a management screen.
const LikesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, status } = useSelector((state) => state.likes);
  const user = useSelector(selectUser);

  useEffect(() => { dispatch(fetchLikedMedia()); }, [dispatch]);

  return (
    <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary">התוכן שאהבתי</Typography>
          {items.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {items.length} פריטים
            </Typography>
          )}
        </Box>

        <MediaGrid
          items={items}
          status={status}
          onView={(id) => navigate(`/media/${id}`)}
          user={user}
          emptyMessage="עדיין לא סימנת תוכן בלייק"
          emptyActionLabel="לארכיון"
          onEmptyAction={() => navigate("/archive")}
        />
      </Box>
    </Box>
  );
};

export default LikesPage;
