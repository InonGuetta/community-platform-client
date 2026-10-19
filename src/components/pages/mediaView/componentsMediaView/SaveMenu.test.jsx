// @vitest-environment jsdom
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { savesApi } from "../../../../api/savesApi";
import savesReducer from "../../../../store/slicesAndThunks/savesSlice/savesSlice";
import notificationReducer from "../../../../store/slicesAndThunks/notificationSlice";
import SaveMenu from "./SaveMenu";

// Ticking a list files the lecture, closes the menu a moment later, and says in
// green which list it went into. Only the API is replaced — the thunks, the
// slice and the toast state are the real ones.

vi.mock("../../../../api/savesApi", () => ({
  savesApi: {
    listPlaylists: vi.fn(),
    addToPlaylist: vi.fn(),
    removeFromPlaylist: vi.fn(),
  },
}));

const LISTS = [
  { id: 1, title: "שיעורי מוסר", item_count: 1, contains: false },
  { id: 2, title: "גמרא", item_count: 4, contains: true },
];

let store;
let onClose;

const open = async () => {
  store = configureStore({
    reducer: { saves: savesReducer, notification: notificationReducer },
  });
  onClose = vi.fn();
  render(
    <Provider store={store}>
      <SaveMenu anchorEl={document.body} open onClose={onClose} mediaId="7" />
    </Provider>
  );
  await act(async () => {});   // let the list fetch settle
};

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  savesApi.listPlaylists.mockResolvedValue(LISTS);
  savesApi.addToPlaylist.mockResolvedValue({});
  savesApi.removeFromPlaylist.mockResolvedValue({});
});
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

test("the list names are shown", async () => {
  await open();
  expect(screen.getByText("שיעורי מוסר")).toBeInTheDocument();
  expect(screen.getByText("גמרא")).toBeInTheDocument();
});

test("ticking a list closes the menu a third of a second later, not at once", async () => {
  await open();
  await act(async () => { fireEvent.click(screen.getByText("שיעורי מוסר")); });

  await act(async () => { vi.advanceTimersByTime(200); });
  expect(onClose).not.toHaveBeenCalled();

  await act(async () => { vi.advanceTimersByTime(150); });
  expect(onClose).toHaveBeenCalledTimes(1);
});

test("and a green toast names the list the lecture went into", async () => {
  await open();
  await act(async () => { fireEvent.click(screen.getByText("שיעורי מוסר")); });

  expect(savesApi.addToPlaylist).toHaveBeenCalled();
  expect(store.getState().notification).toMatchObject({
    open: true,
    severity: "success",
    message: 'השיעור נוסף לרשימה "שיעורי מוסר"',
  });
});

test("a failed add says nothing green", async () => {
  savesApi.addToPlaylist.mockRejectedValue(new Error("boom"));
  await open();
  await act(async () => { fireEvent.click(screen.getByText("שיעורי מוסר")); });

  expect(store.getState().notification.severity).not.toBe("success");
});

// Taking a lecture out is usually a correction mid-way; the menu stays put.
test("un-ticking a list leaves the menu open", async () => {
  await open();
  await act(async () => { fireEvent.click(screen.getByText("גמרא")); });
  await act(async () => { vi.advanceTimersByTime(1000); });

  expect(savesApi.removeFromPlaylist).toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});
