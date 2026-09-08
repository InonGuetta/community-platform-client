// @vitest-environment jsdom
import { it, expect, describe, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagDrilldown from "./TagDrilldown";

// What the drill-down does that arithmetic cannot check.
//
// The states themselves are pinned in tagStates.test.js, which needs no browser.
// This file is for the two things that only exist once the component is on a
// screen: that a chip reports the click it was given, and that SEARCHING —
// which replaces the level view with matches from the whole tree — behaves like
// the navigation it replaces.
//
// The search path is worth a test of its own because both of its failures were
// silent. Opening a branch from a search result appended it to whatever path the
// user happened to be standing on, so the breadcrumb named a parent that was not
// its parent; and the level below never appeared at all, because the view goes
// on showing matches while a search term is set. The arrow did nothing, and
// nothing on screen said why.

// תנ"ך → תורה → בראשית → וירא, plus a second book with a parasha inside it, and
// an unrelated root with a child of its own — needed so the test can stand
// somewhere else in the tree before searching.
const TREE = [
  { id: 1, name: 'תנ"ך', parent_id: null, media_count: 40 },
  { id: 2, name: "תורה", parent_id: 1, media_count: 30 },
  { id: 3, name: "בראשית", parent_id: 2, media_count: 12 },
  { id: 4, name: "וירא", parent_id: 3, media_count: 4 },
  { id: 5, name: "שמות", parent_id: 2, media_count: 10 },
  { id: 6, name: "בא", parent_id: 5, media_count: 3 },
  { id: 9, name: "מוסר", parent_id: null, media_count: 7 },
  { id: 10, name: "מידות", parent_id: 9, media_count: 2 },
];

const draw = (props = {}) => {
  const onCycle = vi.fn();
  render(<TagDrilldown nodes={TREE} onCycle={onCycle} {...props} />);
  return { onCycle, user: userEvent.setup() };
};

const search = async (user, term) => {
  await user.type(screen.getByPlaceholderText("חיפוש תגית..."), term);
};

describe("walking the tree", () => {
  it("opens at the roots, not at the whole vocabulary", () => {
    draw();
    expect(screen.getByText('תנ"ך')).toBeDefined();
    expect(screen.getByText("מוסר")).toBeDefined();
    // Two levels down, and therefore not on screen.
    expect(screen.queryByText("וירא")).toBeNull();
  });

  it("reports a click as the tag that was clicked", async () => {
    const { onCycle, user } = draw();
    await user.click(screen.getByText("מוסר"));
    expect(onCycle).toHaveBeenCalledWith(9);
  });

  it("descends one level when the arrow is used", async () => {
    const { user } = draw();
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByText("תורה")).toBeDefined();
  });
});

describe("searching the vocabulary", () => {
  // One letter matches most of a few hundred nodes and is not a search.
  it("keeps showing the level until there are two characters", async () => {
    const { user } = draw();
    await search(user, "ו");
    expect(screen.queryByText("וירא")).toBeNull();
  });

  it("finds a tag three levels down and says where it lives", async () => {
    const { user } = draw();
    await search(user, "ויר");
    expect(screen.getByText("וירא")).toBeDefined();
    // The path is what tells two identically-named tags apart.
    expect(screen.getByText(/תנ"ך ← תורה ← בראשית/)).toBeDefined();
  });

  it("says so when nothing matches", async () => {
    const { user } = draw();
    await search(user, "זזזז");
    expect(screen.getByText(/לא נמצאה תגית/)).toBeDefined();
  });

  it("reports a click on a search result like any other", async () => {
    const { onCycle, user } = draw();
    await search(user, "ויר");
    await user.click(screen.getByText("וירא"));
    expect(onCycle).toHaveBeenCalledWith(4);
  });

  // The two silent failures, one test each.
  it("opening a branch from a result shows what is inside it", async () => {
    const { user } = draw();
    await search(user, "שמו");
    await user.click(screen.getByRole("button", { name: "פתיחת שמות" }));
    // The level below, which the lingering search term used to hide.
    expect(screen.getByText("בא")).toBeDefined();
    expect(screen.getByPlaceholderText("חיפוש תגית...").value).toBe("");
  });

  it("puts the branch in its real place, not after wherever the user was", async () => {
    const { user } = draw();
    // Standing inside an unrelated branch when the search is made.
    await user.click(screen.getByRole("button", { name: "פתיחת מוסר" }));
    await search(user, "שמו");
    await user.click(screen.getByRole("button", { name: "פתיחת שמות" }));

    // The breadcrumb names the ancestors it actually has.
    expect(screen.getByText("תורה")).toBeDefined();
    expect(screen.queryByText("מוסר")).toBeNull();
  });
});

describe("what the states look like", () => {
  it("shows a chosen branch and everything under it as part of the filter", async () => {
    const { user } = draw({ selectedIds: [2] });
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByText("תורה").closest("[data-tag-state]").getAttribute("data-tag-state")).toBe(
      "included"
    );
  });

  // Bug 2, as the number on the screen: one click, and the chip says how many
  // tags it actually accounts for once part of the branch has been taken out.
  it("counts what a partially-chosen branch still holds", async () => {
    const { user } = draw({ selectedIds: [2], excludedIds: [5] });
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    // תורה, בראשית, וירא — שמות and בא are out.
    expect(screen.getByText("(3)")).toBeDefined();
    expect(screen.getByText("תורה").closest("[data-tag-state]").getAttribute("data-tag-state")).toBe(
      "partial"
    );
  });

  // B4: the item count comes from the server and counts the whole subtree with
  // no filter applied. Once part of the branch is excluded it is an upper bound.
  it("marks the item count as approximate once part of the branch is out", async () => {
    const { user } = draw({ selectedIds: [2], excludedIds: [5] });
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByText("~30")).toBeDefined();
  });

  it("leaves the count alone while the branch is whole", async () => {
    const { user } = draw({ selectedIds: [2] });
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByText("30")).toBeDefined();
    expect(screen.queryByText("~30")).toBeNull();
  });

  // The states have to read the same wherever a chip is drawn — a tag found by
  // searching is the same tag, and its mark is computed from the same rule.
  it("draws an excluded tag as excluded in the search results too", async () => {
    const { user } = draw({ selectedIds: [2], excludedIds: [5] });
    await search(user, "שמו");
    const chip = screen.getByText("שמות").closest("[data-tag-state]");
    expect(chip.getAttribute("data-tag-state")).toBe("excluded");
  });

  it("draws a tag under an excluded branch as out as well", async () => {
    const { user } = draw({ selectedIds: [2], excludedIds: [5] });
    await search(user, "בא");
    const chip = screen.getByText("בא").closest("[data-tag-state]");
    expect(chip.getAttribute("data-tag-state")).toBe("inheritedExcluded");
  });
});

