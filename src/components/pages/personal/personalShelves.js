import MenuBookIcon from "@mui/icons-material/MenuBook";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import { fetchLikedMedia } from "../../../store/slicesAndThunks/likesSlice/likesGet";
import { fetchSavedMedia } from "../../../store/slicesAndThunks/savesSlice/savesGet";

// The one description of each personal shelf — the collections a user builds for
// themselves, as opposed to the places everyone browses.
//
// Everything about a shelf is stated once here: where it lives, what it is
// called, which icon stands for it, and where its contents come from. The route
// in App.jsx, the "תוכן אישי" dropdown, the drawer section and the page's own
// heading all read from this file, so changing a label or a path here changes it
// everywhere at once and cannot half-land.
//
// Before this, those four were four separate edits. The dangerous one was the
// path: the nav said /saved and the route said /saved, and nothing anywhere
// connected the two — change one and the link silently falls through to the
// "*" catch-all, landing the user on the archive with no error at all.

// Filled and outline of the same icon, kept as a pair.
//
// A shelf and the button that fills it have to look like the same thing: the
// thumbs-up in the menu is what the thumbs-up on a lecture puts things into.
// They were two independent imports that happened to match because they were
// synchronised by hand, which lasts exactly until one of them is changed.
export const likeIcons = { on: ThumbUpAltIcon, off: ThumbUpOffAltIcon };
export const saveIcons = { on: BookmarkIcon, off: BookmarkBorderIcon };

// `collection` is present when the shelf is a grid of media rows that a thunk
// loads — which is what CollectionPage renders from. The notebook has none: it
// is a screen of its own with notes, sources and a floating player, not a list.
export const NOTEBOOK_SHELF = {
  path: "/notebook",
  label: "המחברת שלי",
  Icon: MenuBookIcon,
};

export const LIKES_SHELF = {
  path: "/likes",
  label: "התוכן שאהבתי",
  Icon: likeIcons.on,
  collection: {
    fetch: fetchLikedMedia,
    selectSlice: (state) => state.likes,
    emptyMessage: "עדיין לא סימנת תוכן בלייק",
  },
};

export const SAVED_SHELF = {
  path: "/saved",
  label: "תוכן שמור",
  Icon: saveIcons.on,
  collection: {
    fetch: fetchSavedMedia,
    selectSlice: (state) => state.saves,
    emptyMessage: "עדיין לא שמרת תוכן",
    // Saving is two things at once — filing a lecture in a list also saves it
    // generally (see the server's addToPlaylist) — so an unfiltered grid showed
    // every filed lecture loose at the top AND again inside its list. The top of
    // the page is therefore what is kept and NOT filed anywhere; the lists are
    // shown as their own cards below it and opened one at a time.
    filterItems: (item) => !item.in_list,
    // Reached only when there ARE saved items and every one of them sits in a
    // list. "עדיין לא שמרת תוכן" would be a plain untruth there.
    emptyFilteredMessage: "כל מה ששמרת מסודר ברשימות שלמטה",
    showsLists: true,
  },
};

// The page for ONE saved list, built from the shelf's own path so the route, the
// link and the shelf cannot drift apart — the same reason the paths live here at
// all. `:playlistId` is what PlaylistPage reads with useParams.
export const savedListPath = (playlistId) => `${SAVED_SHELF.path}/lists/${playlistId}`;
export const SAVED_LIST_ROUTE = savedListPath(":playlistId");

// Order matters: it is the order of the dropdown and of the drawer's section.
export const PERSONAL_SHELVES = [NOTEBOOK_SHELF, LIKES_SHELF, SAVED_SHELF];

// The shelves that CollectionPage can render, which is also what App.jsx builds
// routes from — so a shelf added above arrives with its page already wired.
export const COLLECTION_SHELVES = PERSONAL_SHELVES.filter((shelf) => shelf.collection);
