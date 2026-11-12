// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import authReducer from "../../../store/slicesAndThunks/authSlice/authSlice";
import offlineReducer from "../../../store/slicesAndThunks/offlineSlice/offlineSlice";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import { fetchMe } from "../../../store/slicesAndThunks/authSlice/authGet";
import ProtectedRoute from "../auth/ProtectedRoute";
import DownloadsPage from "./DownloadsPage";
import { lessonByline, lessonDetails, progressLabel, storageLine } from "./downloadsText";
import { resumeAt } from "./useOfflinePlayer";
import { fakeCaches, fakeStorage } from "../../../utilities/offlineStore.fakes";
import { storeOffline, writeIndex, readIndex } from "../../../utilities/offlineStore";
import { authApi } from "../../../api/authApi";

// "הורדות להאזנה" (PRD MOB-2): the page that must work with no server.

vi.mock("../../../api/authApi", () => ({ authApi: { me: vi.fn() } }));

const makeStore = () =>
  configureStore({ reducer: { auth: authReducer, offline: offlineReducer, notification: notificationReducer } });

const renderApp = (store, path) =>
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/sign-in" element={<div>טופס כניסה</div>} />
          <Route path="/archive" element={<ProtectedRoute><div>הארכיון</div></ProtectedRoute>} />
          <Route path="/downloads" element={<ProtectedRoute offlineOk><DownloadsPage /></ProtectedRoute>} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );

// What "who am I" looks like when nothing answers — the code axiosInstance
// gives a request with no response.
const noServer = () => {
  const err = new Error("Network Error");
  err.response = { data: { code: "NETWORK_UNREACHABLE", message: "Cannot reach the server." } };
  return err;
};
const signedOut = () => {
  const err = new Error("401");
  err.response = { status: 401, data: { code: "UNAUTHORIZED", message: "No token" } };
  return err;
};

beforeEach(() => {
  vi.stubGlobal("caches", fakeCaches());
  vi.stubGlobal("localStorage", fakeStorage());
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("with no server to ask", () => {
  it("sends the reader to their downloads, not to a sign-in form that cannot work", async () => {
    authApi.me.mockRejectedValue(noServer());
    const store = makeStore();
    await store.dispatch(fetchMe());
    expect(store.getState().auth.unreachable).toBe(true);

    renderApp(store, "/archive");
    expect(await screen.findByRole("heading", { name: "הורדות להאזנה" })).toBeInTheDocument();
    expect(screen.getByText(/אין חיבור לשרת/)).toBeInTheDocument();
    expect(screen.queryByText("טופס כניסה")).toBeNull();
  });

  it("still sends a signed-out reader to sign in when the server answered", async () => {
    authApi.me.mockRejectedValue(signedOut());
    const store = makeStore();
    await store.dispatch(fetchMe());
    expect(store.getState().auth.unreachable).toBe(false);

    renderApp(store, "/downloads");
    expect(await screen.findByText("טופס כניסה")).toBeInTheDocument();
  });

  it("plays what is saved, with no link to a lesson page it could not open", async () => {
    await storeOffline({ id: 4, title: "הלכות שבת", media_type: "audio", creator_name: "הרב לוי", course_title: "הלכה" }, new Blob(["abc"], { type: "audio/mpeg" }));
    authApi.me.mockRejectedValue(noServer());
    const store = makeStore();
    await store.dispatch(fetchMe());

    renderApp(store, "/downloads");
    expect(await screen.findByText("הלכות שבת")).toBeInTheDocument();
    expect(screen.getByText("הרב לוי · הלכה")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /לדף השיעור/ })).toBeNull();

    URL.createObjectURL = vi.fn(() => "blob:lesson-4");
    URL.revokeObjectURL = vi.fn();
    await userEvent.setup().click(screen.getByRole("button", { name: "האזנה להלכות שבת" }));
    await vi.waitFor(() => expect(document.querySelector("audio")?.getAttribute("src")).toBe("blob:lesson-4"));
  });
});

describe("signed in", () => {
  const signIn = async (store) => {
    authApi.me.mockResolvedValue({ id: 1, role: "student", display_name: "דנה" });
    await store.dispatch(fetchMe());
  };

  it("explains how to save a lesson when there are none", async () => {
    const store = makeStore();
    await signIn(store);
    renderApp(store, "/downloads");
    expect(await screen.findByText("עוד לא הורדתם שיעורים")).toBeInTheDocument();
    expect(screen.queryByText(/אין חיבור לשרת/)).toBeNull();
  });

  it("deletes everything only after asking", async () => {
    await storeOffline({ id: 4, title: "א", media_type: "audio" }, new Blob(["a"]));
    await storeOffline({ id: 5, title: "ב", media_type: "video" }, new Blob(["b"]));
    const store = makeStore();
    await signIn(store);
    renderApp(store, "/downloads");
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "מחיקת הכל" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/כל 2 השיעורים/)).toBeInTheDocument();
    expect(readIndex().items).toHaveLength(2);

    await user.click(within(dialog).getByRole("button", { name: "מחיקת הכל" }));
    expect(await screen.findByText("עוד לא הורדתם שיעורים")).toBeInTheDocument();
    expect(readIndex().items).toHaveLength(0);
  });

  it("drops a lesson whose file the browser evicted", async () => {
    writeIndex({ ownerId: 1, items: [{ id: 8, title: "נמחק", media_type: "audio", size: 1, savedAt: new Date().toISOString(), position: 0 }] });
    const store = makeStore();
    await signIn(store);
    renderApp(store, "/downloads");
    expect(await screen.findByText("עוד לא הורדתם שיעורים")).toBeInTheDocument();
    expect(screen.queryByText("נמחק")).toBeNull();
  });
});

describe("the page's words", () => {
  it("names the lecturer only when one was recorded", () => {
    expect(lessonByline({ creator_name: "הרב כהן", course_title: "גמרא" })).toBe("הרב כהן · גמרא");
    expect(lessonByline({ creator_name: "כללי" })).toBe("");
  });

  it("says when a video was kept as its audio", () => {
    const line = lessonDetails({ media_type: "video", duration_seconds: 3725, size: 5 * 1024 * 1024, savedAt: "2026-11-02T10:00:00Z" });
    expect(line).toBe("שמע מתוך וידאו · 1:02:05 · 5.0 MB · נשמר 2 בנובמבר 2026");
  });

  it("shows a percentage, or how much so far when the size is unknown", () => {
    expect(progressLabel({ received: 50, total: 200 })).toBe("25%");
    expect(progressLabel({ received: 3 * 1024 * 1024, total: null })).toBe("3.0 MB עד עכשיו");
  });

  it("adds the free space only where the browser says it", () => {
    const mb = 1024 * 1024;
    expect(storageLine(20 * mb, null)).toBe("השיעורים תופסים 20 MB");
    expect(storageLine(20 * mb, { usage: 30 * mb, quota: 1054 * mb })).toBe("השיעורים תופסים 20 MB · פנויים עוד כ-1.0 GB");
  });
});

describe("resuming", () => {
  it("starts where the listener stopped, or from the start near the end", () => {
    expect(resumeAt(120, 600)).toBe(120);
    expect(resumeAt(598, 600)).toBe(0);
    expect(resumeAt(0, 600)).toBe(0);
    expect(resumeAt(120, NaN)).toBe(0);
  });
});
