import { describe, it, expect } from "vitest";
import {
  TAG_STATE,
  buildTagRelations,
  tagStateOf,
  governingDecision,
  isEffectivelyIncluded,
  isPartiallyIncluded,
  cycleTagDecision,
  forgetTag,
  applyDecision,
  normalizeSelection,
  pruneUnknownTags,
  sameSelection,
  countUnder,
  effectiveTagCounts,
  decisionCount,
} from "./tagStates";

// The states a node in the taxonomy can be in, and why there are six.
//
// The bug this started from: choosing "תורה" and walking into it showed every
// book underneath as unselected, while the filter was in fact narrowed to
// exactly that branch. The UI said "nothing chosen here" over an active filter.
//
// The obvious fix — select the children too — was tried against the real query
// and empties the archive. Selections combine with AND, so choosing all five
// books asks for an item that is simultaneously in Bereshit and in Shemot. The
// last group below is that fact, written down so nobody re-proposes it; it is
// also the reason taking a child OUT of a chosen branch had to become a decision
// of its own rather than the removal of one.
//
// This file used to carry its own hand-copied version of the rule, so a change
// on screen could leave the test passing over logic nothing ran. It imports the
// real module now — the module is plain JavaScript precisely so that this test
// still needs no jsdom.

// תנ"ך → תורה → בראשית → וירא, plus a second book and a sibling branch.
const TREE = [
  { id: 1, name: 'תנ"ך', parent_id: null },
  { id: 2, name: "תורה", parent_id: 1 },
  { id: 3, name: "בראשית", parent_id: 2 },
  { id: 4, name: "וירא", parent_id: 3 },
  { id: 5, name: "שמות", parent_id: 2 },
  { id: 6, name: "בא", parent_id: 5 },
  { id: 9, name: "מוסר", parent_id: null },
];

const rel = buildTagRelations(TREE);
const sel = (includedIds = [], excludedIds = []) => ({ includedIds, excludedIds });
const stateOf = (selection, id) => tagStateOf(rel, selection, id);

describe("relations", () => {
  it("lists ancestors root first, so the last one is the parent", () => {
    expect(rel.ancestorsOf(4)).toEqual([1, 2, 3]);
  });

  it("lists the whole subtree as descendants", () => {
    expect([...rel.descendantsOf(2)].sort()).toEqual([3, 4, 5, 6]);
  });

  it("gives empty lists for a node it has never heard of", () => {
    expect(rel.ancestorsOf(999)).toEqual([]);
    expect(rel.descendantsOf(999)).toEqual([]);
  });
});

describe("choosing a branch", () => {
  // The original bug, stated as the behaviour it should have.
  it("marks everything beneath it as inherited, not as unselected", () => {
    const chosen = sel([2]); // תורה
    expect(stateOf(chosen, 3)).toBe(TAG_STATE.INHERITED); // בראשית
    expect(stateOf(chosen, 4)).toBe(TAG_STATE.INHERITED); // וירא
    expect(stateOf(chosen, 5)).toBe(TAG_STATE.INHERITED); // שמות
  });

  it("marks the branch itself as included", () => {
    expect(stateOf(sel([2]), 2)).toBe(TAG_STATE.INCLUDED);
  });

  // So you can find your way back down to a choice made three levels in.
  it("marks its ancestors as containing a choice", () => {
    expect(stateOf(sel([4]), 1)).toBe(TAG_STATE.CONTAINS);
    expect(stateOf(sel([4]), 2)).toBe(TAG_STATE.CONTAINS);
    expect(stateOf(sel([4]), 3)).toBe(TAG_STATE.CONTAINS);
  });

  it("leaves an unrelated branch alone", () => {
    expect(stateOf(sel([2]), 9)).toBe(TAG_STATE.NONE);
  });

  it("prefers the node's own decision over anything inherited", () => {
    // Both תורה and וירא chosen: וירא is included in its own right.
    expect(stateOf(sel([2, 4]), 4)).toBe(TAG_STATE.INCLUDED);
  });

  it("says nothing at all about an empty selection", () => {
    expect(stateOf(sel(), 4)).toBe(TAG_STATE.NONE);
    expect(tagStateOf(rel, undefined, 4)).toBe(TAG_STATE.NONE);
  });
});

// ── Taking part of a chosen branch back out ─────────────────────────────────
//
// "Everything in תורה except שמות". Without a decision of its own this could not
// be said at all, which is what made an inherited child impossible to un-choose:
// clicking it added it to the filter, the one thing the user was not asking for.

