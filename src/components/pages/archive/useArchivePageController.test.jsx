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

// The listing request as a plain action, so a test can read what was asked for.
vi.mock("../../../store/slicesAndThunks/mediaSlice/mediaGet", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchAllMedia: (arg) => ({ type: "media/fetchAll", meta: { arg } }),
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
    expect(api.selectedTypes).toEqual(["video"]);
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
    expect(api.selectedTypes).toEqual([]);
    expect(api.dates.uploadedAfter).toBe("");
  });
});

describe("the media-type toggle", () => {
  it("is and / and: two types pressed are both shown", async () => {
    await open("/archive?type=video");
    await act(async () => api.handleToggleType("audio"));
    expect(api.selectedTypes).toEqual(["video", "audio"]);
  });

  it("from the default, pressing a type shows that type alone", async () => {
    await open("/archive");
    await act(async () => api.handleToggleType("video"));
    expect(api.selectedTypes).toEqual(["video"]);
  });

  it("הכל shows everything, and pressing it again changes nothing", async () => {
    await open("/archive?type=video,audio");
    await act(async () => api.handlePressAllTypes());
    expect(api.selectedTypes).toEqual([]);
    await act(async () => api.handlePressAllTypes());
    expect(api.selectedTypes).toEqual([]);
  });

  it("taking out the last type goes back to everything", async () => {
    await open("/archive?type=text");
    await act(async () => api.handleToggleType("text"));
    expect(api.selectedTypes).toEqual([]);
  });

  it("sends the chosen types to the server as a list", async () => {
    await open("/archive?type=video,audio");
    const request = dispatch.mock.calls.map(([action]) => action?.meta?.arg).find((arg) => arg?.type);
    expect(request?.type).toEqual(["video", "audio"]);
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
    // From "everything", pressing קריאה shows reading alone; then שמע joins it.
    await act(async () => api.handleToggleType("text"));
    await act(async () => api.handleToggleType("audio"));
    await act(async () => api.handleDateFilter("uploadedAfter", "2026-05-05"));
    await waitFor(() => expect(url()).toContain("type=audio%2Ctext"));
    expect(url()).toContain("from=2026-05-05");
  });

  // An address with a row of empty parameters in it is not a link anybody shares.
  it("leaves nothing behind when the filter is cleared", async () => {
    await open("/archive?tags=2&not=5&type=video");
    await act(async () => api.handleClearFilters());
    await waitFor(() => expect(url()).not.toContain("tags="));
    expect(url()).not.toContain("not=");
    // The type toggle lives inside the panel, so clearing the panel clears it.
    expect(url()).not.toContain("type=");
  });

  it("clears both lists when the tags are cleared", async () => {
    await open("/archive?tags=2&not=5");
    await act(async () => api.handleClearTags());
    await waitFor(() => expect(url()).toBe(""));
  });
});

describe("the sort order", () => {
  // The listing requests dispatched, newest last.
  const requests = () =>
    dispatch.mock.calls.map(([action]) => action).filter((a) => a?.type === "media/fetchAll").map((a) => a.meta.arg);

  it("sends nothing for the default, so the opening request is unchanged", async () => {
    await open();
    expect(api.sortOrder).toBe("newest");
    expect(requests().at(-1)).not.toHaveProperty("sort");
  });

  it("asks the server for the chosen order, and writes it into the address", async () => {
    await open();
    await act(async () => api.handleSortChange("liked"));
    await waitFor(() => expect(requests().at(-1)).toMatchObject({ sort: "liked" }));
    await waitFor(() => expect(url()).toContain("sort=liked"));
  });

  it("opens in the order a shared link names, beside its filters", async () => {
    await open("/archive?type=audio&sort=title");
    expect(api.sortOrder).toBe("title");
    expect(requests().at(-1)).toMatchObject({ sort: "title", type: ["audio"] });
  });

  // An order is not a filter: it hides nothing, so it is not counted as one and
  // "ניקוי הכל" leaves it where it is.
  it("is not an active filter, and clearing the filters keeps it", async () => {
    await open("/archive?sort=oldest");
    expect(api.hasActiveFilter).toBe(false);
    await act(async () => api.handleClearFilters());
    expect(api.sortOrder).toBe("oldest");
    await waitFor(() => expect(url()).toContain("sort=oldest"));
  });

  it("an unknown value from the menu falls back to the default", async () => {
    await open("/archive?sort=title");
    await act(async () => api.handleSortChange("banana"));
    expect(api.sortOrder).toBe("newest");
  });
});

describe("the length filter", () => {
  const lastRequest = () =>
    dispatch.mock.calls.map(([action]) => action).filter((a) => a?.type === "media/fetchAll").at(-1)?.meta.arg;

  it("sends nothing about length until a range is chosen", async () => {
    await open();
    expect(lastRequest()).not.toHaveProperty("minDuration");
    expect(lastRequest()).not.toHaveProperty("maxDuration");
  });

  it("sends the chosen range in seconds, and writes its name into the address", async () => {
    await open();
    await act(async () => api.handleDurationFilter("medium"));
    await waitFor(() => expect(lastRequest()).toMatchObject({ minDuration: 900, maxDuration: 1800 }));
    await waitFor(() => expect(url()).toContain("len=medium"));
    expect(api.hasActiveFilter).toBe(true);
  });

  it("an open-ended range sends only its one end", async () => {
    await open("/archive?len=xlong");
    expect(lastRequest()).toMatchObject({ minDuration: 3600 });
    expect(lastRequest()).not.toHaveProperty("maxDuration");
  });

  // A book has no length: a range kept under "reading only" would hide every
  // card on the page with no field on screen to explain it.
  it("is not offered with only reading chosen, and a range left over is dropped", async () => {
    await open("/archive?len=short");
    expect(api.lengthOffered).toBe(true);
    await act(async () => api.handleToggleType("text"));
    expect(api.lengthOffered).toBe(false);
    await waitFor(() => expect(api.durationRange).toBe(""));
    expect(lastRequest()).not.toHaveProperty("maxDuration");
    await waitFor(() => expect(url()).not.toContain("len="));
  });

  it("a link naming reading only and a length opens with no length", async () => {
    await open("/archive?type=text&len=long");
    await waitFor(() => expect(api.durationRange).toBe(""));
    expect(lastRequest()).not.toHaveProperty("minDuration");
  });

  it("is cleared with the other filters", async () => {
    await open("/archive?len=long");
    await act(async () => api.handleClearFilters());
    expect(api.durationRange).toBe("");
  });
});
