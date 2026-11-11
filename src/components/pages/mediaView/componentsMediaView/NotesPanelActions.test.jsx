// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import bookmarksReducer from "../../../../store/slicesAndThunks/bookmarksSlice/bookmarksSlice";

// What the bookmarks list sends: a renamed note, nothing for an unchanged one,
// and a delete. The rest of the panel is NotesPanel.test.jsx's.

const bookmarksApi = vi.hoisted(() => ({ update: vi.fn(), remove: vi.fn(), create: vi.fn(), list: vi.fn() }));
vi.mock("../../../../api/bookmarksApi", () => ({ bookmarksApi }));

import NotesPanel from "./NotesPanel";

const MARK = { id: 4, media_id: 7, timestamp_seconds: 65, note: "כאן" };

const renderPanel = () => {
  const store = configureStore({ reducer: { bookmarks: bookmarksReducer } });
  render(<Provider store={store}><NotesPanel bookmarks={[MARK]} currentTime={0} onCreateBookmark={vi.fn()} onSeek={vi.fn()} /></Provider>);
};

beforeEach(() => {
  vi.clearAllMocks();
  bookmarksApi.update.mockImplementation(async (id, note) => ({ ...MARK, id, note }));
  bookmarksApi.remove.mockResolvedValue(undefined);
});

test("a renamed note is sent, trimmed", async () => {
  renderPanel();
  fireEvent.click(screen.getByLabelText("עריכת ההערה"));
  const field = screen.getByLabelText("הערה");
  fireEvent.change(field, { target: { value: "  שם חדש  " } });
  fireEvent.keyDown(field, { key: "Enter" });
  await waitFor(() => expect(bookmarksApi.update).toHaveBeenCalledWith(4, "שם חדש"));
});

test("an unchanged note sends nothing", () => {
  renderPanel();
  fireEvent.click(screen.getByLabelText("עריכת ההערה"));
  fireEvent.keyDown(screen.getByLabelText("הערה"), { key: "Enter" });
  expect(bookmarksApi.update).not.toHaveBeenCalled();
  expect(screen.queryByLabelText("הערה")).not.toBeInTheDocument();
});

test("deleting sends the delete", async () => {
  renderPanel();
  fireEvent.click(screen.getByLabelText("מחיקת סימנייה"));
  await waitFor(() => expect(bookmarksApi.remove).toHaveBeenCalledWith(4));
});