describe("excluding inside an included branch", () => {
  const chosen = sel([2], [5]); // תורה, without שמות

  it("marks the excluded node itself", () => {
    expect(stateOf(chosen, 5)).toBe(TAG_STATE.EXCLUDED);
  });

  it("carries the exclusion down to everything beneath it", () => {
    expect(stateOf(chosen, 6)).toBe(TAG_STATE.INHERITED_EXCLUDED); // בא
  });

  it("leaves the rest of the branch inherited", () => {
    expect(stateOf(chosen, 3)).toBe(TAG_STATE.INHERITED); // בראשית
    expect(stateOf(chosen, 4)).toBe(TAG_STATE.INHERITED); // וירא
  });

  // The nearest-ancestor rule, which is the whole reason the two states above
  // can differ: both nodes have an included ancestor AND an excluded one.
  it("lets the closest decision win, not the outermost one", () => {
    expect(governingDecision(rel, chosen, 6)).toBe("excluded");
    expect(governingDecision(rel, chosen, 4)).toBe("included");
  });

  it("keeps the parent itself included", () => {
    expect(stateOf(chosen, 2)).toBe(TAG_STATE.INCLUDED);
  });

  it("still shows the ancestors above it as containing a choice", () => {
    expect(stateOf(chosen, 1)).toBe(TAG_STATE.CONTAINS);
  });
});

describe("an exclusion with nothing included above it", () => {
  // "The whole archive except שמות" — a legitimate request, and one the state
  // model has to describe even before the server is asked whether it allows it.
  it("still marks the node and its subtree as out", () => {
    expect(stateOf(sel([], [5]), 5)).toBe(TAG_STATE.EXCLUDED);
    expect(stateOf(sel([], [5]), 6)).toBe(TAG_STATE.INHERITED_EXCLUDED);
  });

  it("shows the ancestors as containing a decision, so it can be found again", () => {
    expect(stateOf(sel([], [5]), 2)).toBe(TAG_STATE.CONTAINS);
  });
});

describe("what the filter is actually asking for", () => {
  it("counts an inherited node as asked for", () => {
    expect(isEffectivelyIncluded(rel, sel([2]), 4)).toBe(true);
  });

  it("does not count an excluded one", () => {
    expect(isEffectivelyIncluded(rel, sel([2], [5]), 6)).toBe(false);
  });

  it("does not count a node nobody has said anything about", () => {
    expect(isEffectivelyIncluded(rel, sel([2]), 9)).toBe(false);
  });

  // A branch with a hole in it must not go on claiming to be the whole branch.
  it("sees a branch with an exclusion inside it as partial", () => {
    expect(isPartiallyIncluded(rel, sel([2], [5]), 2)).toBe(true);
  });

  it("sees an untouched branch as whole", () => {
    expect(isPartiallyIncluded(rel, sel([2]), 2)).toBe(false);
  });

  it("is not partial where it is not included at all", () => {
    expect(isPartiallyIncluded(rel, sel([], [5]), 2)).toBe(false);
  });
});

// ── One click at a time ─────────────────────────────────────────────────────
//
// A chip is a checkbox over a tree. Which two positions it moves between depends
// on what is already true of the node, and that is the server's rule showing
// through: choices under one heading are alternatives, so choosing a parasha
// inside a chosen book would add nothing to the request — the book already
// covers it. What somebody standing there wants is to take it OUT.

