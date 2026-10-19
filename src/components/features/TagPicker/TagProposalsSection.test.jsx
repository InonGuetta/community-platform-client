// @vitest-environment jsdom
import { it, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagProposalsSection from "./TagProposalsSection";
import { mediaApi } from "../../../api/mediaApi";

// "הוסף תגית" under the picker, and what it does by role.
//
// A lecturer's new tag waits: it is listed as waiting and nothing is handed to
// the dialog, because the item does not carry it yet. An admin's is created on
// the spot and IS handed over — the dialog's save replaces the item's tags, and
// a tag it does not know about would be removed by the very next click.

let role = "lecturer";
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { role } } }) }));
vi.mock("../../../api/mediaApi", () => ({
  mediaApi: { tagProposals: vi.fn(), proposeTag: vi.fn(), withdrawTagProposal: vi.fn() },
}));

const TREE = [
  { id: 1, name: "מעגל השנה", parent_id: null },
  { id: 3, name: "מעגל השנה לפי שבתות", parent_id: 1 },
];

beforeEach(() => {
  vi.clearAllMocks();
  mediaApi.tagProposals.mockResolvedValue([]);
});

const propose = async (user, name) => {
  await user.click(screen.getByRole("button", { name: "הוסף תגית" }));
  await user.type(screen.getByLabelText("שם התגית"), name);
  await user.click(screen.getByRole("button", { name: /^מעגל השנה/ }));
  await user.click(screen.getByRole("button", { name: /מעגל השנה לפי שבתות/ }));
};

describe("a lecturer", () => {
  beforeEach(() => {
    role = "lecturer";
  });

  it("sees what is already waiting on this item", async () => {
    mediaApi.tagProposals.mockResolvedValue([{ id: 9, name: "שבת הגדול", parent_id: 3, status: "pending" }]);
    render(<TagProposalsSection itemId={7} nodes={TREE} />);
    expect(await screen.findByLabelText(/ממתינה לאישור: שבת הגדול \(מעגל השנה ← מעגל השנה לפי שבתות\)/)).toBeDefined();
    expect(mediaApi.tagProposals).toHaveBeenCalledWith(7);
  });

  it("sends a proposal for approval, and it joins the waiting list without touching the selection", async () => {
    mediaApi.proposeTag.mockResolvedValue({ id: 10, name: "שבת הגדול", parent_id: 3, status: "pending" });
    const onTagCreated = vi.fn();
    render(<TagProposalsSection itemId={7} nodes={TREE} onTagCreated={onTagCreated} />);
    const user = userEvent.setup();
    await propose(user, "שבת הגדול");
    await user.click(screen.getByRole("button", { name: "שליחה לאישור" }));

    await waitFor(() => expect(mediaApi.proposeTag).toHaveBeenCalledWith(7, { name: "שבת הגדול", parentId: 3 }));
    expect(await screen.findByLabelText(/ממתינה לאישור: שבת הגדול/)).toBeDefined();
    expect(onTagCreated).not.toHaveBeenCalled();
  });

  it("can take back a proposal still waiting", async () => {
    mediaApi.tagProposals.mockResolvedValue([{ id: 9, name: "שבת הגדול", parent_id: 3, status: "pending" }]);
    mediaApi.withdrawTagProposal.mockResolvedValue(undefined);
    const { container } = render(<TagProposalsSection itemId={7} nodes={TREE} />);
    await screen.findByLabelText(/ממתינה לאישור: שבת הגדול/);
    await userEvent.setup().click(container.querySelector(".MuiChip-deleteIcon"));
    await waitFor(() => expect(mediaApi.withdrawTagProposal).toHaveBeenCalledWith(7, 9));
    expect(screen.queryByLabelText(/ממתינה לאישור: שבת הגדול/)).toBeNull();
  });
});

describe("an admin", () => {
  beforeEach(() => {
    role = "admin";
  });

  it("creates the tag at once and hands it to the dialog to keep", async () => {
    mediaApi.proposeTag.mockResolvedValue({ status: "approved", tag_id: 300, name: "שבת הגדול", parent_id: 3 });
    const onTagCreated = vi.fn();
    render(<TagProposalsSection itemId={7} nodes={TREE} onTagCreated={onTagCreated} />);
    const user = userEvent.setup();
    await propose(user, "שבת הגדול");
    await user.click(screen.getByRole("button", { name: "יצירת התגית" }));

    await waitFor(() =>
      expect(onTagCreated).toHaveBeenCalledWith(expect.objectContaining({ id: 300, name: "שבת הגדול", parent_id: 3 }))
    );
    expect(screen.queryByLabelText(/ממתינה לאישור/)).toBeNull();
  });
});
