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
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter><PlaylistsSection /></MemoryRouter>
    </Provider>
  );
};

const cards = () => screen.queryAllByText(/^שיעור \d+$/);
const arrow = (name = /הצג עוד שיעורים/) => screen.queryByRole("button", { name });

describe("what a saved list shows", () => {
  test("its own name, as the heading", () => {
    show([list()]);
    expect(screen.getByText("שיעורי מוסר")).toBeInTheDocument();
  });

  // The whole point of the change: the lectures themselves, not a count and a
  // link to go and look at them.
  test("and the lectures inside it, three to a row", () => {
    show([list()]);
    expect(cards()).toHaveLength(3);
  });

  // They arrive newest first from the server (ORDER BY added_at DESC) and this
  // grid reads right to left, so the most recent is the top-right card.
  test("in the order they arrived, newest first", () => {
    show([list()]);
    expect(cards().map((el) => el.textContent)).toEqual(["שיעור 1", "שיעור 2", "שיעור 3"]);
  });

  test("a press opens one more row of three", () => {
    show([list()]);
    fireEvent.click(arrow());
    expect(cards()).toHaveLength(6);
  });

  test("a final part-row is shown whole", () => {
    show([list({ items: lectures(4), item_count: 4 })]);
    fireEvent.click(arrow());
    expect(cards()).toHaveLength(4);
  });

  test("no arrow when everything already fits on one row", () => {
    show([list({ items: lectures(3), item_count: 3 })]);
    expect(arrow()).toBeNull();
  });
});

describe("two lists on one page", () => {
  const two = () => [
    list(),
    { id: 2, title: "בדיקה שהרשימה עובדת", items: lectures(6, 100), item_count: 6 },
  ];

  test("each gets its own heading and its own lectures", () => {
    show(two());
    expect(screen.getByText("שיעורי מוסר")).toBeInTheDocument();
    expect(screen.getByText("בדיקה שהרשימה עובדת")).toBeInTheDocument();
    expect(cards()).toHaveLength(6);   // three from each
  });

  // Per shelf and not per page: two lists are two separate things to page
  // through, and a single counter would open them in lockstep.
  test("opening one does not open the other", () => {
    show(two());
    fireEvent.click(arrow(/הצג עוד שיעורים מתוך שיעורי מוסר/));

    expect(cards()).toHaveLength(9);   // six from the first, three from the second
  });
});

describe("the edges of a list", () => {
  // Either genuinely empty, or holding only lectures this viewer may not see —
  // the server applies the same visibility rule here as everywhere. Both are
  // "nothing to show you", and neither is an error.
  test("a list with nothing to show says so, and is not an error", () => {
    show([list({ items: [], item_count: 0 })]);
    expect(screen.getByText("אין בה שיעורים להצגה.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  // The server caps how many lectures ride along. Past that the list has a page
  // of its own, which was built for exactly this.
  test("a list longer than what arrived offers its own page", () => {
    show([list({ items: lectures(12), item_count: 300 })]);
    expect(screen.getByRole("button", { name: "לרשימה המלאה" })).toBeInTheDocument();
  });

  // A link to "the whole list" beside a list that is already whole is a question
  // the reader has to answer for nothing.
  test("and a list that is already whole does not", () => {
    show([list()]);
    expect(screen.queryByRole("button", { name: "לרשימה המלאה" })).toBeNull();
  });

  // `item_count` is what the viewer MAY SEE, not what the list holds. Before
  // that, a list holding lectures from a course the viewer is not enrolled in
  // offered "the whole list" and then opened a page showing the same cards.
  test("a list whose hidden lectures are filtered out does not promise more", () => {
    show([list({ items: lectures(2), item_count: 2 })]);
    expect(screen.queryByRole("button", { name: "לרשימה המלאה" })).toBeNull();
    expect(screen.getByText("2 שיעורים")).toBeInTheDocument();
  });

  test("no lists at all is a sentence, not an empty page", () => {
    show([]);
    expect(screen.getByText(/עדיין אין לך רשימות/)).toBeInTheDocument();
  });
});

describe("the arrow", () => {
  // In the heading row, on the opposite edge from the title — so it comes
  // before the cards in the DOM, not after them.
  test("sits in the heading, above the cards", () => {
    show([list()]);
    const first = cards()[0];
    expect(arrow().compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  // Once every card that arrived is open there is nothing left for it to do.
  test("is disabled once everything is open", () => {
    show([list({ items: lectures(6), item_count: 6 })]);
    expect(arrow()).toBeEnabled();

    fireEvent.click(arrow());
    expect(cards()).toHaveLength(6);
    expect(arrow()).toBeDisabled();
  });

  test("it says which list it belongs to", () => {
    show([list()]);
    expect(arrow()).toHaveAttribute("aria-label", "הצג עוד שיעורים מתוך שיעורי מוסר");
  });
});