describe("clicking a tag", () => {
  it("chooses one nobody has said anything about", () => {
    expect(cycleTagDecision(rel, sel(), 5)).toEqual({ includedIds: [5], excludedIds: [] });
  });

  it("un-chooses one it chose", () => {
    expect(cycleTagDecision(rel, sel([5]), 5)).toEqual({ includedIds: [], excludedIds: [] });
  });

  // Bug 1, in one click, which is what the person who reported it expected: a
  // child selected through its parent gets un-selected.
  it("takes a child out of the branch that selected it", () => {
    const next = cycleTagDecision(rel, sel([2]), 5); // תורה chosen, click שמות
    expect(next).toEqual({ includedIds: [2], excludedIds: [5] });
    expect(stateOf(next, 5)).toBe(TAG_STATE.EXCLUDED);
    expect(stateOf(next, 6)).toBe(TAG_STATE.INHERITED_EXCLUDED); // and בא with it
    expect(stateOf(next, 3)).toBe(TAG_STATE.INHERITED); // בראשית untouched
  });

  it("puts it back on the next click", () => {
    let selection = sel([2]);
    selection = cycleTagDecision(rel, selection, 5);
    selection = cycleTagDecision(rel, selection, 5);
    expect(selection).toEqual({ includedIds: [2], excludedIds: [] });
    expect(stateOf(selection, 5)).toBe(TAG_STATE.INHERITED);
  });

  it("returns to where it started after two clicks, wherever it started", () => {
    for (const start of [sel(), sel([2]), sel([2], [9]), sel([], [9])]) {
      const round = cycleTagDecision(rel, cycleTagDecision(rel, start, 5), 5);
      expect(round).toEqual(start);
    }
  });

  // The server refuses an id that is chosen and excluded at once.
  it("never leaves a tag in both lists", () => {
    let selection = sel([2]);
    for (let i = 0; i < 7; i += 1) {
      selection = cycleTagDecision(rel, selection, 5);
      expect(selection.includedIds.filter((id) => selection.excludedIds.includes(id))).toEqual([]);
    }
  });

  it("leaves every other tag's decision alone", () => {
    const next = cycleTagDecision(rel, sel([2], [9]), 4);
    expect(next.includedIds).toContain(2);
    expect(next.excludedIds).toContain(9);
  });

  // A tag under an excluded branch is out; clicking it asks for it back, and the
  // exclusion that was swallowing it has to go — the server removes an excluded
  // subtree outright and cannot put part of it back.
  it("brings back a tag that an excluded branch had swallowed", () => {
    const next = cycleTagDecision(rel, sel([2], [5]), 6); // בא, inside excluded שמות
    expect(next.excludedIds).toEqual([]);
    expect(next.includedIds).toContain(6);
  });
});

describe("forgetting a tag", () => {
  it("removes it whether it was chosen or left out", () => {
    expect(forgetTag(rel, sel([5]), 5)).toEqual({ includedIds: [], excludedIds: [] });
    expect(forgetTag(rel, sel([], [5]), 5)).toEqual({ includedIds: [], excludedIds: [] });
  });

  // What separates it from a click on the chip: one more of those on an excluded
  // tag brings it back INTO the filter, which is not what "remove" means.
  it("never turns an exclusion into a choice", () => {
    expect(forgetTag(rel, sel([], [5]), 5).includedIds).toEqual([]);
  });

  it("leaves the other decisions in place", () => {
    expect(forgetTag(rel, sel([2, 9], [4]), 9)).toEqual({ includedIds: [2], excludedIds: [4] });
  });
});

// ── Decisions that cannot both be true ──────────────────────────────────────
//
// Arrangements the server cannot answer the way the screen would suggest. None
// of them errors: each returns the wrong rows, quietly. They are resolved when
// the decision is made rather than reported afterwards, because there is nothing
// a user could do about a warning that their filter contradicts itself.

describe("choosing a branch that already holds a choice", () => {
  // Under "OR inside a heading" the broader choice already covers the narrower
  // one, so the inner chip could never change a result.
  it("drops the choice inside it", () => {
    const next = applyDecision(rel, sel([4]), 2, "included"); // וירא chosen, then תורה
    expect(next.includedIds).toEqual([2]);
  });

  it("drops every choice inside it, however deep", () => {
    const next = applyDecision(rel, sel([3, 4, 5]), 2, "included");
    expect(next.includedIds).toEqual([2]);
  });

  it("leaves choices in other branches alone", () => {
    const next = applyDecision(rel, sel([9]), 2, "included");
    expect(next.includedIds.sort()).toEqual([2, 9]);
  });
});

describe("excluding", () => {
  it("drops a choice inside what is being removed", () => {
    const next = applyDecision(rel, sel([2, 6]), 5, "excluded");
    expect(next.includedIds).toEqual([2]);
    expect(next.excludedIds).toEqual([5]);
  });

  it("drops an exclusion inside another exclusion, which could never remove a row", () => {
    const next = applyDecision(rel, sel([], [6]), 5, "excluded");
    expect(next.excludedIds).toEqual([5]);
  });

  it("keeps the choice it is carved out of", () => {
    const next = applyDecision(rel, sel([2]), 5, "excluded");
    expect(next.includedIds).toEqual([2]);
  });
});

