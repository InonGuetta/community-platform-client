// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import uiReducer from "../../../store/slicesAndThunks/uiSlice";
import mediaReducer from "../../../store/slicesAndThunks/mediaSlice/mediaSlice";
import coursesReducer from "../../../store/slicesAndThunks/coursesSlice/coursesSlice";
import notificationReducer from "../../../store/slicesAndThunks/notificationSlice";

// The archive page's own part: the upload button, offered to a lecturer or an
// admin only, and the upload dialog it opens. The filters and cards
// (ArchiveBrowser), the smart search and the dialog itself are stood in for.

// Every call answers "nothing yet" — an empty list that is also an empty page.
const nothing = () => Promise.resolve(Object.assign([], { items: [], nextCursor: null, total: 0 }));
vi.mock("../../../api/mediaApi", () => ({ mediaApi: new Proxy({}, { get: () => vi.fn(nothing) }) }));
vi.mock("../../../api/coursesApi", () => ({ coursesApi: new Proxy({}, { get: () => vi.fn(nothing) }) }));
vi.mock("./componentsArchive/ArchiveBrowser", () => ({ default: () => <div data-testid="browser" /> }));
vi.mock("../../features/SmartSearch/SmartSearch", () => ({ default: () => null }));
vi.mock("../../features/UploadMedia/UploadMedia", () => ({
  default: ({ open }) => <div data-testid="upload" data-open={String(open)} />,
}));

import ArchivePage from "./ArchivePage";

const renderAs = (role) => {
  const store = configureStore({
    reducer: {
      ui: uiReducer, media: mediaReducer, courses: coursesReducer, notification: notificationReducer,
      auth: () => ({ user: { id: 1, role } }),
    },
  });
  render(<Provider store={store}><MemoryRouter><ArchivePage /></MemoryRouter></Provider>);
  return store;
};

test("a student is offered no upload", () => {
  renderAs("student");
  expect(screen.queryByRole("button", { name: /העלאת מדיה/ })).not.toBeInTheDocument();
});

test("a lecturer's upload button opens the upload dialog", () => {
  const store = renderAs("lecturer");
  expect(screen.getByTestId("upload")).toHaveAttribute("data-open", "false");
  fireEvent.click(screen.getByRole("button", { name: /העלאת מדיה/ }));
  expect(store.getState().ui.isUploadOpen).toBe(true);
  expect(screen.getByTestId("upload")).toHaveAttribute("data-open", "true");
});
