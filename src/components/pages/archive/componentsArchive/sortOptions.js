// The archive's sort orders, as the menu offers them.
//
// The values are the server's — lib/validate.js MEDIA_SORTS in the server
// repository — and travel as `sort` on the listing request. The two repositories
// cannot import each other, so the list is written out here; a value the server
// does not know comes back as a 400, which is loud rather than silent, and
// readSort below keeps a mangled address from ever sending one.
//
// An order, not a filter: it never changes which cards there are, only which
// comes first. That is why it lives outside the collapsible panel, is not
// counted on the "סינון" badge, and is left alone by "ניקוי הכל".

export const DEFAULT_SORT = "newest";

export const SORT_OPTIONS = [
  { value: "newest", label: "החדשים ביותר" },
  { value: "oldest", label: "הישנים ביותר" },
  { value: "title", label: "שם השיעור (א–ת)" },
  { value: "creator", label: "שם המרצה (א–ת)" },
  { value: "liked", label: "הכי אהובים" },
];

const KNOWN = new Set(SORT_OPTIONS.map((option) => option.value));

/** An order from outside — an address — reduced to one the menu can show. */
export const readSort = (value) => (KNOWN.has(value) ? value : DEFAULT_SORT);
