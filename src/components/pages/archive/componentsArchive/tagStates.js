// The tag filter's selection model, and the state it puts each node of the
// taxonomy in.
//
// ── Why this is a module and not part of the drill-down ─────────────────────
//
// It lived inside TagDrilldown.jsx, and a second, hand-copied version of it
// lived in tagStates.test.js — copied because the component is JSX and this is
// arithmetic, and importing it would have dragged jsdom into a test that needs
// none. Two copies of a rule is one rule and one piece of fiction: the test can
// go on passing over logic the screen no longer runs. This is that rule, once,
// in plain JavaScript, imported by both.
//
// ── Two decisions, six states ───────────────────────────────────────────────
//
// A node carries at most ONE decision from the user, and only decisions are
// stored:
//
//   included    "show me this branch"
//   excluded    "...but not this part of it"
//   (neither)   the user has said nothing about this node
//
// Everything else on screen is DERIVED from those decisions and the shape of the
// tree:
//
//   inherited          an ancestor is included, so this is already in the filter
//   inheritedExcluded  an ancestor is excluded, so this is already out of it
//   contains           a decision was made somewhere BELOW this node
//   none               nothing on it, above it or below it
//
// Deriving rather than storing is what keeps the display honest: a chip cannot
// come to say something different from what is actually being asked for,
// because it is computed from the request every render.
//
// ── How chosen tags combine, and why exclusion exists ───────────────────────
//
// Choices under ONE heading are alternatives; choices under different headings
// are conditions. "בהר or בחוקותי" is one heading and reads as OR; "something in
// תנ"ך that is also about מוסר" is two and reads as AND. The server applies
// exactly that rule — see servicesMedia.js — and this file has to describe the
// same thing or the chips will promise results the query does not return.
//
// It was AND across every chosen tag, and that made the commonest request
// impossible: two parashot asked for a shiur on both, of which there are almost
// none, so the archive came back empty and the filter read as broken.
//
// Exclusion survives that change, because OR cannot express "everything in תורה
// EXCEPT שמות" either — naming the four books to keep says something different
// (it is satisfied by any one of them, including items in none of the others),
// and nothing at all can say "not this part". Taking a child out of a chosen
// branch is a decision of its own, not the absence of one.
//
// ── The nearest ancestor wins ───────────────────────────────────────────────
//
// Include תורה, exclude שמות: every parasha under שמות has to read as out while
// every parasha under בראשית reads as in — and both have an included ancestor
// AND an excluded one. "Does any ancestor include this" cannot answer that. The
// CLOSEST ancestor carrying a decision is the one that applies, which is also
// what would let a branch be re-included inside an excluded one without the rule
// changing.

export const TAG_STATE = {
  INCLUDED: "included",
  EXCLUDED: "excluded",
  INHERITED: "inherited",
  INHERITED_EXCLUDED: "inheritedExcluded",
  CONTAINS: "contains",
  NONE: "none",
};

// The shape every function here takes. Two lists rather than one list with signs
// in it: they travel to the server as two separate query parameters, so a signed
// list would have to be taken apart again at the boundary.
export const EMPTY_SELECTION = { includedIds: [], excludedIds: [] };

/**
 * Both directions of the tree, precomputed once.
 *
 * Per chip the level being rendered asks "who is above you" and "who is below
 * you", and the tree does not change between clicks — so the walk happens once
 * per tree rather than once per question.
 *
 * `ancestorsOf` is ROOT FIRST, so the last element is the immediate parent. Two
 * callers depend on that order: the nearest-ancestor rule reads it backwards,
 * and the path shown beside a search result reads it forwards.
 */
export const buildTagRelations = (nodes = []) => {
  const byId = new Map();
  const byParent = new Map();
  for (const node of nodes) {
    byId.set(node.id, node);
    const key = node.parent_id ?? "root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(node);
  }

  const ancestors = new Map();
  const descendants = new Map();
  const walk = (node, chain) => {
    ancestors.set(node.id, chain);
    const below = [];
    for (const kid of byParent.get(node.id) || []) {
      below.push(kid.id, ...walk(kid, [...chain, node.id]));
    }
    descendants.set(node.id, below);
    return below;
  };
  for (const root of byParent.get("root") || []) walk(root, []);

  return {
    nodes,
    byId,
    byParent,
    childrenOf: (id) => byParent.get(id) || [],
    ancestorsOf: (id) => ancestors.get(id) || [],
    descendantsOf: (id) => descendants.get(id) || [],
  };
};