// ── What the chips say out loud ─────────────────────────────────────────────
//
// Every state was announced as the same bare tag name, because a chip's meaning
// lived entirely in a colour and a fourteen-pixel icon. "Chosen" and "excluded"
// are opposite instructions, and a screen reader read them out identically.

describe("a chip says which state it is in", () => {
  it("names an untouched tag and what a click would do", () => {
    draw();
    expect(screen.getByRole("button", { name: /מוסר.*לא נבחר.*לחיצה בוחרת/ })).toBeDefined();
  });

  it("names a chosen tag and the fact that the next click un-chooses it", async () => {
    const { user } = draw({ selectedIds: [2] });
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByRole("button", { name: /תורה.*נבחר.*לחיצה מבטלת/ })).toBeDefined();
  });

  // A tag in the filter through a branch above it: the click takes it OUT, and
  // saying so is the whole reason the state is announced at all.
  it("tells an inherited tag that a click removes it from the branch", async () => {
    const { user } = draw({ selectedIds: [1] });
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByRole("button", { name: /תורה.*לחיצה מוציאה אותו מהסינון/ })).toBeDefined();
  });

  it("names an excluded tag as excluded, not merely as a tag", async () => {
    const { user } = draw({ selectedIds: [2], excludedIds: [5] });
    await search(user, "שמו");
    expect(screen.getByRole("button", { name: /שמות.*הוצא מהסינון/ })).toBeDefined();
  });

  it("says how many tags a partially-chosen branch still holds", async () => {
    const { user } = draw({ selectedIds: [2], excludedIds: [5] });
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByRole("button", { name: /תורה.*נבחר חלקית, 3 תגיות/ })).toBeDefined();
  });

  // Two tags share a name in the real taxonomy, so the name alone is ambiguous
  // exactly where it matters most.
  it("says where a tag found by searching lives", async () => {
    const { user } = draw();
    await search(user, "ויר");
    expect(screen.getByRole("button", { name: /וירא.*בתוך תנ"ך ← תורה ← בראשית/ })).toBeDefined();
  });
});

describe("getting back up the tree without a mouse", () => {
  // It was clickable text: no tab stop, no Enter, nothing announced. The only
  // way back up a four-level tree was to point at it.
  it("offers the way back as a real button", async () => {
    const { user } = draw();
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    const up = screen.getByRole("button", { name: "חזרה לכל התגיות" });
    await user.click(up);
    expect(screen.getByText("מוסר")).toBeDefined();
  });

  it("marks the level being shown as where you are", async () => {
    const { user } = draw();
    await user.click(screen.getByRole("button", { name: 'פתיחת תנ"ך' }));
    expect(screen.getByRole("button", { name: 'תנ"ך' }).getAttribute("aria-current")).toBe(
      "location"
    );
  });

  it("has nothing to go back to at the top", () => {
    draw();
    expect(screen.getByRole("button", { name: "חזרה לכל התגיות" }).disabled).toBe(true);
  });
});

describe("a search that matches too much", () => {
  // Forty chips with nothing to indicate a forty-first leaves somebody looking
  // for a tag that was found and not shown.
  it("says how many of the matches are on screen", async () => {
    const many = Array.from({ length: 45 }, (_, i) => ({
      id: 100 + i,
      name: `נושא ${i}`,
      parent_id: null,
      media_count: 1,
    }));
    const onCycle = vi.fn();
    render(<TagDrilldown nodes={many} onCycle={onCycle} />);
    const user = userEvent.setup();
    await search(user, "נושא");
    expect(screen.getByText(/מוצגות 40 מתוך 45/)).toBeDefined();
  });

  it("says nothing when everything found is shown", async () => {
    const { user } = draw();
    await search(user, "ויר");
    expect(screen.queryByText(/מוצגות/)).toBeNull();
  });
});
