// @vitest-environment jsdom
import { it, expect, describe, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EditTagsDialog from "./EditTagsDialog";

// Tagging an item that already exists.
//
// The two things worth pinning here are the two that would be silent:
//
//   · the dialog restores the item's tags from tag_ids, NOT from the names on
//     the card. Five names in this taxonomy occur in two branches, so a
//     name-matched tag would be re-saved under whichever branch was found first
//     and the item would change place in the tree it is filtered by;
//   · a pick from the taxonomy and something typed leave by different doors —
//     ids as `tagIds`, strings as `tags`, which become new root-level tags. Send
//     a typed tag as an id and the request is a 400; send a picked one as a name
//     and it becomes a duplicate root tag beside the one it was picked from.

const TREE = [
  { id: 1, name: 'תנ"ך', parent_id: null },
  { id: 2, name: "תורה", parent_id: 1 },
  { id: 5, name: "שמות", parent_id: 2 },
  // The pair the ids exist for: same name, two branches.
  { id: 30, name: "שופטים", parent_id: 1 },
  { id: 31, name: "שופטים", parent_id: 2 },
];

const ITEM = { id: 7, title: "שיעור בפרשת שמות", tags: ["שמות"], tag_ids: [5] };

const draw = (props = {}) => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(
    <EditTagsDialog open item={ITEM} tagTree={TREE} onSave={onSave} onClose={onClose} {...props} />
  );
  return { onSave, onClose, user: userEvent.setup() };
};

const save = async (user) => user.click(screen.getByRole("button", { name: "שמירה" }));

describe("opening it on an item", () => {
  it("names the item it is about", () => {
    draw();
    expect(screen.getByText(/שיעור בפרשת שמות/)).toBeDefined();
  });

  it("shows the tags the item already carries", () => {
    draw();
    expect(screen.getByText("שמות")).toBeDefined();
  });

  // Restoring by name would pick whichever שופטים came first in the list, and
  // saving would move the item to the other branch without anybody touching it.
  it("restores them by id, so a name that occurs twice keeps its branch", async () => {
    const { onSave, user } = draw({ item: { id: 8, title: "שיעור", tags: ["שופטים"], tag_ids: [31] } });
    await save(user);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(8, { tagIds: [31], tags: [] }));
  });

  it("has nothing to restore for an item that was never tagged", () => {
    draw({ item: { id: 9, title: "שיעור", tags: [], tag_ids: [] } });
    expect(screen.getByRole("button", { name: "שמירה" })).toBeDefined();
  });

  // A tag deleted from the vocabulary while it sat on an item: there is no name
  // to draw, and re-saving an id the tree no longer holds would be a 400.
  it("drops an id the vocabulary no longer holds rather than re-saving it", async () => {
    const { onSave, user } = draw({ item: { id: 10, title: "שיעור", tags: [], tag_ids: [5, 999] } });
    await save(user);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(10, { tagIds: [5], tags: [] }));
  });

  it("renders nothing at all with no item to edit", () => {
    const { container } = render(<EditTagsDialog open item={null} tagTree={TREE} />);
    expect(container.textContent).toBe("");
  });
});

describe("saving", () => {
  it("sends the ids of tags picked from the taxonomy", async () => {
    const { onSave, user } = draw();
    await save(user);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(7, { tagIds: [5], tags: [] }));
  });

  // Typed tags travel as names and become root-level tags; sending one as an id
  // is a 400, and sending a picked one as a name duplicates it at the root.
  it("sends something typed as a name, beside the ids", async () => {
    const { onSave, user } = draw();
    const field = screen.getByRole("combobox");
    await user.type(field, "שיעור לנוער{enter}");
    await save(user);
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(7, { tagIds: [5], tags: ["שיעור לנוער"] })
    );
  });

  it("closes without saving when cancelled", async () => {
    const { onSave, onClose, user } = draw();
    await user.click(screen.getByRole("button", { name: "ביטול" }));
    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
});