// The two lists as sets, tolerating whatever the caller happens to hold: a
// selection arrives from component props and, later, from the URL, and neither
// is guaranteed to be there on the first render.
const decisionsOf = (selection) => ({
  included: new Set(selection?.includedIds || []),
  excluded: new Set(selection?.excludedIds || []),
});

/**
 * The decision that actually governs a node: its own if it has one, otherwise
 * its nearest ancestor's, otherwise none. Returns "included", "excluded" or
 * null.
 *
 * This is the primitive the rest of the file is written on — every question
 * about a node reduces to it.
 *
 * A node included UNDER an excluded ancestor keeps its own decision here, and
 * that combination is one the server cannot honour, since an exclusion removes a
 * whole subtree. Reporting it faithfully is deliberate: resolving it belongs to
 * the normalisation step, not to a function whose job is to say what the user
 * asked for.
 */
export const governingDecision = (relations, selection, id) => {
  const { included, excluded } = decisionsOf(selection);
  if (excluded.has(id)) return "excluded";
  if (included.has(id)) return "included";
  const chain = relations.ancestorsOf(id);
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    if (excluded.has(chain[i])) return "excluded";
    if (included.has(chain[i])) return "included";
  }
  return null;
};

/**
 * Which of the six states a node is in — the one question every chip asks.
 */
export const tagStateOf = (relations, selection, id) => {
  const { included, excluded } = decisionsOf(selection);
  if (excluded.has(id)) return TAG_STATE.EXCLUDED;
  if (included.has(id)) return TAG_STATE.INCLUDED;

  const governing = governingDecision(relations, selection, id);
  if (governing === "excluded") return TAG_STATE.INHERITED_EXCLUDED;
  if (governing === "included") return TAG_STATE.INHERITED;

  const below = relations.descendantsOf(id);
  if (below.some((d) => included.has(d) || excluded.has(d))) return TAG_STATE.CONTAINS;
  return TAG_STATE.NONE;
};

/**
 * Whether the filter currently asks for this node — by its own decision or an
 * inherited one, with no regard for which.
 *
 * A count of "how many tags are selected" has to be built on this, and so does
 * telling a fully included branch from one with a hole in it.
 */
export const isEffectivelyIncluded = (relations, selection, id) =>
  governingDecision(relations, selection, id) === "included";

/**
 * An included branch with a hole in it — the state a parent chip has to show
 * once one of its children has been taken out, so that תורה does not go on
 * claiming to be the whole of תורה.
 */
export const isPartiallyIncluded = (relations, selection, id) => {
  if (!isEffectivelyIncluded(relations, selection, id)) return false;
  const { excluded } = decisionsOf(selection);
  return relations.descendantsOf(id).some((d) => excluded.has(d));
};

// ── What one click does ─────────────────────────────────────────────────────
//
// A chip is a checkbox over a tree, and it behaves like one:
//
//   nothing         → chosen
//   chosen          → nothing
//   inside a chosen branch → taken out of it
//   taken out       → back in
//
// Two positions, not three, and which two depends on what is already true of the
// node. That is the difference the server's rule makes. Choices under one
// heading are alternatives now — "בהר or בחוקותי" — so choosing a parasha inside
// a chosen book adds nothing to the request: the book already includes it, and
// the click would be a control that changes no rows. What somebody standing on
// that parasha actually wants is to take it OUT, which is what the click does,
// in one press rather than two.
//
// This is also what the bug that started all of this asked for, stated plainly:
// clicking a child that is selected through its parent un-selects it.

/**
 * Where one more click takes a tag: "included", "excluded" or null to forget it.
 *
 * A decision the node holds ITSELF is undone — that is what clicking a checkbox
 * you ticked does. A node that is in the filter only because a branch above it
 * is chosen has nothing of its own to undo, so the click takes it out instead.
 */
const nextPosition = (relations, selection, id) => {
  if ((selection?.includedIds || []).includes(id)) return null;
  if ((selection?.excludedIds || []).includes(id)) return null;
  if (isEffectivelyIncluded(relations, selection, id)) return "excluded";
  return "included";
};

// ── Decisions that cannot both be true ──────────────────────────────────────
//
// Three arrangements of the two lists that the server cannot answer the way the
// screen would suggest. None of them errors: each returns the wrong number of
// rows, quietly, which is the failure this whole feature has been chasing.
//
//   1. A choice and a choice beneath it — [תורה, וירא]
//      Chosen tags combine with AND and each matches its own subtree, so
//      anything matching וירא already matches תורה. The pair is exactly [וירא],
//      and the תורה chip is a control that appears to do nothing. Clicking the
//      ANCESTOR to broaden shows it worst: the click cannot change a single row
//      while the descendant stays.
//
//   2. An exclusion and an exclusion beneath it — [−שמות, −בא]
//      The first already removes the whole subtree; the second can never remove
//      a row.
//
//   3. A choice inside an exclusion — [תורה, −שמות, +בא]
//      The server removes an excluded subtree outright and has no notion of
//      putting part of it back. The archive comes back without בא while the chip
//      says it was chosen.
//
// So every decision is written through one function, and the decision the user
// JUST MADE always wins — the others are what get dropped. The alternative,
// keeping both and letting the newest be the inert one, is a click that does
// nothing, which is where this feature started.

