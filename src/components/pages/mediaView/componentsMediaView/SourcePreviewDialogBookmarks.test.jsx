// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import bookmarksReducer from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";

// The floating window over the notebook: it loads its lesson itself, says so
// when it cannot, and a bookmark made in it — in a recording or in a book — is
// written for that lesson. The player, the reader and the tabs are stood in
// for; what they do is tested where they live.

const getOne = vi.hoisted(() => vi.fn());
const createBookmark = vi.hoisted(() => vi.fn());
vi.mock("../../../../api/mediaApi", () => ({ mediaApi: { getOne: (...a) => getOne(...a), streamUrl: (id) => `/stream/${id}` } }));
vi.mock("../../../../api/bookmarksApi", () => ({ bookmarksApi: { create: (...a) => createBookmark(...a) } }));
vi.mock("../useMediaInsights", () => ({ default: () => ({ transcript: null }) }));
vi.mock("../useMediaLike", () => ({ default: () => ({ isLiked: false, toggleLike: vi.fn() }) }));
vi.mock("../useMediaSave", () => ({ default: () => ({ isSaved: false, toggleSave: vi.fn() }) }));
vi.mock("../../../features/MediaPlayer/MediaPlayer", () => ({ default: () => <div data-testid="player" /> }));
vi.mock("./MediaActionsBar", () => ({ default: () => null }));
vi.mock("./TextViewer", () => ({
  default: ({ onAddBookmark }) => (
    <button onClick={() => onAddBookmark({ chunkId: null, pageNumber: 4, rect: { x: 0, y: 0, w: 1, h: 0.1 }, note: "עמוד" })}>
      mark-page
    </button>
  ),
}));
vi.mock("./MediaInsightsTabs", () => ({ default: ({ notesPanel }) => <div>{notesPanel}</div> }));
vi.mock("./NotesPanel", () => ({
  default: ({ onCreateBookmark }) => (onCreateBookmark ? <button onClick={() => onCreateBookmark(12, "רגע")}>mark-moment</button> : null),
}));

import SourcePreviewDialog from "./SourcePreviewDialog";

const renderWindow = () => {
  const store = configureStore({ reducer: { bookmarks: bookmarksReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <SourcePreviewDialog open mediaId={7} onClose={vi.fn()} onCloseCurrent={vi.fn()} onCloseAll={vi.fn()} bookmarks={[]} trailPosition={0} trailLength={1} />
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  createBookmark.mockImplementation(async (payload) => ({ id: 99, ...payload }));
});

test("loads its own lesson", async () => {
  getOne.mockResolvedValue({ id: 7, title: "שיעור", media_type: "audio" });
  renderWindow();
  expect(await screen.findByTestId("player")).toBeInTheDocument();
  expect(getOne).toHaveBeenCalledWith(7);
});

test("says so when the lesson cannot be loaded", async () => {
  getOne.mockRejectedValue(new Error("404"));
  renderWindow();
  expect(await screen.findByText("לא ניתן לטעון את השיעור.")).toBeInTheDocument();
});

test("a moment marked in a recording is written for that lesson", async () => {
  getOne.mockResolvedValue({ id: 7, title: "שיעור", media_type: "audio" });
  renderWindow();
  fireEvent.click(await screen.findByText("mark-moment"));
  await waitFor(() => expect(createBookmark).toHaveBeenCalledWith({ mediaId: 7, timestampSeconds: 12, note: "רגע" }));
});

test("a place marked in a book is written for that lesson", async () => {
  getOne.mockResolvedValue({ id: 7, title: "ספר", media_type: "text" });
  renderWindow();
  fireEvent.click(await screen.findByText("mark-page"));
  await waitFor(() => expect(createBookmark).toHaveBeenCalledWith(expect.objectContaining({
    mediaId: 7, pageNumber: 4, rect: { x: 0, y: 0, w: 1, h: 0.1 }, note: "עמוד",
  })));
});
