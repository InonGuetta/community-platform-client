import { mediaTypes } from "../../../utilities/constant";

// The archive's filters, as an address.
//
// ── Why they belong in the URL ──────────────────────────────────────────────
//
// They lived in component state alone, which meant a filtered archive could not
// be returned to or handed to anyone. Refreshing threw the filter away — and a
// filter is not a scroll position, it is the question somebody asked. Worse, the
// answer to "look at these three shiurim" was a screenshot, because there was no
// address that meant it. A lecturer cannot link a class to a branch of the
// vocabulary, and nobody can bookmark the view they work in every day.
//
// ── Why these names, and not the API's ──────────────────────────────────────
//
// The server reads `tagIds` and `excludeTagIds`. This writes `tags` and `not`.
// They are deliberately NOT the same vocabulary: a URL somebody has bookmarked
// or pasted into a WhatsApp group is a promise that has to keep working, while
// a query parameter between our own two packages is an implementation detail
// that may be renamed the day the API changes. Tying them together would make
// every server rename break every link ever shared.
//
// The mapping is here, in one file, with its test — which is what makes that
// separation cost one function rather than a search through the codebase.

export const FILTER_PARAMS = {
  type: "type",
  search: "q",
  creator: "creator",
  tags: "tags",
  excluded: "not",
  from: "from",
  to: "to",
};

export const EMPTY_FILTERS = {
  typeFilter: "",
  searchQuery: "",
  creatorFilter: "",
  tagIds: [],
  excludedTagIds: [],
  dates: { uploadedAfter: "", uploadedBefore: "" },
};

// Ids arrive comma-joined — `tags=2,5` rather than `tags=2&tags=5`. Shorter, and
// a shared link is read by people.
const readIds = (value) =>
  (value || "")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isInteger(id) && id > 0);

// A date the archive can filter by. Anything else is dropped rather than passed
// on: the server would answer 400, and a link that errors is worse than one that
// quietly shows more than it should.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const readDate = (value) => (ISO_DATE.test(value || "") ? value : "");

/**
 * The filter an address describes.
 *
 * Everything is validated on the way in, because a URL is typed, edited and
 * truncated by people and by chat clients. An unusable value becomes "no
 * filter", never an error and never a request the server has to refuse.
 */
export const readFilters = (searchParams) => {
  const get = (key) => searchParams?.get(FILTER_PARAMS[key]) ?? "";
  const type = get("type");
  return {
    // Checked against the vocabulary rather than passed through: `type=banana`
    // would otherwise be a filter that matches nothing, with a control on screen
    // showing no type selected to explain it.
    typeFilter: Object.values(mediaTypes).includes(type) ? type : "",
    searchQuery: get("search"),
    creatorFilter: get("creator"),
    tagIds: readIds(get("tags")),
    excludedTagIds: readIds(get("excluded")),
    dates: {
      uploadedAfter: readDate(get("from")),
      uploadedBefore: readDate(get("to")),
    },
  };
};

/**
 * The address a filter describes.
 *
 * Empty values are left out entirely, so an unfiltered archive is a clean URL
 * rather than a row of empty parameters — and so two ways of holding the same
 * filter produce the same string, which is what lets the caller compare before
 * writing and avoid a render loop.
 */
export const writeFilters = (filters) => {
  const params = new URLSearchParams();
  const set = (key, value) => {
    if (value) params.set(FILTER_PARAMS[key], value);
  };
  set("type", filters?.typeFilter);
  set("search", filters?.searchQuery);
  set("creator", filters?.creatorFilter);
  set("tags", (filters?.tagIds || []).join(","));
  set("excluded", (filters?.excludedTagIds || []).join(","));
  set("from", filters?.dates?.uploadedAfter);
  set("to", filters?.dates?.uploadedBefore);
  return params;
};
