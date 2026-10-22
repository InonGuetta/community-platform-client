import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MediaGrid from "../archive/componentsArchive/MediaGrid";
import PlaylistsSection from "./PlaylistsSection";
import { countLabel } from "../../../utilities/countLabel";
import { useCollectionPageController } from "./useCollectionPageController";

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
  const {
    collection,
    emptyMessage,
    label,
    navigate,
    shown,
    status,
    user,
  } = useCollectionPageController({ shelf });

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