// ── Why this drops DESCENDANTS and never ancestors ──────────────────────────
//
// The obvious reading of case 1 is "keep one choice per path, the deepest one",
// and it is wrong in a way worth writing down, because it was tried here first.
// It breaks the flow this whole feature exists for. Choose תורה, walk in, click
// שמות to make it a decision of its own — under that rule the תורה choice is
// dropped on the spot, so the next click excludes שמות with nothing left holding
// the branch, and "everything in תורה except שמות" comes out as "the entire
// archive except שמות". The user watched their filter turn into its opposite in
// two clicks.
//
// A choice on a DESCENDANT of an existing choice is meaningful in the moment it
// is made — it narrows, and it is the halfway house on the way to an exclusion —
// so it is kept. A choice on an ANCESTOR of one is the case that goes wrong: it
// cannot change a single row while the descendant stays, so the descendant is
// what gets dropped, and the click means what it looks like it means.
const swallows = (relations, ancestorId, id) => relations.descendantsOf(ancestorId).includes(id);

/**
 * Sets one tag's decision and resolves everything that cannot survive it.
 *
 * `decision` is "included", "excluded", or null to forget the tag. What comes
 * back is always a selection the server can answer literally.
 */
export const applyDecision = (relations, selection, id, decision) => {
  const included = (selection?.includedIds || []).filter((x) => x !== id);
  const excluded = (selection?.excludedIds || []).filter((x) => x !== id);

  if (decision === "included") {
    return {
      // Choices INSIDE the new one are covered by it — under "OR inside a
      // heading" the broader choice already includes them, so leaving them would
      // put a chip on the row that can never change a result.
      includedIds: [...included.filter((x) => !swallows(relations, id, x)), id],
      // An exclusion ABOVE the new choice would swallow it whole — the server
      // removes an excluded subtree outright and cannot put part of it back.
      // Dropping it is visible, because its chip leaves the row; letting the
      // choice be silently ignored would not be.
      excludedIds: excluded.filter((x) => !swallows(relations, x, id)),
    };
  }

  if (decision === "excluded") {
    return {
      // A choice inside what is being removed cannot survive it.
      includedIds: included.filter((x) => !swallows(relations, id, x)),
      // An exclusion inside an exclusion can never remove a row of its own.
      excludedIds: [...excluded.filter((x) => !swallows(relations, id, x)), id],
    };
  }

  return { includedIds: included, excludedIds: excluded };
};

/**
 * One click: the next position, with its consequences.
 *
 * An id therefore moves BETWEEN the lists and is never in both — the server
 * refuses that outright, since it would ask for a branch and its removal at
 * once.
 */
export const cycleTagDecision = (relations, selection, id) =>
  applyDecision(relations, selection, id, nextPosition(relations, selection, id));

/**
 * Forgetting a tag altogether, whichever list it is in.
 *
 * What a chip's × does, and deliberately NOT the cycle: one more click on an
 * excluded tag would move it into the chosen list, turning "not this branch"
 * into "only this branch" — as wrong as an answer can be, from a control whose
 * label is "remove".
 */
export const forgetTag = (relations, selection, id) =>
  applyDecision(relations, selection, id, null);

/**
 * How many tags a decision on `id` actually accounts for — the node plus
 * everything under it that the decision still reaches.
 *
 * This is the answer to "choosing תורה selected one tag?", which is what the
 * filter appeared to say while it was in fact narrowing to fifty-four of them.
 * It is counted through governingDecision rather than by measuring the subtree,
 * so an exclusion inside the branch removes its own subtree from the total
 * instead of being counted as chosen.
 */
export const countUnder = (relations, selection, id, decision = "included") =>
  [id, ...relations.descendantsOf(id)].filter(
    (nodeId) => governingDecision(relations, selection, nodeId) === decision
  ).length;

/**
 * The same count over the WHOLE vocabulary: how many tags the filter currently
 * asks for, and how many it currently rules out.
 *
 * One function, because the badge on the filter button and the chips above the
 * drill-down were computing this separately and could not stay equal — the badge
 * counted the ids in the list, the chips counted the ones it could find names
 * for, and an id whose tag had been deleted made the two disagree with no way to
 * tell which was right.
 */
