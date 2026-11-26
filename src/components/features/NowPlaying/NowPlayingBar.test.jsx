// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter, Routes, Route, Link, useParams } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../theme/theme";
import nowPlayingReducer, { playInBar } from "../../../store/slicesAndThunks/nowPlayingSlice/nowPlayingSlice";
import mediaReducer from "../../../store/slicesAndThunks/mediaSlice/mediaSlice";

// The bottom player (D-145): mounted once beside the routes, it plays on across
// navigation, closes saving where it was, and hands the lesson over to its own
// page — the page takes the position and the bar steps aside, so one lesson is
// never in two media elements.

// A media element that is soon "ready" and keeps a seekTo, the two things
// usePlayback asks of ReactPlayer.
const seekTo = vi.hoisted(() => vi.fn());
vi.mock("react-player", async () => {
  const { forwardRef, useEffect, useImperativeHandle } = await import("react");
  return {
    default: forwardRef(({ onReady, playing }, ref) => {
      useImperativeHandle(ref, () => ({ seekTo }));
      // Later, as a real file loads — never in the commit that mounts it.
      useEffect(() => {
        const timer = setTimeout(() => onReady?.(), 0);
        return () => clearTimeout(timer);
      }, [onReady]);
      return <audio data-testid="bar-player" data-playing={String(Boolean(playing))} />;
    }),
  };
});

const api = vi.hoisted(() => ({
  getProgress: vi.fn(),
  saveProgress: vi.fn(),
  continueWatching: vi.fn(),
}));
vi.mock("../../../api/mediaApi", () => ({
  mediaApi: { ...api, streamUrl: (id) => `/api/media/${id}/stream` },
}));

import NowPlayingBar from "./NowPlayingBar";
import useTakeOver from "./useTakeOver";

const audio = { id: 7, media_type: "audio", title: "שיעור בהלכות שבת", creator_name: "הרב כהן", duration_seconds: 3600 };
const video = { id: 8, media_type: "video", title: "שיחה ליום כיפור", duration_seconds: 1200 };

// The lesson page's side of the handover, and nothing else of the page.
const LessonProbe = () => {
  const { id } = useParams();
  const taken = useTakeOver(id);
  return <div data-testid="lesson-page">{taken ? JSON.stringify(taken) : "none"}</div>;
};

const renderShell = () => {
  const store = configureStore({ reducer: { nowPlaying: nowPlayingReducer, media: mediaReducer } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={buildTheme("light")}>
        <MemoryRouter initialEntries={["/archive"]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Link to="/ask">ask</Link>
          <Routes>
            <Route path="/archive" element={<div data-testid="archive" />} />
            <Route path="/ask" element={<div data-testid="ask" />} />
            <Route path="/media/:id" element={<LessonProbe />} />
          </Routes>
          <NowPlayingBar />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const bar = () => screen.queryByRole("region", { name: "מתנגן עכשיו" });

beforeEach(() => {
  seekTo.mockClear();
  api.getProgress.mockReset().mockResolvedValue({ last_position_seconds: 120 });
  api.saveProgress.mockReset().mockResolvedValue({});
  api.continueWatching.mockReset().mockResolvedValue([]);
});

test("nothing is shown while nothing plays", () => {
  renderShell();
  expect(bar()).toBeNull();
});

test("an audio lesson: resumes where it was saved, then plays", async () => {
  const store = renderShell();
  act(() => { store.dispatch(playInBar(audio)); });
  expect(bar()).not.toBeNull();
  expect(screen.getByText(audio.title)).toBeTruthy();
  expect(screen.getByText("הרב כהן")).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId("bar-player").dataset.playing).toBe("true"));
  expect(seekTo).toHaveBeenCalledWith(120, "seconds");
  expect(screen.queryByTestId("now-playing-video")).toBeNull();
  // Every control has a name.
  for (const name of ["השהיה", "15 שניות אחורה", "15 שניות קדימה", "מהירות: 1X", "השתקה", "פתיחת דף השיעור", "סגירת הנגן"]) {
    expect(screen.getByRole("button", { name })).toBeTruthy();
  }
});

test("a video gets its window, driven by the bar", async () => {
  const store = renderShell();
  act(() => { store.dispatch(playInBar(video)); });
  expect(bar().dataset.mediaType).toBe("video");
  expect(screen.getByRole("group", { name: "הווידאו של השיעור" })).toBeTruthy();
  await waitFor(() => expect(screen.getByTestId("bar-player").dataset.playing).toBe("true"));
  await userEvent.click(screen.getByRole("button", { name: "השהיה" }));
  expect(screen.getByTestId("bar-player").dataset.playing).toBe("false");
});

test("plays on across navigation", async () => {
  const store = renderShell();
  act(() => { store.dispatch(playInBar(audio)); });
  await waitFor(() => expect(screen.getByTestId("bar-player").dataset.playing).toBe("true"));
  await userEvent.click(screen.getByRole("link", { name: "ask" }));
  expect(screen.getByTestId("ask")).toBeTruthy();
  expect(bar()).not.toBeNull();
  expect(screen.getByTestId("bar-player").dataset.playing).toBe("true");
});

test("Space plays and pauses while the bar has the focus; Escape does not close it", async () => {
  const store = renderShell();
  act(() => { store.dispatch(playInBar(audio)); });
  await waitFor(() => expect(screen.getByTestId("bar-player").dataset.playing).toBe("true"));
  bar().focus();
  fireEvent.keyDown(bar(), { key: " " });
  expect(screen.getByTestId("bar-player").dataset.playing).toBe("false");
  fireEvent.keyDown(bar(), { key: " " });
  expect(screen.getByTestId("bar-player").dataset.playing).toBe("true");
  fireEvent.keyDown(bar(), { key: "Escape" });
  expect(bar()).not.toBeNull();
});

test("closing saves the position at once", async () => {
  const store = renderShell();
  act(() => { store.dispatch(playInBar(audio)); });
  await waitFor(() => expect(seekTo).toHaveBeenCalled());
  await userEvent.click(screen.getByRole("button", { name: "סגירת הנגן" }));
  expect(bar()).toBeNull();
  expect(api.saveProgress).toHaveBeenCalledWith(7, 120);
  expect(store.getState().nowPlaying.item).toBeNull();
});

test("another item replaces the one in the bar", async () => {
  const store = renderShell();
  act(() => { store.dispatch(playInBar(audio)); });
  act(() => { store.dispatch(playInBar(video)); });
  expect(screen.queryByText(audio.title)).toBeNull();
  expect(screen.getByText(video.title)).toBeTruthy();
});

test("opening the lesson's page hands it over: the bar steps aside, the page takes the position", async () => {
  const store = renderShell();
  act(() => { store.dispatch(playInBar(audio)); });
  await waitFor(() => expect(screen.getByTestId("bar-player").dataset.playing).toBe("true"));
  await userEvent.click(screen.getByRole("button", { name: "פתיחת דף השיעור" }));
  expect(bar()).toBeNull();
  expect(screen.queryByTestId("bar-player")).toBeNull();
  const taken = JSON.parse(screen.getByTestId("lesson-page").textContent);
  expect(taken).toEqual({ id: 7, position: 120, playing: true, rate: 1 });
  // Taken once: the store no longer holds it, so a later visit resumes from the server.
  expect(store.getState().nowPlaying.handover).toBeNull();
});
