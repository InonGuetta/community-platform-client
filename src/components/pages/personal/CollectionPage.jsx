import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MediaGrid from "../archive/componentsArchive/MediaGrid";
import PlaylistsSection from "./PlaylistsSection";
import { selectUser } from "../../../store/selectors/authSelectors";
import { countLabel } from "../../../utilities/countLabel";

// One page for every personal collection, driven by the shelf handed to it.
//
// "התוכן שאהבתי" and "תוכן שמור" were two files that differed in three strings:
// the heading, the thunk and the empty-state sentence. Two copies of a layout is
// two places to fix a spacing bug, and the second copy is the one that gets
// forgotten — so the layout lives here once and the differences live in
// personalShelves.js, which is also where the nav reads them from. The heading
// below is literally the same string as the tab that leads here.
//
// The card grid is the archive's, not one of its own: these are the same
// lectures, and one a user kept should look and behave exactly as it does where
// they found it. `onDelete`/`onTogglePublish` are deliberately not passed —
// MediaCard hides those controls when it has no handler, and a personal shelf is
// not a management screen.
const CollectionPage = ({ shelf }) => {
  const { label, collection } = shelf;
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items, status } = useSelector(collection.selectSlice);
  const user = useSelector(selectUser);

  useEffect(() => { dispatch(collection.fetch()); }, [dispatch, collection]);

  // A shelf may show only PART of what its thunk loaded — the saved shelf keeps
  // the lectures filed in lists out of the loose grid, because they are shown in
  // the lists below it and would otherwise appear twice. The predicate lives on
  // the shelf, next to the fetch it filters, rather than as an "is this the
  // saved page" test in here.
  const shown = collection.filterItems ? items.filter(collection.filterItems) : items;

  // Nothing loose to show is not the same as nothing saved at all: with every
  // item filed away, the ordinary empty state would tell the user they have
  // saved nothing while their lists sit right underneath saying otherwise.
  const emptyMessage = items.length && !shown.length && collection.emptyFilteredMessage
    ? collection.emptyFilteredMessage
    : collection.emptyMessage;

  return (
    <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "calc(100vh - 64px)" }}>
      <Box sx={{ flexGrow: 1, p: 3 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Typography variant="h4" fontWeight={800} color="primary">{label}</Typography>
          {shown.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {countLabel(shown.length, "פריט אחד", "פריטים")}
            </Typography>
          )}
        </Box>

        <MediaGrid
          items={shown}
          status={status}
          onView={(id) => navigate(`/media/${id}`)}
          user={user}
          emptyMessage={emptyMessage}
          emptyActionLabel="לארכיון"
          onEmptyAction={() => navigate("/archive")}
        />

        {/* The user's own lists, under everything kept loose — see the shelf's
            `showsLists`. Only the saved shelf has any; likes are not filed. */}
        {collection.showsLists && <PlaylistsSection />}
      </Box>
    </Box>
  );
};

export default CollectionPage;
