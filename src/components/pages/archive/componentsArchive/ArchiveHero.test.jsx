// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import { buildTheme } from "../../../../theme/theme";
import nowPlayingReducer, { playInBar } from "../../../../store/slicesAndThunks/nowPlayingSlice/nowPlayingSlice";
import mediaReducer from "../../../../store/slicesAndThunks/mediaSlice/mediaSlice";

// The archive's banner (D-145): its play button puts a recording or a video in
// the bottom player and stays on the archive; a book, which is read, opens its
// page as before; "פרטי השיעור" always opens the page.

vi.mock("react-player", async () => {
  const { forwardRef } = await import("react");
  return { default: forwardRef((props, ref) => <audio ref={ref} data-testid="bar-player" />) };
});
vi.mock("../../../../api/mediaApi", () => ({
  mediaApi: {
    getProgress: vi.fn().mockResolvedValue({}),
    saveProgress: vi.fn().mockResolvedValue({}),
    streamUrl: (id) => `/api/media/${id}/stream`,
  },
}));

import ArchiveHero from "./ArchiveHero";
import NowPlayingBar from "../../../features/NowPlaying/NowPlayingBar";

const audio = { id: 7, media_type: "audio", title: "שיעור בהלכות שבת", duration_seconds: 3600 };
const video = { id: 8, media_type: "video", title: "שיחה ליום כיפור", duration_seconds: 1200 };
const book = { id: 9, media_type: "text", title: "ספר המצוות" };

let onOpen;
const renderHero = (item) => {
  const store = configureStore({ reducer: { nowPlaying: nowPlayingReducer, media: mediaReducer } });
  render(
    <Provider store={store}>
      <ThemeProvider theme={buildTheme("light")}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ArchiveHero item={item} onOpen={onOpen} onPlay={(it) => store.dispatch(playInBar(it))} />
          <NowPlayingBar />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
  return store;
};

const bar = () => screen.queryByRole("region", { name: "מתנגן עכשיו" });

beforeEach(() => { onOpen = vi.fn(); });

test("play on a recording opens the bottom player and stays on the archive", async () => {
  const store = renderHero(audio);
  await userEvent.click(screen.getByRole("button", { name: "האזנה" }));
  expect(onOpen).not.toHaveBeenCalled();
  expect(bar()).not.toBeNull();
  expect(store.getState().nowPlaying.item).toMatchObject({ id: 7, media_type: "audio" });
});

test("play on a video opens the bottom player with its window", async () => {
  renderHero(video);
  await userEvent.click(screen.getByRole("button", { name: "צפייה" }));
  expect(onOpen).not.toHaveBeenCalled();
  expect(bar().dataset.mediaType).toBe("video");
  expect(screen.getByRole("group", { name: "הווידאו של השיעור" })).toBeTruthy();
});

test("a book is read: its button opens the page, and no bar", async () => {
  const store = renderHero(book);
  await userEvent.click(screen.getByRole("button", { name: "קריאה" }));
  expect(onOpen).toHaveBeenCalledWith(9);
  expect(bar()).toBeNull();
  expect(store.getState().nowPlaying.item).toBeNull();
});

test("\"פרטי השיעור\" opens the lesson page, for any type", async () => {
  const store = renderHero(audio);
  await userEvent.click(screen.getByRole("button", { name: "פרטי השיעור" }));
  expect(onOpen).toHaveBeenCalledWith(7);
  expect(store.getState().nowPlaying.item).toBeNull();
});
