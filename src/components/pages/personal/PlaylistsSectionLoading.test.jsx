// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { savesApi } from "../../../api/savesApi";
import savesReducer from "../../../store/slicesAndThunks/savesSlice/savesSlice";

// The saved-lists section loading — PlaylistsSection.test.jsx draws it from a
// fixed state; this one runs the real thunk and slice against a stand-in API:
// it asks for the lists WITH their lectures, shows placeholders until they come,
// and says so when they cannot.

vi.mock("../../../api/savesApi", () => ({
  savesApi: { listPlaylists: vi.fn() },
}));

const renderSection = () => {
  const store = configureStore({
    reducer: {
      saves: savesReducer,
      auth: () => ({ user: { id: 3, role: "student" } }),
      offline: () => ({ items: [], loaded: true, progress: {} }),
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter><PlaylistsSection /></MemoryRouter>
    </Provider>
  );
};

import PlaylistsSection from "./PlaylistsSection";

beforeEach(() => vi.clearAllMocks());

test("asks for the lists with what is inside them, and shows placeholders until they come", async () => {
  let answer;
  savesApi.listPlaylists.mockReturnValue(new Promise((resolve) => { answer = resolve; }));
  const { container } = renderSection();
  expect(savesApi.listPlaylists).toHaveBeenCalledWith({ withItems: true });
  expect(container.querySelectorAll(".MuiSkeleton-root")).toHaveLength(3);
  answer([{ id: 1, title: "שיעורי מוסר", items: [], item_count: 0 }]);
  expect(await screen.findByText("שיעורי מוסר")).toBeInTheDocument();
  expect(container.querySelectorAll(".MuiSkeleton-root")).toHaveLength(0);
});

test("a failure is said, not drawn as an empty page", async () => {
  savesApi.listPlaylists.mockRejectedValue(new Error("500"));
  renderSection();
  expect(await screen.findByText("טעינת הרשימות נכשלה. נסה לרענן את העמוד.")).toBeInTheDocument();
});
