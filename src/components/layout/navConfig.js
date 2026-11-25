import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import QuestionAnswerOutlinedIcon from "@mui/icons-material/QuestionAnswerOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import VolunteerActivismOutlinedIcon from "@mui/icons-material/VolunteerActivismOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import { roles } from "../../utilities/constant";
import { DOCK } from "../../theme/tokens";
import { PERSONAL_SHELVES, NOTEBOOK_SHELF } from "./personalShelves";
import { ArchiveDockIcon, AskDockIcon, CoursesDockIcon, NotebookDockIcon } from "./navbar/dockIcons";

// The navigation, described once (design/REDESIGN_V4.md, decision 3; D-06).
// The header's links, the avatar menu, the side drawer and the dock all read
// from here — same items, same names, same order — so none of them can offer
// a place the others have lost.
//
// Every `to` must be a real route in App.jsx: a path with no route falls
// through to the "*" catch-all (=> /archive) with no error anywhere. The
// personal shelves keep their paths in personalShelves.js, which is also what
// App builds their routes from; this file only lists them.
//
// An item is { id, labelKey (in "nav"), to | action, Icon?, match? }:
//   to      — a route; the item is a link
//   action  — a name the shell handles instead ("upload": open the upload
//             dialog on the archive, D-09)
//   match   — "exact" (default) or "prefix": when the item counts as the page
//             you are on (D-31)
//   alsoOn  — path prefixes that light the item too: a lesson (/media/:id) is
//             opened from the archive, so the archive stays lit (UI_UX_FIXES 3.1)

// The five places everyone browses (component 1). Order is the header's, the
// drawer's, and the dock's for the three that are in it.
export const PRIMARY_LINKS = [
  { id: "archive", labelKey: "links.archive", to: "/archive", Icon: ArchiveOutlinedIcon, alsoOn: ["/media"] },
  { id: "ask", labelKey: "links.ask", to: "/ask", Icon: QuestionAnswerOutlinedIcon },
  // Also lit on one course's page (/my-courses/:id, decision 4) — but never
  // on /courses, the management page, where nothing is lit.
  { id: "myCourses", labelKey: "links.myCourses", to: "/my-courses", match: "prefix", Icon: SchoolOutlinedIcon },
  { id: "sessions", labelKey: "links.sessions", to: "/sessions", Icon: EventOutlinedIcon },
  { id: "donate", labelKey: "links.donate", to: "/donate", Icon: VolunteerActivismOutlinedIcon },
];

const primaryById = Object.fromEntries(PRIMARY_LINKS.map((link) => [link.id, link]));

// The dock (component 4): three of the primary links plus the notebook, each with its glyph, its
// gradient and the short word shown under it on a phone.
export const DOCK_ITEMS = [
  { ...primaryById.archive, shortKey: "links.archive", Icon: ArchiveDockIcon, gradient: DOCK.gradient.archive },
  { ...primaryById.ask, shortKey: "dock.ask", Icon: AskDockIcon, gradient: DOCK.gradient.ask },
  { ...primaryById.myCourses, shortKey: "dock.myCourses", Icon: CoursesDockIcon, gradient: DOCK.gradient.myCourses },
  // The notebook is a personal shelf, not a primary link (UI_UX_FIXES 1.1). Last,
  // so in RTL it is the leftmost; lit on /notebook exactly.
  { id: "notebook", labelKey: NOTEBOOK_SHELF.labelKey, to: NOTEBOOK_SHELF.path, shortKey: "dock.notebook", Icon: NotebookDockIcon, gradient: DOCK.gradient.notebook },
];

// The user's own material, then their account (components 2 and 3).
export const ACCOUNT_ITEM = { id: "account", labelKey: "myAccount", to: "/profile", Icon: PersonOutlineIcon };

export const PERSONAL_ITEMS = [
  ...PERSONAL_SHELVES.map((shelf) => ({ id: shelf.path, labelKey: shelf.labelKey, to: shelf.path, Icon: shelf.Icon })),
  ACCOUNT_ITEM,
];

// Behind "תצוגת מנהל" (D-07), each for the roles that may use it today —
// exactly the sets the old bar showed, plus the archive's upload button.
// `countsRequests`: carries the number of role requests waiting (D-08).
export const ADMIN_ITEMS = [
  { id: "admin", labelKey: "links.admin", to: "/admin", Icon: DashboardOutlinedIcon, roles: [roles.admin] },
  { id: "users", labelKey: "links.users", to: "/users", Icon: PeopleOutlineIcon, roles: [roles.admin], countsRequests: true },
  { id: "manageCourses", labelKey: "links.manageCourses", to: "/courses", Icon: SchoolOutlinedIcon, roles: [roles.lecturer, roles.admin] },
  { id: "upload", labelKey: "links.upload", action: "upload", Icon: CloudUploadOutlinedIcon, roles: [roles.lecturer, roles.admin] },
];

// What one account is offered. An unknown or missing role gets no management
// items at all — the least, never whatever the last branch happens to return.
export const navConfigFor = (role) => ({
  personal: PERSONAL_ITEMS,
  primary: PRIMARY_LINKS,
  admin: ADMIN_ITEMS.filter((item) => item.roles.includes(role)),
});

// Whether `item` is the page at `pathname` (D-31). The archive is lit in every
// tab and filter (they do not change the path); a lesson lights the archive it is opened from;
// a lecturer's page, the personal shelves and the management pages light nothing.
export const isActive = (item, pathname) => {
  if (!item.to) return false;
  if (pathname === item.to) return true;
  if (item.alsoOn?.some((prefix) => pathname.startsWith(`${prefix}/`))) return true;
  return item.match === "prefix" && pathname.startsWith(`${item.to}/`);
};
