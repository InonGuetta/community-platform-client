import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import PlaylistPlayRoundedIcon from "@mui/icons-material/PlaylistPlayRounded";
import { alpha } from "@mui/material/styles";
import { fetchPlaylists } from "../../../store/slicesAndThunks/savesSlice/savesGet";
import { statuses } from "../../../utilities/constant";
import { countLabel } from "../../../utilities/countLabel";
import { savedListPath } from "./personalShelves";

const SKELETON_COUNT = 3;

// The user's own lists, as the way IN to them rather than as their contents.
//
// The saved page used to pour every list's lectures into the same grid as the
// loose ones, so a lecture filed in "לשבת" appeared next to one saved a minute
// ago with nothing to say which was which — and the lists themselves were
// invisible outside the save menu. Here they are the thing on the page, and what
// is inside one is a click away (PlaylistPage), not mixed into the page above.
const PlaylistCard = ({ playlist, onOpen }) => (
  <Card
    variant="outlined"
    sx={{
      height: "100%",
      borderRadius: 3,
      transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
      "&:hover": {
        transform: "translateY(-3px)",
        borderColor: "secondary.main",
        boxShadow: (theme) => `0 8px 22px ${alpha(theme.palette.common.black, 0.16)}`,
      },
    }}
  >
    <CardActionArea onClick={onOpen} sx={{ height: "100%", p: 2, display: "flex", gap: 1.5, justifyContent: "flex-start" }}>
      {/* The icon carries the "this is a list, not a lecture" signal, so it is
          given the same tinted disc treatment the app uses for placeholders
          rather than being left as a loose glyph beside the text. */}
      <Box
        sx={{
          flexShrink: 0,
          width: 48,
          height: 48,
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "secondary.main",
          bgcolor: (theme) => alpha(theme.palette.secondary.main, 0.12),
        }}
      >
        <PlaylistPlayRoundedIcon />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" fontWeight={700} noWrap>{playlist.title}</Typography>
        <Typography variant="body2" color="text.secondary">
          {countLabel(playlist.item_count, "שיעור אחד", "שיעורים")}
        </Typography>
      </Box>
    </CardActionArea>
  </Card>
);

const PlaylistsSection = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const playlists = useSelector((state) => state.saves.playlists);
  const status = useSelector((state) => state.saves.playlistsStatus);

  // No mediaId: the `contains` flags answer "is THIS lecture in the list", and
  // there is no lecture here — only the lists and how much is in each.
  useEffect(() => { dispatch(fetchPlaylists()); }, [dispatch]);

  const loading = status === statuses.loading && playlists.length === 0;

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" fontWeight={800} color="primary" sx={{ mb: 2 }}>
        רשימות שמורות
      </Typography>

      {status === statuses.failed ? (
        <Alert severity="error">טעינת הרשימות נכשלה. נסה לרענן את העמוד.</Alert>
      ) : loading ? (
        <Grid container spacing={2}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={84} />
            </Grid>
          ))}
        </Grid>
      ) : playlists.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          עדיין אין לך רשימות. אפשר ליצור רשימה מתוך כפתור השמירה שבעמוד השיעור.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {playlists.map((playlist) => (
            <Grid item xs={12} sm={6} md={4} key={playlist.id}>
              <PlaylistCard playlist={playlist} onOpen={() => navigate(savedListPath(playlist.id))} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default PlaylistsSection;