describe("choosing something inside an exclusion", () => {
  // The server removes an excluded subtree outright and has no notion of putting
  // part of it back, so this pair would answer with an archive missing the very
  // tag whose chip says it was chosen.
  it("lifts the exclusion that would have swallowed it", () => {
    const next = applyDecision(rel, sel([2], [5]), 6, "included");
    expect(next.excludedIds).toEqual([]);
    expect(next.includedIds.sort()).toEqual([2, 6]);
  });

  it("leaves exclusions that have nothing to do with it", () => {
    const next = applyDecision(rel, sel([], [9]), 6, "included");
    expect(next.excludedIds).toEqual([9]);
  });
});

describe("a tag is never in both lists", () => {
  it("moves rather than copies, whichever direction it is going", () => {
    expect(applyDecision(rel, sel([5]), 5, "excluded")).toEqual({
      includedIds: [],
      excludedIds: [5],
    });
    expect(applyDecision(rel, sel([], [5]), 5, "included")).toEqual({
      includedIds: [5],
      excludedIds: [],
    });
  });
});

// ── Counting them ───────────────────────────────────────────────────────────
//
// Bug 2: choosing תורה said "1 tag" while the filter was asking for the whole
// branch. One tag chosen and five tags asked for are both true and they answer
// different questions, so both are counted — separately, and each where it
// belongs.

describe("how many tags the filter asks for", () => {
  it("counts a chosen branch as itself plus everything under it", () => {
    expect(countUnder(rel, sel([2]), 2)).toBe(5);
  });

  it("stops counting a subtree that has been taken out", () => {
    expect(countUnder(rel, sel([2], [5]), 2)).toBe(3);
  });

  it("counts a leaf as one", () => {
    expect(countUnder(rel, sel([4]), 4)).toBe(1);
  });

  it("counts what an exclusion removes, on the same terms", () => {
    expect(countUnder(rel, sel([2], [5]), 5, "excluded")).toBe(2);
  });

  it("counts nothing where there is no decision", () => {
    expect(countUnder(rel, sel([2]), 9)).toBe(0);
  });

  it("totals both directions over the whole vocabulary", () => {
    expect(effectiveTagCounts(rel, sel([2], [5]))).toEqual({ included: 3, excluded: 2 });
    expect(effectiveTagCounts(rel, sel())).toEqual({ included: 0, excluded: 0 });
  });

  // The other question, and the reason it is a separate number: the badge on the
  // filter button says how many controls are narrowing the view.
  it("counts the decisions separately from the tags they reach", () => {
    expect(decisionCount(sel([2], [5]))).toBe(2);
    expect(decisionCount(sel())).toBe(0);
    expect(effectiveTagCounts(rel, sel([2], [5])).included).toBeGreaterThan(
      decisionCount(sel([2], [5]))
    );
  });
});

// ── Selections that did not come from a click ───────────────────────────────

describe("normalising a selection built somewhere else", () => {
  it("resolves it to what a sequence of clicks would have produced", () => {
    const messy = { includedIds: [4, 2, 6], excludedIds: [5, 6] };
    const clean = normalizeSelection(rel, messy);
    expect(clean.includedIds.some((id) => clean.excludedIds.includes(id))).toBe(false);
    for (const id of clean.includedIds) {
      expect(clean.excludedIds.some((x) => rel.descendantsOf(x).includes(id))).toBe(false);
    }
  });

  // A choice inside a choice cannot come from a click any more — the click takes
  // it out instead — but a URL can still say it, and it means nothing the
  // broader choice does not already say.
  it("drops a choice covered by a broader one, whichever order they arrive in", () => {
    expect(normalizeSelection(rel, { includedIds: [2, 5], excludedIds: [] }).includedIds).toEqual([2]);
    expect(normalizeSelection(rel, { includedIds: [5, 2], excludedIds: [] }).includedIds).toEqual([2]);
  });

  // Reachable by clicking is the definition of canonical, and no sequence of
  // clicks can nest one exclusion inside another.
  it("collapses an exclusion nested inside another to the outer one", () => {
    expect(normalizeSelection(rel, { includedIds: [], excludedIds: [5, 6] }).excludedIds).toEqual([5]);
    expect(normalizeSelection(rel, { includedIds: [], excludedIds: [6, 5] }).excludedIds).toEqual([5]);
  });

  it("leaves an already-canonical selection exactly as it is", () => {
    const canonical = sel([2], [5]);
    expect(sameSelection(normalizeSelection(rel, canonical), canonical)).toBe(true);
  });

  it("has nothing to do to an empty selection", () => {
    expect(normalizeSelection(rel, sel())).toEqual({ includedIds: [], excludedIds: [] });
  });

  // The order the fold applies the two lists in is a decision, not an accident:
  // a restored selection has no "later", so it is chosen to agree with a click.
  it("keeps the choice and lifts the exclusion around it, exactly as clicking does", () => {
    const restored = normalizeSelection(rel, { includedIds: [6], excludedIds: [5] });
    const clicked = applyDecision(rel, sel([], [5]), 6, "included");
    expect(restored).toEqual(clicked);
    expect(restored.includedIds).toEqual([6]);
    expect(restored.excludedIds).toEqual([]);
  });

  it("still keeps an exclusion carved out of a branch above it", () => {
    expect(normalizeSelection(rel, { includedIds: [2], excludedIds: [5] })).toEqual({
      includedIds: [2],
      excludedIds: [5],
    });
  });
});

