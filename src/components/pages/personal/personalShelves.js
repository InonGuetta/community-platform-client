import MenuBookIcon from "@mui/icons-material/MenuBook";
import ThumbUpAltIcon from "@mui/icons-material/ThumbUpAlt";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import HistoryIcon from "@mui/icons-material/History";
import { fetchLikedMedia } from "../../../store/slicesAndThunks/likesSlice/likesGet";
import { fetchSavedMedia } from "../../../store/slicesAndThunks/savesSlice/savesGet";
import { fetchContinueWatching } from "../../../store/slicesAndThunks/mediaSlice/mediaGet";

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

// And their colours, for the same reason: a like is green and a save is purple
// EVERYWHERE — on the lecture's action bar and on the shelf that action fills —
// so the two are stated here next to the icons rather than at each use site.
// Palette keys rather than hexes (see theme.js), so both lighten in dark mode on
// their own.
export const LIKE_COLOUR = "success.main";
export const SAVE_COLOUR = "personal.main";

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
  // Only the two shelves whose icons double as buttons on a lecture take a
  // colour, and it is the one that button lights up in — the green thumbs-up in
  // the nav is what the green thumbs-up on a lecture puts things into. The rest
  // of the list stays navy, like the nav around it. Carried on the shelf so the
  // dropdown and the drawer read it from the same place rather than each
  // deciding for itself which rows are special.
  iconColour: LIKE_COLOUR,
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
  iconColour: SAVE_COLOUR,
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

// Where the user left off. Unlike the shelves above, this one is not filled by
// an action the user takes deliberately — it is simply what they have watched,
// which the player has been recording per lecture since it was written. That
// position was only ever read back to resume a single item; nothing had ever
// looked across them.
//
// No `filterItems` and no `emptyFilteredMessage`: the server already excludes
// positions of zero and anything the caller may no longer see, so what arrives
// is exactly what belongs on the shelf.
export const CONTINUE_SHELF = {
  path: "/continue",
  label: "המשך צפייה",
  Icon: HistoryIcon,
  collection: {
    fetch: fetchContinueWatching,
    selectSlice: (state) => state.media.continueWatching,
    emptyMessage: "עדיין לא התחלת לצפות בשיעור",
  },
};

// Order matters: it is the order of the dropdown and of the drawer's section.
// Continue watching leads, because it is the one a returning user wants first —
// the others are things they have to have decided to keep.
export const PERSONAL_SHELVES = [CONTINUE_SHELF, NOTEBOOK_SHELF, LIKES_SHELF, SAVED_SHELF];

// The shelves that CollectionPage can render, which is also what App.jsx builds
// routes from — so a shelf added above arrives with its page already wired.
export const COLLECTION_SHELVES = PERSONAL_SHELVES.filter((shelf) => shelf.collection);
