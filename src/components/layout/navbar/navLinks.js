import { roles } from "../../../utilities/constant";

// Every entry here must map to a real route in App.jsx. A link to a path with
// no route silently falls through to the "*" catch-all (=> /archive), which
// looks like two different tabs opening the same page.
// Note: bookmarks are per-media markers on the player timeline (MediaViewPage),
// not a page of their own — so there is deliberately no bookmarks entry.
// Order matters and is shared: this array drives both the desktop links row and
// the drawer list, so the two always read in the same order.
//
// The user's OWN collections are not here — they live in personalShelves.js and
// reach the bar through a single "תוכן אישי" dropdown. Three separate tabs
// for three personal shelves crowded out the places everyone actually browses,
// and they grow with every new kind of thing a user can keep.
// "הקורסים שלי" is here rather than under "תוכן אישי" because it is not a
// collection the user built — it is what they have been enrolled in, and it now
// decides which lessons the archive shows them. That makes it a place to browse,
// which is what this row is for.
// "שאל את הארכיון" sits beside the archive it asks (PRD ASK-2).
const studentLinks = [
  { label: "ארכיון", to: "/archive" },
  { label: "שאל את הארכיון", to: "/ask" },
  { label: "הקורסים שלי", to: "/my-courses" },
  { label: "מפגשים", to: "/sessions" },
  { label: "תרומה", to: "/donate" },
];

// Lecturers get the management entry as well — they run their own courses. Both
// appear: a lecturer can be enrolled in a colleague's course like anyone else,
// and the two screens answer different questions. "ניהול קורסים" rather than
// "קורסים" so the pair is not two tabs with indistinguishable names.
const lecturerLinks = [
  ...studentLinks,
  { label: "ניהול קורסים", to: "/courses" },
];

const adminLinks = [
  ...lecturerLinks,
  { label: "משתמשים", to: "/users" },
  { label: "ניהול", to: "/admin" },
];

// The user's own material comes from personalShelves.js rather than being listed
// here: that file is also what App.jsx builds the routes from and what each
// page takes its heading from, so a label or a path is stated once for all four.
// This bar feeds both the "תוכן אישי" dropdown and the drawer's top section from
// it, which is what stops those two from telling different stories.

export const getLinksByRole = (role) => {
  if (role === roles.admin) return adminLinks;
  if (role === roles.lecturer) return lecturerLinks;
  return studentLinks;
};
