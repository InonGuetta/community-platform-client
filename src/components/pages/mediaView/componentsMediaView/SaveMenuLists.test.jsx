// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { savesApi } from "../../../../api/savesApi";
import savesReducer from "../../../../store/slicesAndThunks/savesSlice/savesSlice";
import notificationReducer from "../../../../store/slicesAndThunks/notificationSlice";
import SaveMenu from "./SaveMenu";

// The save menu beyond ticking (SaveMenu.test.jsx): what it shows while the
// lists load or when they cannot, and making, renaming and deleting a list.
// Only the API is replaced — the thunks, the slice and the toasts are real.

vi.mock("../../../../api/savesApi", () => ({
  savesApi: {
    listPlaylists: vi.fn(),
    addToPlaylist: vi.fn(),
    removeFromPlaylist: vi.fn(),
    createPlaylist: vi.fn(),
    renamePlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
  },
}));

const LISTS = [
  { id: 1, title: "שיעורי מוסר", item_count: 1, contains: false },
  { id: 2, title: "גמרא", item_count: 4, contains: true },
];

const renderMenu = (props = {}) => {
  const store = configureStore({ reducer: { saves: savesReducer, notification: notificationReducer } });
  const onClose = vi.fn();
  const view = render(
    <Provider store={store}>
      <SaveMenu anchorEl={document.body} open onClose={onClose} mediaId="7" {...props} />
    </Provider>
  );
  const rerender = (next) => view.rerender(
    <Provider store={store}>
      <SaveMenu anchorEl={document.body} open onClose={onClose} mediaId="7" {...next} />
    </Provider>
  );
  return { store, onClose, rerender };
};

beforeEach(() => {
  vi.clearAllMocks();
  savesApi.listPlaylists.mockResolvedValue(LISTS);
  savesApi.createPlaylist.mockImplementation(async (title) => ({ id: 9, title, item_count: 1, contains: true }));
  savesApi.renamePlaylist.mockImplementation(async (playlistId, title) => ({ id: playlistId, title }));
  savesApi.deletePlaylist.mockResolvedValue(undefined);
});

describe("loading the lists", () => {
  test("asks for this lecture's lists, and shows a spinner until they arrive", async () => {
    let answer;
    savesApi.listPlaylists.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
    renderMenu();
    expect(savesApi.listPlaylists).toHaveBeenCalledWith({ mediaId: 7 });
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("שיעורי מוסר")).not.toBeInTheDocument();
    answer(LISTS);
    expect(await screen.findByText("שיעורי מוסר")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  test("a failure says so, and offers no new list", async () => {
    savesApi.listPlaylists.mockRejectedValue(new Error("500"));
    renderMenu();
    expect(await screen.findByText("טעינת הרשימות נכשלה. נסה לפתוח שוב.")).toBeInTheDocument();
    expect(screen.queryByText("רשימה חדשה")).not.toBeInTheDocument();
  });

  test("no lists yet is said as such", async () => {
    savesApi.listPlaylists.mockResolvedValue([]);
    renderMenu();
    expect(await screen.findByText("עדיין אין לך רשימות. אפשר ליצור אחת כאן.")).toBeInTheDocument();
  });

  test("closing forgets a half-typed name", async () => {
    const { rerender } = renderMenu();
    fireEvent.click(await screen.findByText("רשימה חדשה"));
    fireEvent.change(screen.getByPlaceholderText("שם הרשימה"), { target: { value: "חצי" } });
    rerender({ open: false });
    rerender({ open: true });
    fireEvent.click(await screen.findByText("רשימה חדשה"));
    expect(screen.getByPlaceholderText("שם הרשימה")).toHaveValue("");
  });
});

describe("a new list", () => {
  test("is made with the lecture in it, and the field closes", async () => {
    renderMenu();
    fireEvent.click(await screen.findByText("רשימה חדשה"));
    fireEvent.change(screen.getByPlaceholderText("שם הרשימה"), { target: { value: "  פרשת השבוע  " } });
    fireEvent.click(screen.getByRole("button", { name: "יצירה" }));
    await waitFor(() => expect(savesApi.createPlaylist).toHaveBeenCalledWith("פרשת השבוע", 7));
    await waitFor(() => expect(screen.queryByPlaceholderText("שם הרשימה")).not.toBeInTheDocument());
  });

  test("a refused one leaves the field open with what was typed", async () => {
    savesApi.createPlaylist.mockRejectedValue(new Error("409"));
    renderMenu();
    fireEvent.click(await screen.findByText("רשימה חדשה"));
    fireEvent.change(screen.getByPlaceholderText("שם הרשימה"), { target: { value: "גמרא" } });
    fireEvent.click(screen.getByRole("button", { name: "יצירה" }));
    await waitFor(() => expect(savesApi.createPlaylist).toHaveBeenCalled());
    expect(screen.getByPlaceholderText("שם הרשימה")).toHaveValue("גמרא");
  });
});

describe("renaming a list", () => {
  const rename = async (to) => {
    renderMenu();
    fireEvent.click(await screen.findByRole("button", { name: "שינוי שם הרשימה גמרא" }));
    const field = screen.getByPlaceholderText("שם הרשימה");
    expect(field).toHaveValue("גמרא");
    fireEvent.change(field, { target: { value: to } });
    fireEvent.click(screen.getByRole("button", { name: "עדכון" }));
  };

  test("closes the field once the server takes the name", async () => {
    await rename("תלמוד");
    await waitFor(() => expect(savesApi.renamePlaylist).toHaveBeenCalledWith(2, "תלמוד"));
    await waitFor(() => expect(screen.queryByPlaceholderText("שם הרשימה")).not.toBeInTheDocument());
    expect(screen.getByText("תלמוד")).toBeInTheDocument();
  });

  test("a refused name leaves the field open with what was typed", async () => {
    savesApi.renamePlaylist.mockRejectedValue(new Error("409"));
    await rename("שיעורי מוסר");
    await waitFor(() => expect(savesApi.renamePlaylist).toHaveBeenCalled());
    expect(screen.getByPlaceholderText("שם הרשימה")).toHaveValue("שיעורי מוסר");
  });
});

test("deleting a list asks first, then deletes it", async () => {
  renderMenu();
  fireEvent.click(await screen.findByRole("button", { name: "מחיקת הרשימה שיעורי מוסר" }));
  expect(savesApi.deletePlaylist).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "מחיקה" }));
  await waitFor(() => expect(savesApi.deletePlaylist).toHaveBeenCalledWith(1));
});