describe("tags the vocabulary no longer holds", () => {
  // Deleted while it sat in somebody's filter: no name to draw a chip with, and
  // an archive that comes back empty for a reason nothing on screen states.
  it("drops an id that is not in the tree", () => {
    expect(pruneUnknownTags(rel, sel([2, 999], [888]))).toEqual({
      includedIds: [2],
      excludedIds: [],
    });
  });

  // The taxonomy arrives in its own request. Pruning against an empty tree on the
  // first render would erase a filter that is perfectly valid.
  it("does nothing at all while the tree is still loading", () => {
    const empty = buildTagRelations([]);
    const selection = sel([2, 999]);
    expect(pruneUnknownTags(empty, selection)).toBe(selection);
  });

  it("leaves a selection it recognises untouched", () => {
    expect(pruneUnknownTags(rel, sel([2], [5]))).toEqual({ includedIds: [2], excludedIds: [5] });
  });
});

describe("comparing two selections", () => {
  it("ignores the order the decisions were made in", () => {
    expect(sameSelection(sel([2, 5]), sel([5, 2]))).toBe(true);
  });

  it("sees a difference in either list", () => {
    expect(sameSelection(sel([2]), sel([2], [5]))).toBe(false);
    expect(sameSelection(sel([2]), sel([5]))).toBe(false);
  });

  it("treats a missing selection as empty rather than crashing", () => {
    expect(sameSelection(undefined, sel())).toBe(true);
  });
});

// ── How chosen tags combine ─────────────────────────────────────────────────
//
// This models the server's rule so the two can be compared here rather than only
// in production: choices under ONE heading are alternatives, choices under
// different headings are conditions. The group used to model AND across every
// choice, and pinned the consequence — "choosing all the children finds
// NOTHING" — as though it were a law. It was a symptom, and it is what the
// heading rule replaced.

const headingOf = (id) => rel.ancestorsOf(id)[0] ?? id;

const matches = (chosenIds, itemTagIds) => {
  const covers = (chosen, itemTag) =>
    chosen === itemTag || rel.descendantsOf(chosen).includes(itemTag);
  const headings = new Set(chosenIds.map(headingOf));
  const satisfied = new Set(
    chosenIds
      .filter((chosen) => itemTagIds.some((itemTag) => covers(chosen, itemTag)))
      .map(headingOf)
  );
  return satisfied.size === headings.size;
};

describe("what the server does with several chosen tags", () => {
  it("finds an item tagged with a leaf under the branch chosen", () => {
    expect(matches([2], [4])).toBe(true);
  });

  // The request that could not be made before, and the reason the rule changed:
  // two parashot are alternatives, not a demand for a shiur on both.
  it("treats two choices under one heading as alternatives", () => {
    expect(matches([3, 5], [4])).toBe(true); // בראשית or שמות, item is in בראשית
    expect(matches([3, 5], [6])).toBe(true); // ... or in שמות
    expect(matches([3, 5], [9])).toBe(false); // and מוסר is neither
  });

  // Which is what "choosing all the children" now does — it used to find nothing
  // at all, and that emptiness read as a broken filter.
  it("finds everything under a branch when every child of it is chosen", () => {
    expect(matches([3, 5], [4])).toBe(true);
  });

  it("still treats two headings as conditions, both of which must hold", () => {
    expect(matches([1, 9], [4])).toBe(false); // תנ"ך and מוסר, item only in תנ"ך
    expect(matches([1, 9], [4, 9])).toBe(true); // tagged in both
  });

  // Ancestors are compatible with each other — all of them are satisfied by the
  // one leaf — which is why walking down and choosing as you go is safe.
  it("is satisfied by one leaf for a whole ancestor chain", () => {
    expect(matches([1, 2, 3, 4], [4])).toBe(true);
  });
});
