// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import offlineReducer from "../../../store/slicesAndThunks/offlineSlice/offlineSlice";
import { mediaApi } from "../../../api/mediaApi";
import { fakeCaches, fakeStorage } from "../../../utilities/offlineStore.fakes";
import DownloadMenu from "./DownloadMenu";

// "שמירה להאזנה בלי רשת" in the download menu (PRD MOB-2): offered for a
// recording, not for a document; running, with how far; then done, leading to
// the downloads page.

const makeStore = () => configureStore({ reducer: { notification: notificationReducer, offline: offlineReducer } });

const renderMenu = (store, media) => {
  const anchor = document.createElement("button");
  document.body.appendChild(anchor);
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/media/1"]}>
        <Routes>
          <Route path="/media/1" element={<DownloadMenu open anchorEl={anchor} onClose={() => {}} media={media} />} />
          <Route path="/downloads" element={<div>דף ההורדות</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

const audio = { id: 1, title: "שיעור", media_type: "audio" };

beforeEach(() => {
  vi.stubGlobal("caches", fakeCaches());
  vi.stubGlobal("localStorage", fakeStorage());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("saving for offline listening from the download menu", () => {
  it("is offered for a recording", () => {
    renderMenu(makeStore(), audio);
    expect(screen.getByRole("menuitem", { name: "שמירה להאזנה בלי רשת" })).toBeInTheDocument();
  });

  it("is not offered for a document", () => {
    renderMenu(makeStore(), { ...audio, media_type: "text" });
    expect(screen.queryByRole("menuitem", { name: /האזנה בלי רשת/ })).toBeNull();
  });

  it("is not offered where the browser cannot keep files", () => {
    vi.stubGlobal("caches", undefined);
    renderMenu(makeStore(), audio);
    expect(screen.queryByRole("menuitem", { name: /האזנה בלי רשת/ })).toBeNull();
  });

  it("shows how far it has got, then that the lesson is on the device", async () => {
    let release;
    vi.spyOn(mediaApi, "fetchForListening").mockImplementation(async (_m, { onProgress }) => {
      onProgress(30, 100);
      await new Promise((resolve) => { release = resolve; });
      return new Blob(["x"]);
    });
    const store = makeStore();
    renderMenu(store, audio);
    const user = userEvent.setup();

    await user.click(screen.getByRole("menuitem", { name: "שמירה להאזנה בלי רשת" }));
    expect(await screen.findByText("שומר להאזנה… 30%")).toBeInTheDocument();

    release();
    const done = await screen.findByRole("menuitem", { name: /זמין בלי רשת/ });
    await user.click(done);
    expect(await screen.findByText("דף ההורדות")).toBeInTheDocument();
  });
});
