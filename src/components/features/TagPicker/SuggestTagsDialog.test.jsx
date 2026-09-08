// @vitest-environment jsdom
import { it, expect, describe, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuggestTagsDialog from "./SuggestTagsDialog";

// The question asked right after an upload.
//
// It exists because the archive reached nineteen items with not one tagged row:
// tagging was optional on the form and nothing ever asked again. What is worth
// pinning here is the shape of the offer — suggestions pre-accepted so the work
// is un-ticking rather than ticking, each one showing WHY it was made, and
// skipping being a real answer rather than a dead end.

const TREE = [
  { id: 1, name: 'תנ"ך', parent_id: null },
  { id: 2, name: "תורה", parent_id: 1 },
  { id: 3, name: "בראשית", parent_id: 2 },
  { id: 15, name: "ויחי", parent_id: 3 },
  { id: 220, name: "חיזוק כללי", parent_id: null },
];

const SUGGESTIONS = [
  { id: 15, name: "ויחי", path: 'תנ"ך ← תורה ← בראשית', reason: 'השם "ויחי" מופיע בכותרת' },
  { id: 220, name: "חיזוק כללי", path: "", reason: '"חיזוק" בכותרת — הנושא הקרוב ביותר בעץ' },
];

const ITEM = { id: 7, title: "פרשת ויחי — שיעור חיזוק" };

const draw = (props = {}) => {
  const onSave = vi.fn();
  const onSkip = vi.fn();
  render(
    <SuggestTagsDialog
      open
      item={ITEM}
      suggestions={SUGGESTIONS}
      nodes={TREE}
      onSave={onSave}
      onSkip={onSkip}
      {...props}
    />
  );
  return { onSave, onSkip, user: userEvent.setup() };
};

const save = (user) => user.click(screen.getByRole("button", { name: "שמירת התגיות" }));

describe("what it offers", () => {
  it("names the item that was just uploaded", () => {
    draw();
    expect(screen.getByText(/פרשת ויחי — שיעור חיזוק/)).toBeDefined();
  });

  // Guesses from a title, and some are wrong. A suggestion whose reason is
  // visible gets rejected by somebody who can see why it was made.
  it("shows why each suggestion was made", () => {
    draw();
    expect(screen.getByText(/השם "ויחי" מופיע בכותרת/)).toBeDefined();
    expect(screen.getByText(/"חיזוק" בכותרת/)).toBeDefined();
  });

  it("shows where each one sits, so a repeated name is not ambiguous", () => {
    draw();
    expect(screen.getByText(/תנ"ך ← תורה ← בראשית/)).toBeDefined();
  });

  // Pre-accepted: the common case is that they are right.
  it("saves everything it offered if nothing is touched", async () => {
    const { onSave, user } = draw();
    await save(user);
    expect(onSave).toHaveBeenCalledWith(7, { tagIds: [15, 220], tags: [] });
  });
});

describe("changing the answer", () => {
  it("drops a suggestion that is clicked off", async () => {
    const { onSave, user } = draw();
    await user.click(screen.getByRole("button", { name: /הצעה: חיזוק כללי/ }));
    await save(user);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(7, { tagIds: [15], tags: [] }));
  });

  it("puts one back that was clicked off and on again", async () => {
    const { onSave, user } = draw();
    const chip = screen.getByRole("button", { name: /הצעה: חיזוק כללי/ });
    await user.click(chip);
    await user.click(screen.getByRole("button", { name: /הצעה: חיזוק כללי/ }));
    await save(user);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(7, { tagIds: [15, 220], tags: [] }));
  });

  // Typing a tag that is not in the taxonomy is the picker's own behaviour and
  // is pinned where the picker is exercised directly — see EditTagsDialog's
  // "sends something typed as a name, beside the ids". Driving MUI's freeSolo
  // input through two dialogs' worth of re-render to assert the same split
  // twice buys nothing and costs a test that hangs.
});

describe("when there is nothing to suggest", () => {
  // A title like "check" tells the rule nothing, and it says so rather than
  // offering something confident and wrong.
  it("still opens, and offers the vocabulary to pick from", () => {
    draw({ suggestions: [] });
    expect(screen.getByText(/לא נמצאה הצעה מהכותרת/)).toBeDefined();
  });

  it("saves nothing when nothing was chosen", async () => {
    const { onSave, user } = draw({ suggestions: [] });
    await save(user);
    expect(onSave).toHaveBeenCalledWith(7, { tagIds: [], tags: [] });
  });
});

describe("skipping", () => {
  // The item is already stored; this is a question, not a step that can fail.
  it("is a real answer and saves nothing", async () => {
    const { onSave, onSkip, user } = draw();
    await user.click(screen.getByRole("button", { name: "דלג" }));
    expect(onSkip).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("renders nothing at all with no item", () => {
    const { container } = render(<SuggestTagsDialog open item={null} nodes={TREE} />);
    expect(container.textContent).toBe("");
  });
});

// ── The loop that freezes the tab ───────────────────────────────────────────
//
// `({ suggestions = [] })` builds a fresh array on every render, and an effect
// that depends on it sets state, which renders again, forever — synchronously,
// so nothing errors and no timeout fires: the tab simply stops. It happens only
// when the prop is omitted or rebuilt by the parent, which is precisely what
// nobody clicks through by hand before shipping.
//
// These two render the component the two ways that used to hang. If the loop
// ever comes back they do not fail with a message — they stop, which is itself
// the signal, and the render counter says by how much.

describe("it settles instead of re-rendering forever", () => {
  it("survives being given no suggestions and no vocabulary at all", () => {
    let renders = 0;
    const Counting = () => {
      renders += 1;
      return <SuggestTagsDialog open item={ITEM} onSkip={vi.fn()} onSave={vi.fn()} />;
    };
    render(<Counting />);
    expect(renders).toBeLessThan(5);
    expect(screen.getByText("על מה השיעור?")).toBeDefined();
  });

  it("survives a parent that rebuilds both lists on every render", () => {
    let renders = 0;
    const Rebuilding = () => {
      renders += 1;
      // New arrays every time — ordinary React, and the case identity in the
      // dependency list cannot survive.
      return (
        <SuggestTagsDialog
          open
          item={{ ...ITEM }}
          suggestions={SUGGESTIONS.map((s) => ({ ...s }))}
          nodes={TREE.map((n) => ({ ...n }))}
          onSkip={vi.fn()}
          onSave={vi.fn()}
        />
      );
    };
    render(<Rebuilding />);
    expect(renders).toBeLessThan(5);
    expect(screen.getByRole("button", { name: /הצעה: ויחי/ })).toBeDefined();
  });
});