export const effectiveTagCounts = (relations, selection) => {
  let included = 0;
  let excluded = 0;
  for (const node of relations.nodes) {
    const decision = governingDecision(relations, selection, node.id);
    if (decision === "included") included += 1;
    if (decision === "excluded") excluded += 1;
  }
  return { included, excluded };
};

/**
 * How many DECISIONS the user has made — the number of chips they would have to
 * take back to clear the tag filter.
 *
 * Distinct from the counts above and used in a different place: the badge on the
 * filter button answers "how many controls are narrowing what I see", and
 * fifty-four there — for one click on תורה — would read as fifty-four hidden
 * filters rather than one branch.
 */
export const decisionCount = (selection) =>
  (selection?.includedIds || []).length + (selection?.excludedIds || []).length;

// ── Selections that did not come from a click ───────────────────────────────
//
// Everything above assumes the two lists were built one decision at a time by
// the functions in this file. A selection restored from a URL was not, and a
// selection held while the vocabulary changed underneath it is no longer the one
// that was made. Both arrive here.

/**
 * The canonical form of any selection: the lists a sequence of clicks would have
 * produced.
 *
 * Folded through applyDecision rather than written a second time, so there is
 * one statement of what may coexist.
 *
 * ── Why the exclusions go first ─────────────────────────────────────────────
 *
 * Folding them last was tried, and it made the same pair of lists mean two
 * different things depending on how they arrived. `?tags=6&not=5` — בא chosen
 * inside an excluded שמות — came out as "the whole archive except שמות",
 * throwing away the one specific thing the link was written to show, while
 * making that same combination by CLICKING lifts the exclusion and keeps בא.
 *
 * A restored selection has no "later": the order here is ours to choose, so it
 * is chosen to agree with the clicks. The choice is also the more specific half
 * of the request — somebody shared a link to see בא — and dropping it is a far
 * bigger change to what they asked for than dropping the exclusion around it.
 */
export const normalizeSelection = (relations, selection) => {
  let result = EMPTY_SELECTION;
  for (const id of selection?.excludedIds || []) {
    // An exclusion already covered by one further up is unreachable by clicking
    // — the cycle offers "put it back", never "remove it twice" — so a restored
    // selection must not be able to hold one either. Skipped rather than
    // applied, because applying it would keep the outer exclusion (a later
    // decision only drops what is INSIDE it) and leave a second chip on the row
    // that can never remove a row of its own.
    const alreadyOut = result.excludedIds.some((x) => relations.descendantsOf(x).includes(id));
    if (alreadyOut) continue;
    result = applyDecision(relations, result, id, "excluded");
  }
  for (const id of selection?.includedIds || []) {
    // A choice inside another choice adds nothing: under "OR inside a heading"
    // the broader one already covers it, so a restored selection must not hold
    // both — the inner chip could never change a row.
    const alreadyIn = result.includedIds.some((x) => relations.descendantsOf(x).includes(id));
    if (alreadyIn) continue;
    result = applyDecision(relations, result, id, "included");
  }
  return result;
};

/**
 * Drops ids the vocabulary no longer holds.
 *
 * A tag can be deleted while it sits in somebody's filter, and a filter naming a
 * tag that no longer exists is the quietest kind of empty archive: the chip row
 * cannot draw it — there is no name to draw — while the count still counts it
 * and the server answers, honestly, that nothing carries it.
 *
 * An empty tree means "not loaded yet", NOT "no tags exist": the taxonomy
 * arrives in its own request, and pruning against it before it lands would erase
 * a perfectly good filter on the first render. Stated here rather than left to
 * each caller to remember.
 */
export const pruneUnknownTags = (relations, selection) => {
  if (!relations.nodes || relations.nodes.length === 0) return selection;
  const known = (id) => relations.byId.has(id);
  return {
    includedIds: (selection?.includedIds || []).filter(known),
    excludedIds: (selection?.excludedIds || []).filter(known),
  };
};

/**
 * Whether two selections say the same thing.
 *
 * Needed because normalising runs on every change: a selection that was already
 * canonical must be recognised as unchanged, or setting it would start a render
 * that normalises again, forever.
 */
export const sameSelection = (a, b) =>
  (a?.includedIds || []).length === (b?.includedIds || []).length &&
  (a?.excludedIds || []).length === (b?.excludedIds || []).length &&
  (a?.includedIds || []).every((id) => (b?.includedIds || []).includes(id)) &&
  (a?.excludedIds || []).every((id) => (b?.excludedIds || []).includes(id));
