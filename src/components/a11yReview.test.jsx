// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SearchBar from "./features/SearchBar/SearchBar";
import DialogTitle from "./features/Dialogs/DialogTitle";
import UsersTableContent from "./pages/users/componentsUsers/UsersTableContent";

vi.mock("./features/MediaGrid/MediaCard", () => ({ default: ({ item }) => <div data-testid="card">{item.title}</div> }));
const { default: MediaGrid } = await import("./features/MediaGrid/MediaGrid");

// What the desktop-and-375px review (PRD MOB-7) found and fixed, pinned so it
// does not come back: controls with no name for a screen reader, and a grid
// that pushed the archive sideways off a phone's screen.

describe("names a screen reader can read", () => {
  it("a search field is named after its placeholder, or its own label", () => {
    render(<SearchBar onSearch={() => {}} placeholder="חיפוש משתמשים..." />);
    expect(screen.getByRole("textbox", { name: "חיפוש משתמשים" })).toBeInTheDocument();
  });

  it("every dialog's close button says what it does", () => {
    render(<DialogTitle onClose={() => {}}>כותרת</DialogTitle>);
    expect(screen.getByRole("button", { name: "סגירת החלון" })).toBeInTheDocument();
  });

  it("each row of the users table names whom its buttons act on", () => {
    render(
      <table>
        <UsersTableContent
          users={[{ id: 3, display_name: "דנה", email: "d@example.com", role: "student", is_active: true }]}
          onEdit={() => {}}
          onDelete={() => {}}
          onToggleActive={() => {}}
          canToggleActive
          currentUserId={1}
        />
      </table>
    );
    for (const name of ["עריכת דנה", "השבתת דנה", "מחיקת דנה"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});

describe("the archive's grid", () => {
  // MUI's Grid spaced its cards with a negative margin that, in this RTL app
  // without the flip plugin, landed on the wrong side.
  it("is a CSS grid with a gap, with no negative-margin container", () => {
    const { container } = render(<MediaGrid items={[{ id: 1, title: "א" }, { id: 2, title: "ב" }]} status="succeeded" />);
    expect(container.querySelector(".MuiGrid-container")).toBeNull();
    const grid = screen.getAllByTestId("card")[0].parentElement.parentElement;
    expect(getComputedStyle(grid).display).toBe("grid");
    expect(getComputedStyle(grid).marginLeft).not.toMatch(/^-/);
  });
});
