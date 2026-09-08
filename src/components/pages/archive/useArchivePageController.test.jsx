// @vitest-environment jsdom
import { it, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

// The wiring between the filter and the address.
//
// archiveFilterParams.test.js pins the mapping — which parameter means what, and
// what happens to a value somebody mangled. This pins the twenty lines that USE
// it, which is where the mapping being right stops being enough:
//
//   · state seeded from the address on the way in, so a shared link opens the
//     archive somebody meant to share rather than the whole library;
//   · the address rewritten as the filter changes, so refreshing keeps it;
//   · a selection that arrived from a URL — which nobody built one click at a
//     time — normalised before it is used.
//
// None of those would fail a test anywhere else, and none of them shows up as an
// error: the filter would simply be the wrong one, quietly.
//
// Only the two hooks the controller genuinely needs from outside are replaced.
// Redux is mocked because what is under test is not what the store does with the
// request, and the network is mocked because the taxonomy is a fixture here.

const dispatch = vi.fn();
vi.mock("react-redux", () => ({
  useDispatch: () => dispatch,
  // The page's own data is not what this file is about; the archive renders from
  // whatever the store holds, and here that is nothing.
  useSelector: () => undefined,
}));

const TREE = [
  { id: 1, name: 'תנ"ך', parent_id: null, media_count: 40 },
  { id: 2, name: "תורה", parent_id: 1, media_count: 30 },
  { id: 3, name: "בראשית", parent_id: 2, media_count: 12 },
  { id: 5, name: "שמות", parent_id: 2, media_count: 10 },
  { id: 6, name: "בא", parent_id: 5, media_count: 3 },
  { id: 9, name: "מוסר", parent_id: null, media_count: 7 },
];

vi.mock("../../../api/mediaApi", () => ({
  mediaApi: {
    tags: async () => TREE,
    creators: async () => [],
  },
}));

const useArchivePageController = (await import("./useArchivePageController")).default;

let api;

const Probe = () => {
  api = useArchivePageController();
  const { search } = useLocation();
  return <span data-testid="url">{search}</span>;
};

const url = () => screen.getByTestId("url").textContent;

const open = async (at = "/archive") => {
  render(
    <MemoryRouter initialEntries={[at]}>
      <Routes>
        <Route path="/archive" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
  // The taxonomy arrives in its own request, and everything about tags waits on
  // it — including the pruning that must not run against an empty tree.
  await waitFor(() => expect(api.tagTree.length).toBe(TREE.length));
};

beforeEach(() => {
  dispatch.mockClear();
  api = undefined;
});

describe("arriving with a filter in the address", () => {
  it("opens showing the filter the link describes", async () => {
    await open("/archive?type=video&q=וירא&creator=הרב כהן&tags=2&not=5&from=2026-01-01");
    expect(api.typeFilter).toBe("video");
    expect(api.creatorFilter).toBe("הרב כהן");
    expect(api.tagIds).toEqual([2]);
    expect(api.excludedTagIds).toEqual([5]);
    expect(api.dates.uploadedAfter).toBe("2026-01-01");
    expect(api.hasActiveFilter).toBe(true);
  });

  it("opens on the whole archive when the address says nothing", async () => {
    await open();
    expect(api.tagIds).toEqual([]);
    expect(api.excludedTagIds).toEqual([]);
    expect(api.hasActiveFilter).toBe(false);
  });

  // A link written before the vocabulary was reorganised, or one somebody edited
  // by hand. Nobody built it a click at a time, so nothing guarantees the server
  // can answer it the way the screen would suggest.
  it("settles a selection the address could not have produced by clicking", async () => {
    // בא chosen while שמות — which contains it — is excluded: the server removes
    // the excluded subtree outright and would answer without בא, while its chip
    // said it was chosen.
    await open("/archive?tags=6&not=5");
    await waitFor(() => expect(api.excludedTagIds).toEqual([]));
    expect(api.tagIds).toEqual([6]);
  });

  it("drops a tag the vocabulary no longer holds, and says so once", async () => {
    await open("/archive?tags=2,404");
    await waitFor(() => expect(api.tagIds).toEqual([2]));
    expect(dispatch).toHaveBeenCalled();
  });

  it("ignores a filter value that is not usable rather than passing it on", async () => {
    await open("/archive?type=banana&from=never");
    expect(api.typeFilter).toBe("");
    expect(api.dates.uploadedAfter).toBe("");
  });
});

describe("the address follows the filter", () => {
  it("writes a tag the moment it is chosen", async () => {
    await open();
    await act(async () => api.handleCycleTag(2));
    await waitFor(() => expect(url()).toContain("tags=2"));
  });

  it("takes a tag out of the address when it is un-chosen", async () => {
    await open();
    await act(async () => api.handleCycleTag(2)); // chosen
    await act(async () => api.handleCycleTag(2)); // and un-chosen again
    await waitFor(() => expect(url()).toBe(""));
  });

  // The click that closes the original bug, seen from the address bar: a child
  // selected through its parent, taken out in one press.
  it("keeps the two lists in separate parameters", async () => {
    await open();
    await act(async () => api.handleCycleTag(2)); // תורה chosen
    await act(async () => api.handleCycleTag(5)); // שמות taken out of it
    await waitFor(() => expect(url()).toContain("not=5"));
    expect(url()).toContain("tags=2");
  });

  it("writes the other filters too", async () => {
    await open();
    await act(async () => api.handleFilter("audio"));
    await act(async () => api.handleDateFilter("uploadedAfter", "2026-05-05"));
    await waitFor(() => expect(url()).toContain("type=audio"));
    expect(url()).toContain("from=2026-05-05");
  });

  // An address with a row of empty parameters in it is not a link anybody shares.
  it("leaves nothing behind when the filter is cleared", async () => {
    await open("/archive?tags=2&not=5&type=video");
    await act(async () => api.handleClearFilters());
    await waitFor(() => expect(url()).not.toContain("tags="));
    expect(url()).not.toContain("not=");
    // The type toggle is outside the panel and is deliberately not cleared by it.
    expect(url()).toContain("type=video");
  });

  it("clears both lists when the tags are cleared", async () => {
    await open("/archive?tags=2&not=5");
    await act(async () => api.handleClearTags());
    await waitFor(() => expect(url()).toBe(""));
  });
});
