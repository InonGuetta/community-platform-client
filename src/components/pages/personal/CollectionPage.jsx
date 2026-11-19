import PageHeader from "../../features/PageHeader/PageHeader";
import MediaGrid from "../../features/MediaGrid/MediaGrid";
import PlaylistsSection from "./PlaylistsSection";
import { useCollectionPageController } from "./useCollectionPageController";
import { creatorPath } from "../../../utilities/creatorPage";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("personal");
  const {
    collection,
    emptyMessage,
    label,
    navigate,
    shown,
    status,
    subtitle,
    user,
  } = useCollectionPageController({ shelf });

  return (
    <>
      <PageHeader
        kicker={shown.length > 0 ? t("items", { count: shown.length }) : undefined}
        title={label}
        subtitle={subtitle}
      />

      <MediaGrid
        items={shown}
        status={status}
        onView={(id) => navigate(`/media/${id}`)}
        onOpenCreator={(name) => navigate(creatorPath(name))}
        user={user}
        emptyMessage={emptyMessage}
        emptyActionLabel={t("toArchive")}
        onEmptyAction={() => navigate("/archive")}
      />

      {/* The user's own lists, under everything kept loose — see the shelf's
          `showsLists`. Only the saved shelf has any; likes are not filed. */}
      {collection.showsLists && <PlaylistsSection />}
    </>
  );
};

export default CollectionPage;
