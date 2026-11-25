// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import PlaylistsSection from "./PlaylistsSection";

// The section fetches on mount; nothing here asserts on that, so the thunk is
// replaced with a plain action. PARTIALLY, because personalShelves.js imports
// fetchSavedMedia from the same module and a whole-module mock takes that with
// it — the page then fails to load before a single test runs.
vi.mock("../../../store/slicesAndThunks/savesSlice/savesGet", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchPlaylists: () => ({ type: "saves/fetchPlaylists" }),
}));

// Each saved list is a heading with its own lectures underneath. It used to be a
// card per list and nothing else — a name, a count, and a click through to see
// what was in it, which is a table of contents rather than a shelf.

const lectures = (count, from = 1) =>
  Array.from({ length: count }, (_, i) => ({
    id: from + i,
    title: `שיעור ${from + i}`,
    media_type: "audio",
    is_published: true,
  }));

const list = (over = {}) => ({
  id: 1, title: "שיעורי מוסר", items: lectures(9), item_count: 9, ...over,
});

const show = (playlists) => {
  const store = configureStore({
    reducer: {
      saves: () => ({ playlists, playlistsStatus: "succeeded" }),
      auth: () => ({ user: { id: 3, role: "student" } }),
      // Each card's download menu reads what is saved for offline listening.
      offline: () => ({ items: [], loaded: true, progress: {} }),
      // And each tile's heart, what this reader has liked.
      likes: () => ({ ids: [] }),
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter><PlaylistsSection /></MemoryRouter>
    </Provider>
  );
};

const cards = () => screen.queryAllByText(/^שיעור \d+$/);
// A list's row: the button that folds it, found by the list's own name.
const row = (title = "שיעורי מוסר") => screen.getByRole("button", { name: new RegExp(title) });
const open = (title) => fireEvent.click(row(title));

describe("what a saved list shows", () => {
  test("its own name and how many lectures it holds, as a row", () => {
    show([list()]);
    expect(screen.getByText("שיעורי מוסר")).toBeInTheDocument();
    expect(screen.getByText("9 שיעורים")).toBeInTheDocument();
  });

  // D-36: closed until asked, so a user with many lists sees every name at once.
  test("closed by default, with no lectures drawn", () => {
    show([list()]);
    expect(row()).toHaveAttribute("aria-expanded", "false");
    expect(cards()).toHaveLength(0);
  });

  // The whole point of the original change, kept: the lectures themselves, not a
  // count and a link to go and look at them.
  test("opening it shows every lecture that arrived", () => {
    show([list()]);
    open();
    expect(row()).toHaveAttribute("aria-expanded", "true");
    expect(cards()).toHaveLength(9);
  });

  // They arrive newest first from the server (ORDER BY added_at DESC).
  test("in the order they arrived, newest first", () => {
    show([list({ items: lectures(3), item_count: 3 })]);
    open();
    expect(cards().map((el) => el.textContent)).toEqual(["שיעור 1", "שיעור 2", "שיעור 3"]);
  });

  test("a second press folds it again", () => {
    show([list()]);
    open();
    open();
    expect(row()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("two lists on one page", () => {
  const two = () => [
    list(),
    { id: 2, title: "בדיקה שהרשימה עובדת", items: lectures(6, 100), item_count: 6 },
  ];

  test("each gets its own row", () => {
    show(two());
    expect(screen.getByText("שיעורי מוסר")).toBeInTheDocument();
    expect(screen.getByText("בדיקה שהרשימה עובדת")).toBeInTheDocument();
    expect(cards()).toHaveLength(0);
  });

  // Per row and not per page: two lists are two separate things to open, and a
  // single flag would open them in lockstep.
  test("opening one does not open the other", () => {
    show(two());
    open("שיעורי מוסר");

    expect(cards()).toHaveLength(9);
    expect(row("בדיקה שהרשימה עובדת")).toHaveAttribute("aria-expanded", "false");
  });
});

describe("the edges of a list", () => {
  // Either genuinely empty, or holding only lectures this viewer may not see —
  // the server applies the same visibility rule here as everywhere. Both are
  // "nothing to show you", and neither is an error.
  test("a list with nothing to show says so, and is not an error", () => {
    show([list({ items: [], item_count: 0 })]);
    open();
    expect(screen.getByText("אין בה שיעורים להצגה.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // The server caps how many lectures ride along. Past that the list has a page
  // of its own, which was built for exactly this.
  test("a list longer than what arrived offers its own page", () => {
    show([list({ items: lectures(12), item_count: 300 })]);
    open();
    expect(screen.getByRole("button", { name: "לרשימה המלאה" })).toBeInTheDocument();
  });

  // A link to "the whole list" beside a list that is already whole is a question
  // the reader has to answer for nothing.
  test("and a list that is already whole does not", () => {
    show([list()]);
    open();
    expect(screen.queryByRole("button", { name: "לרשימה המלאה" })).toBeNull();
  });

  // `item_count` is what the viewer MAY SEE, not what the list holds. Before
  // that, a list holding lectures from a course the viewer is not enrolled in
  // offered "the whole list" and then opened a page showing the same cards.
  test("a list whose hidden lectures are filtered out does not promise more", () => {
    show([list({ items: lectures(2), item_count: 2 })]);
    open();
    expect(screen.queryByRole("button", { name: "לרשימה המלאה" })).toBeNull();
    expect(screen.getByText("2 שיעורים")).toBeInTheDocument();
  });

  test("no lists at all is a sentence, not an empty page", () => {
    show([]);
    expect(screen.getByText(/עדיין אין לך רשימות/)).toBeInTheDocument();
  });
});
