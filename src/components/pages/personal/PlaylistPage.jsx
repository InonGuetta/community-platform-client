import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import MediaGrid from "../archive/componentsArchive/MediaGrid";
import { fetchPlaylist } from "../../../store/slicesAndThunks/savesSlice/savesGet";
import { selectUser } from "../../../store/selectors/authSelectors";
import { statuses } from "../../../utilities/constant";
import { countLabel } from "../../../utilities/countLabel";
import { SAVED_SHELF } from "./personalShelves";

// One saved list, opened from the cards on the saved-content page.
//
// A route of its own rather than an expanding panel there: a list is a place a
// user comes back to, and a place worth linking to has an address. It also means
// the page can be arrived at cold — which is why the server sends the list's
// TITLE with its rows (see getPlaylistWithMedia), rather than leaving the
// heading to be looked up from a store that may hold nothing yet.
//
// The grid is the archive's, like every other shelf: these are the same
// lectures, and one a user filed should look and behave exactly as it does where
// they found it.
const PlaylistPage = () => {
  const { playlistId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { playlist, items, status } = useSelector((state) => state.saves.openList);
  const user = useSelector(selectUser);

  useEffect(() => { dispatch(fetchPlaylist(Number(playlistId))); }, [dispatch, playlistId]);

  const failed = status === statuses.failed;

  return (
    <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {/* Forward-pointing arrow, because back is to the RIGHT in Hebrew — the
            app does not flip MUI's physical icons, so the direction has to be
            chosen rather than inherited. */}
        <Button
          onClick={() => navigate(SAVED_SHELF.path)}
          startIcon={<ArrowForwardIcon />}
          sx={{ mb: 2, "& .MuiButton-startIcon": { ml: -0.25, mr: 0.75 } }}
        >
          {SAVED_SHELF.label}
        </Button>

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          {/* The heading holds its place while the list loads, so the page does
              not jump once the title arrives. */}
          <Typography variant="h4" fontWeight={800} color="primary">
            {playlist?.title || "רשימה שמורה"}
          </Typography>
          {items.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {countLabel(items.length, "שיעור אחד", "שיעורים")}
            </Typography>
          )}
        </Box>

        {/* A failed load is told apart from an empty list on purpose: "הרשימה
            ריקה" under a request that never arrived sends the user looking for
            lectures they did not lose. */}
        {failed ? (
          <Alert severity="error">טעינת הרשימה נכשלה. ייתכן שהרשימה נמחקה.</Alert>
        ) : (
          <MediaGrid
            items={items}
            status={status}
            onView={(id) => navigate(`/media/${id}`)}
            user={user}
            emptyMessage="אין עדיין שיעורים ברשימה הזו"
            emptyActionLabel="לארכיון"
            onEmptyAction={() => navigate("/archive")}
          />
        )}
      </Box>
    </Box>
  );
};

export default PlaylistPage;
