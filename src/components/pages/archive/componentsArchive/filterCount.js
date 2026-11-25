import { decisionCount } from "../../../../utilities/tagStates";

// How many filters the shut panel is holding — the number on the "סינון" chip.
//
// The count is what makes it safe for the filters to hide behind a chip: a
// hidden filter that is still applied is how somebody concludes the archive is
// empty, and the number means the panel is never silently narrowing what they
// see.
//
// Not the media type. It used to be counted, because it sat inside the panel;
// it is a row of chips on the toolbar now, always in view (D-03).
//
// An EXCLUSION is one of them: a tag taken out narrows the archive exactly as
// much as one put in. And a tag choice counts as one DECISION, not as the tags
// it reaches — choosing תורה is one click and fifty-four tags; see
// SelectedTags for where the number of tags is said.
export const activeFilterCount = ({
  creatorFilter = "",
  tagIds = [],
  excludedTagIds = [],
  uploadedAfter = "",
  uploadedBefore = "",
  lengthOffered = true,
  durationRange = "",
}) =>
  (creatorFilter ? 1 : 0) +
  decisionCount({ includedIds: tagIds, excludedIds: excludedTagIds }) +
  (uploadedAfter ? 1 : 0) +
  (uploadedBefore ? 1 : 0) +
  (lengthOffered && durationRange ? 1 : 0);
