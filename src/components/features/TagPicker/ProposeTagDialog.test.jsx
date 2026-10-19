// @vitest-environment jsdom
import { it, expect, describe, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProposeTagDialog from "./ProposeTagDialog";

// A new tag: its name and its place in the tree.
//
// What is worth pinning is that the place SENT is the place SHOWN. The parent is
// chosen by browsing — whatever level the breadcrumbs are on — and a picker whose
// display and value disagreed would file the tag somewhere nobody chose, with an
// admin approving what the preview said rather than what was sent.

const TREE = [
  { id: 1, name: "מעגל השנה", parent_id: null },
  { id: 2, name: "מעגל השנה לפי חודשים", parent_id: 1 },
  { id: 3, name: "מעגל השנה לפי שבתות", parent_id: 1 },
  { id: 4, name: "שבת שובה", parent_id: 3 },
  { id: 5, name: "תשרי", parent_id: 2 },
  { id: 6, name: "הלכה", parent_id: null },
  // The same name in a second place — allowed, but worth pointing out.
  { id: 7, name: "שבת חנוכה", parent_id: 6 },
];

const draw = (props = {}) => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  render(<ProposeTagDialog open nodes={TREE} onSubmit={onSubmit} onClose={onClose} {...props} />);
  return { onSubmit, onClose, user: userEvent.setup() };
};

const placement = () => screen.getByTestId("tag-placement").textContent;
const submit = (user) => user.click(screen.getByRole("button", { name: "שליחה לאישור" }));

describe("choosing the place", () => {
  it("starts at the top level, as a new main heading", async () => {
    const { onSubmit, user } = draw();
    await user.type(screen.getByLabelText("שם התגית"), "נושא חדש");
    expect(placement()).toContain("כותרת ראשית");
    await submit(user);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "נושא חדש", parentId: null }));
  });

  it("sends the level that was browsed into, and shows its whole path", async () => {
    const { onSubmit, user } = draw();
    await user.type(screen.getByLabelText("שם התגית"), "שבת הגדול");
    await user.click(screen.getByRole("button", { name: /^מעגל השנה/ }));
    await user.click(screen.getByRole("button", { name: /מעגל השנה לפי שבתות/ }));
    expect(placement()).toContain("מעגל השנה ← מעגל השנה לפי שבתות ← שבת הגדול");
    await submit(user);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "שבת הגדול", parentId: 3 }));
  });

  it("goes back up through the breadcrumbs", async () => {
    const { onSubmit, user } = draw();
    await user.type(screen.getByLabelText("שם התגית"), "חדש");
    await user.click(screen.getByRole("button", { name: /^מעגל השנה/ }));
    await user.click(screen.getByRole("button", { name: /מעגל השנה לפי שבתות/ }));
    const crumbs = screen.getByRole("navigation", { name: "מיקום בעץ התגיות" });
    await user.click(within(crumbs).getByRole("button", { name: "מעגל השנה" }));
    await submit(user);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "חדש", parentId: 1 }));
  });

  it("jumps straight to a parent found by searching", async () => {
    const { onSubmit, user } = draw();
    await user.type(screen.getByLabelText("שם התגית"), "ראש השנה א");
    await user.type(screen.getByLabelText("חיפוש תגית אב"), "תשרי");
    await user.click(screen.getByRole("button", { name: /תשרי/ }));
    expect(placement()).toContain("מעגל השנה ← מעגל השנה לפי חודשים ← תשרי ← ראש השנה א");
    await submit(user);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "ראש השנה א", parentId: 5 }));
  });

  it("opens where it was told to, for an admin correcting a proposal", async () => {
    const { onSubmit, user } = draw({ initialName: "שבת גדול", initialParentId: 3, submitLabel: "אישור" });
    expect(placement()).toContain("מעגל השנה לפי שבתות ← שבת גדול");
    await user.click(screen.getByRole("button", { name: "אישור" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "שבת גדול", parentId: 3 }));
  });
});

describe("the name", () => {
  it("is sent with its whitespace collapsed", async () => {
    const { onSubmit, user } = draw();
    await user.type(screen.getByLabelText("שם התגית"), "  שבת   הגדול ");
    await submit(user);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "שבת הגדול", parentId: null }));
  });

  it("cannot be empty", () => {
    draw();
    expect(screen.getByRole("button", { name: "שליחה לאישור" }).disabled).toBe(true);
  });

  // The server would answer TAG_EXISTS; saying so while typing saves the trip.
  it("cannot repeat a tag already in the chosen place", async () => {
    const { user } = draw();
    await user.click(screen.getByRole("button", { name: /^מעגל השנה/ }));
    await user.click(screen.getByRole("button", { name: /מעגל השנה לפי שבתות/ }));
    await user.type(screen.getByLabelText("שם התגית"), "שבת שובה");
    expect(screen.getByText(/כבר קיימת במקום הזה/)).toBeDefined();
    expect(screen.getByRole("button", { name: "שליחה לאישור" }).disabled).toBe(true);
  });

  it("points out the same name elsewhere, without refusing it", async () => {
    const { user } = draw();
    await user.type(screen.getByLabelText("שם התגית"), "שבת חנוכה");
    expect(screen.getByText(/כבר קיימת תחת: הלכה/)).toBeDefined();
    expect(screen.getByRole("button", { name: "שליחה לאישור" }).disabled).toBe(false);
  });
});

it("shows the reason in place when the server refuses", async () => {
  const onSubmit = vi.fn().mockRejectedValue({ hebrew: "התגית כבר קיימת במקום הזה" });
  render(<ProposeTagDialog open nodes={TREE} onSubmit={onSubmit} onClose={vi.fn()} />);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("שם התגית"), "חדש");
  await user.click(screen.getByRole("button", { name: "שליחה לאישור" }));
  expect(await screen.findByText("התגית כבר קיימת במקום הזה")).toBeDefined();
});
