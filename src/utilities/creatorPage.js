import { defaultCreatorName } from "./constant";

// A lecturer's page (PRD ATTR-10): /creators/<name>. One place that spells the
// path, for the route, the cards and the lesson page.
//
// The name is the identifier because it is what the archive attributes by —
// creator_name is free text on each lesson (who SAID it), not an account; a
// guest speaker has lessons and no login. Encoded: names are Hebrew and may
// hold a slash or a question mark.
export const CREATOR_ROUTE = "/creators/:name";

export const creatorPath = (name) => `/creators/${encodeURIComponent(name)}`;

// "כללי" is the archive's word for "nobody was named" — not a person, so not a
// page, and not a link.
export const hasCreatorPage = (name) =>
  typeof name === "string" && name.trim() !== "" && name.trim() !== defaultCreatorName;
