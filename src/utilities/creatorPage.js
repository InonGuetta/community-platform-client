import { defaultCreatorName } from "./constant";
import i18n from "../i18n/i18n";

// A lecturer's page (PRD ATTR-10): /creators/<name>. One place that spells the
// path, for the route, the cards and the lesson page.
//
// The name is the identifier because it is what the archive attributes by —
// creator_name is free text on each lesson (who SAID it), not an account; a
// guest speaker has lessons and no login. Encoded: names are Hebrew and may
// hold a slash or a question mark.
export const CREATOR_ROUTE = "/creators/:name";

export const creatorPath = (name) => `/creators/${encodeURIComponent(name)}`;

// The stored "nobody was named" (defaultCreatorName) is not a person, so not a
// page, and not a link.
export const hasCreatorPage = (name) =>
  typeof name === "string" && name.trim() !== "" && name.trim() !== defaultCreatorName;

// A creator as a screen shows it: a name as written, and the stored "nobody"
// worded in the interface's language. Content stays as it is; the sentinel is
// the system's own word, so it is translated.
export const creatorDisplayName = (name) =>
  !name || name.trim() === defaultCreatorName ? i18n.t("format:creatorNone") : name;

// The pipeline's own default sometimes lands in creator_name as "AI" or
// "ToolLLM" — a value that leaks from the tooling, not a person. A screen shows
// no creator line for it.
// TODO(UI_UX_FIXES 5.2): remove once the server stops writing these and the
// existing rows are cleaned.
const LEAKED_CREATORS = ["ai", "toolllm"];
export const isLeakedCreator = (name) =>
  typeof name === "string" && LEAKED_CREATORS.includes(name.trim().toLowerCase());
