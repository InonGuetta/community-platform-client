// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import notificationReducer from "../../../store/slicesAndThunks/notificationSlice";
import offlineReducer from "../../../store/slicesAndThunks/offlineSlice/offlineSlice";

// The transcript entry of the download menu, for a card that knows only that a
// transcript exists: the text is fetched on the click; no text is said as such;
// a PDF that cannot be built is said too. The offline entry is
// DownloadMenu.test.jsx's.

const getTranscript = vi.hoisted(() => vi.fn());
const downloadHebrewPdf = vi.hoisted(() => vi.fn());
vi.mock("../../../api/transcriptsApi", () => ({ transcriptsApi: { get: (...a) => getTranscript(...a) } }));
vi.mock("../../../utilities/hebrewPdf", () => ({
  downloadHebrewPdf: (...a) => downloadHebrewPdf(...a),
  safeFileBaseName: (title) => title,
}));

import DownloadMenu from "./DownloadMenu";

const DOC = { id: 3, title: "קונטרס", media_type: "text" };

const renderMenu = () => {
  const store = configureStore({ reducer: { notification: notificationReducer, offline: offlineReducer } });
  const onClose = vi.fn();
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  render(
    <Provider store={store}>
      <MemoryRouter><DownloadMenu open anchorEl={anchor} onClose={onClose} media={DOC} hasTranscript /></MemoryRouter>
    </Provider>
  );
  return { store, onClose };
};
const notices = (store) => JSON.stringify(store.getState().notification);

beforeEach(() => {
  vi.clearAllMocks();
  downloadHebrewPdf.mockResolvedValue(undefined);
});

test("the text is fetched on the click and written as a PDF named for the lesson", async () => {
  getTranscript.mockResolvedValue({ chunks: [{ content: "פרק א" }] });
  const { onClose } = renderMenu();
  fireEvent.click(screen.getByText("הורדת תמלול (PDF)"));
  await waitFor(() => expect(downloadHebrewPdf).toHaveBeenCalled());
  expect(getTranscript).toHaveBeenCalledWith(3);
  expect(downloadHebrewPdf.mock.calls[0][0]).toMatchObject({ title: "קונטרס", filename: "קונטרס.pdf" });
  expect(onClose).toHaveBeenCalled();
});

test("no text is said as such, and no PDF is written", async () => {
  getTranscript.mockResolvedValue({ chunks: [] });
  const { store } = renderMenu();
  fireEvent.click(screen.getByText("הורדת תמלול (PDF)"));
  await waitFor(() => expect(notices(store)).toContain("אין תמלול זמין לפריט זה."));
  expect(downloadHebrewPdf).not.toHaveBeenCalled();
});

test("a PDF that cannot be built is said", async () => {
  getTranscript.mockResolvedValue({ chunks: [{ content: "פרק א" }] });
  downloadHebrewPdf.mockRejectedValue(new Error("font"));
  const { store } = renderMenu();
  fireEvent.click(screen.getByText("הורדת תמלול (PDF)"));
  await waitFor(() => expect(notices(store)).toContain("יצירת ה-PDF נכשלה. נסה שוב."));
});
