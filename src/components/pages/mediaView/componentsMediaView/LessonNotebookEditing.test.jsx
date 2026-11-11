// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "../../../../store/slicesAndThunks/notesSlice/notesSlice";
import notificationReducer from "../../../../store/slicesAndThunks/notificationSlice";

// Editing a note under a lesson — the drafts, the save, Ctrl+S and deletion —
// which the notebook page does by the same rules (NotebookEditing.test.jsx),
// except where this strip deliberately differs: Ctrl+S is taken only when a
// card has the caret, and a new card is scrolled to the middle of the view.

const listNotes = vi.hoisted(() => vi.fn());
const createNote = vi.hoisted(() => vi.fn());
const updateNote = vi.hoisted(() => vi.fn());
const removeNote = vi.hoisted(() => vi.fn());

vi.mock("../../../../api/bookmarksApi", () => ({
  bookmarksApi: {
    create: vi.fn(async (payload) => ({ id: 500, ...payload })),
    update: vi.fn(), remove: vi.fn(), list: vi.fn(),
  },
}));
vi.mock("../../../../api/notesApi", () => ({
  notesApi: {
    aboutMedia: (...args) => listNotes(...args),
    list: vi.fn(),
    create: (...args) => createNote(...args),
    update: (...args) => updateNote(...args),
    remove: (...args) => removeNote(...args),
    reorder: vi.fn(),
  },
}));
vi.mock("./SourcePreviewDialog", () => ({ default: () => null }));

import LessonNotebook from "./LessonNotebook";

const LESSON = { id: 49, title: "שיחה על שמירת הברית", media_type: "audio" };
const NOTE = { id: 30, title: "יש שם", body: "<p>תוכן</p>", media_id: 49, media_title: LESSON.title, media_type: "audio" };

const renderNotebook = async () => {
  const store = configureStore({ reducer: { notes: notesReducer, notification: notificationReducer } });
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LessonNotebook media={LESSON} isText={false} currentTime={12} readerPage={null} bookmarks={[]} onSeek={vi.fn()} onJumpTo={vi.fn()} />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(listNotes).toHaveBeenCalled());
  return store;
};

const body = () => screen.findByRole("textbox", { name: "גוף ההערה" });
const saveButton = () => screen.getByRole("button", { name: /^שמירה/ });
const notices = (store) => JSON.stringify(store.getState().notification);
const ctrlS = () => fireEvent.keyDown(window, { key: "s", ctrlKey: true });

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.scrollIntoView = vi.fn();
  // A focused editor reads the toolbar's state off the selection; jsdom has no
  // execCommand state to read.
  document.queryCommandValue = vi.fn(() => "");
  document.queryCommandState = vi.fn(() => false);
  listNotes.mockResolvedValue([NOTE]);
  updateNote.mockImplementation(async (id, { title, body: text }) => ({ id, title, body: text }));
  removeNote.mockResolvedValue(undefined);
});

describe("a draft", () => {
  test("is kept when its save fails, and dropped when one succeeds", async () => {
    await renderNotebook();
    fireEvent.input(await body(), { target: { innerHTML: "<p>שונה</p>" } });
    expect(saveButton()).toBeEnabled();

    updateNote.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(saveButton());
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(1));
    expect(saveButton()).toBeEnabled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(updateNote).toHaveBeenCalledTimes(2));
    expect(updateNote).toHaveBeenLastCalledWith(30, expect.objectContaining({ title: "יש שם", body: "<p>שונה</p>" }));
    await waitFor(() => expect(saveButton()).toBeDisabled());
  });
});

describe("Ctrl+S", () => {
  test("with no card holding the caret is left to the browser, and says nothing", async () => {
    const store = await renderNotebook();
    await body();
    let notPrevented;
    await act(async () => { notPrevented = ctrlS(); });
    expect(notPrevented).toBe(true);
    expect(updateNote).not.toHaveBeenCalled();
    expect(notices(store)).not.toContain("לא נבחרה הערה");
  });

  test("in a card with nothing changed is taken, and says so", async () => {
    const store = await renderNotebook();
    const editor = await body();
    await act(async () => { fireEvent.focus(editor); });
    let notPrevented;
    await act(async () => { notPrevented = ctrlS(); });
    expect(notPrevented).toBe(false);
    expect(notices(store)).toContain("אין שינויים לשמירה");
    expect(updateNote).not.toHaveBeenCalled();
  });

  test("in a card with a change saves it, and announces it", async () => {
    const store = await renderNotebook();
    const editor = await body();
    await act(async () => { fireEvent.focus(editor); });
    fireEvent.input(editor, { target: { innerHTML: "<p>חדש</p>" } });
    await act(async () => { ctrlS(); });
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith(30, expect.objectContaining({ body: "<p>חדש</p>" })));
    await waitFor(() => expect(notices(store)).toContain("ההערה נשמרה"));
  });
});

describe("deleting a note", () => {
  const deleteAndConfirm = async () => {
    await renderNotebook();
    fireEvent.input(await body(), { target: { innerHTML: "<p>טיוטה</p>" } });
    fireEvent.click(screen.getByRole("button", { name: "מחיקת ההערה יש שם" }));
    fireEvent.click(await screen.findByRole("button", { name: "מחיקה" }));
  };

  // `hidden: true`, and the dialog awaited: while it closes, MUI marks the rest
  // of the page aria-hidden, and a plain query would find nothing either way.
  const dialogClosed = () => waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());

  test("waits for the server: a failed delete leaves the card and its draft", async () => {
    removeNote.mockRejectedValueOnce(new Error("offline"));
    await deleteAndConfirm();
    await waitFor(() => expect(removeNote).toHaveBeenCalledWith(30));
    await dialogClosed();
    expect(screen.getByRole("textbox", { name: "גוף ההערה" })).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
  });

  test("a delete that succeeds removes the card", async () => {
    await deleteAndConfirm();
    await dialogClosed();
    await waitFor(() => expect(screen.queryByRole("textbox", { name: "גוף ההערה", hidden: true })).not.toBeInTheDocument());
  });
});

test("a new note's card is scrolled to the middle of the view", async () => {
  createNote.mockImplementation(async (payload) => ({ id: 77, ...payload, title: "" }));
  await renderNotebook();
  await body();
  fireEvent.click(screen.getByRole("button", { name: /הערה חדשה/ }));
  await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" }));
});
