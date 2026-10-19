import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import KeyboardArrowDownRoundedIcon from "@mui/icons-material/KeyboardArrowDownRounded";
import MediaGrid from "../archive/componentsArchive/MediaGrid";
import { fetchPlaylists } from "../../../store/slicesAndThunks/savesSlice/savesGet";
import { selectUser } from "../../../store/selectors/authSelectors";
import { statuses } from "../../../utilities/constant";
import { countLabel } from "../../../utilities/countLabel";
import { savedListPath } from "./personalShelves";

// How many more the arrow reveals each time.
//
// MediaGrid lays its cards out three to a row on a wide screen (md={4}), so this
// is that same three said once more, where the counting is done. The two have to
// agree on a desktop: a step of three against a grid that fits four would reveal
// a fourth card the arrow never counted.
//
// On a phone the grid is one card per row and this is still three — three cards
// per press rather than one row per press. That is deliberate: the alternative
// is counting rows per breakpoint, which means this component watching the
// window in order to decide how much a button does.
const PER_ROW = 3;

// The user's own lists — each one a heading with its own lectures underneath.
//
// It used to be a card per list and nothing else: a name, a count, and a click
// through to see what was in it. That is a table of contents, not a shelf. What
// the page is for is seeing what you saved, so each list now shows its most
// recent lectures in the same cards they appear in everywhere else, and the
// whole list is still a click away for when there is more than fits.
//
// The cards are the archive's MediaGrid, like every other shelf on this page: a
// lecture a user filed should look and behave exactly as it does where they
// found it — same menu, same badges, same click.
const PlaylistShelf = ({ playlist, user, onView, onOpenList }) => {
  const items = playlist.items || [];

  // How many cards are open, for THIS list. Per shelf and not per page: two
  // lists on one screen are two separate things to page through, and a single
  // counter would open them in lockstep.
  //
  // The items arrive newest first (ORDER BY added_at DESC), so the first
  // PER_ROW of them are the most recently added.
  const [visibleCount, setVisibleCount] = useState(PER_ROW);
  const shown = items.slice(0, visibleCount);
  const hasMore = shown.length < items.length;
  const showMore = () => setVisibleCount((n) => n + PER_ROW);

  // The server caps how many lectures ride along with a list. Past that the list
  // has a page of its own, which was built for exactly this.
  //
  // `item_count` counts what this viewer MAY SEE, not what the list holds — so
  // this compares like with like. Before that, a list holding lectures from a
  // course the viewer is not enrolled in offered "the whole list" and then
  // opened a page showing exactly the same cards.
  const beyondWhatArrived = playlist.item_count > items.length;

  return (
    <Box sx={{ mb: 4 }}>
      {/* The title on the right and the arrow on the left — in RTL that is
          start and end of one row, so space-between puts each at its edge. */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, flexWrap: "wrap", minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={800}>{playlist.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {countLabel(playlist.item_count, "שיעור אחד", "שיעורים")}
          </Typography>
          {/* Offered only when there is something here it cannot show. A link to
              "the whole list" beside a list that is already whole is a question
              the reader has to answer for nothing. */}
          {beyondWhatArrived && (
            <Button size="small" onClick={onOpenList} sx={{ textTransform: "none" }}>
              לרשימה המלאה
            </Button>
          )}
        </Box>

        {/* Absent when everything already fits in one row; disabled once every
            card that arrived is open. The span keeps the Tooltip working on a
            disabled button, which fires no pointer events of its own. */}
        {items.length > PER_ROW && (
          <Tooltip title={hasMore ? "עוד שיעורים" : "אין עוד שיעורים"}>
            <span>
              <IconButton
                onClick={showMore}
                disabled={!hasMore}
                aria-label={`הצג עוד שיעורים מתוך ${playlist.title}`}
              >
                <KeyboardArrowDownRoundedIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>

      {items.length === 0 ? (
        // Either genuinely empty, or holding only lectures this viewer may not
        // see — the server applies the same visibility rule here as everywhere.
        // Both are "nothing to show you", and neither is an error.
        <Typography variant="body2" color="text.disabled">
          אין בה שיעורים להצגה.
        </Typography>
      ) : (
        <MediaGrid items={shown} status={statuses.succeeded} onView={onView} user={user} />
      )}
    </Box>
  );
};

const PlaylistsSection = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const playlists = useSelector((state) => state.saves.playlists);
  const status = useSelector((state) => state.saves.playlistsStatus);
  const user = useSelector(selectUser);

  // withItems, because this page draws what is INSIDE each list. The save menu
  // calls the same thunk without it — see savesApi.listPlaylists.
  useEffect(() => { dispatch(fetchPlaylists({ withItems: true })); }, [dispatch]);

  const loading = status === statuses.loading && playlists.length === 0;

  return (
    <Box sx={{ mt: 5 }}>
      <Typography variant="h6" fontWeight={800} color="primary" sx={{ mb: 2 }}>
        רשימות שמורות
      </Typography>

      {status === statuses.failed ? (
        <Alert severity="error">טעינת הרשימות נכשלה. נסה לרענן את העמוד.</Alert>
      ) : loading ? (
        <Grid container spacing={3}>
          {Array.from({ length: PER_ROW }).map((_, i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rounded" height={260} />
            </Grid>
          ))}
        </Grid>
      ) : playlists.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          עדיין אין לך רשימות. אפשר ליצור רשימה מתוך כפתור השמירה שבעמוד השיעור.
        </Typography>
      ) : (
        playlists.map((playlist) => (
          <PlaylistShelf
            key={playlist.id}
            playlist={playlist}
            user={user}
            onView={(id) => navigate(`/media/${id}`)}
            onOpenList={() => navigate(savedListPath(playlist.id))}
          />
        ))
      )}
    </Box>
  );
};

export default PlaylistsSection;
