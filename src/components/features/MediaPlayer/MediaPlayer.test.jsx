// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { MemoryRouter } from "react-router-dom";
import notificationReducer from "../../../store/slicesAndThunks/snackbarSlice";
import offlineReducer from "../../../store/slicesAndThunks/offlineSlice/offlineSlice";
import { buildTheme } from "../../../theme/theme";
import { COLORS } from "../../../theme/tokens";

// The accent is authored as hex; getComputedStyle answers in rgb(). Converted
// here so the tests can name the token rather than restate its value.
const hexToRgb = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

// The shape a lecture is shown in depends on whether there is anything to show.
// A video gets a black 16:9 frame; an audio lecture gets a player card (Redesign
// v4, D-21) — its picture is the cover art the page draws above it.
//
// Worth testing rather than eyeballing: much of the difference is in computed
// CSS, and nothing about the markup changes if the black comes back.

// ReactPlayer reaches for a real media element and a network stream. What it
// renders is not what is under test — that the element keeps its box, and how
// big that box is, is.
//
// forwardRef, not a plain function: MediaPlayer holds a ref on the player so
// chapters and notes can seek it. A plain component still renders, but React
// warns on every test, and a log full of warnings is a log nobody reads.
vi.mock("react-player", async () => {
  const { forwardRef } = await import("react");
  return { default: forwardRef((props, ref) => <video ref={ref} data-testid="player" />) };
});

// The bar's settings menu offers the same downloads as the page's download pill
// — one shared hook, which reports a failed PDF through the store. Nothing here
// opens that menu, but the hook is called on every render, so the tree needs a
// store to mount at all — and, since it offers saving the lesson for offline
// listening (PRD MOB-2) with a link to the downloads, the offline slice and a
// router too.
const store = configureStore({ reducer: { notification: notificationReducer, offline: offlineReducer } });

const renderPlayer = (mediaType, props = {}) =>
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ThemeProvider theme={buildTheme("light")}>
          <MediaPlayer
            url="/stream/1"
            media={{ id: 1, media_type: mediaType, title: "שיעור", duration_seconds: 100 }}
            {...props}
          />
        </ThemeProvider>
      </MemoryRouter>
    </Provider>
  );

const { default: MediaPlayer } = await import("./MediaPlayer");

// Every background actually painted anywhere in the tree, so a black surface
// cannot hide on some inner element the assertions did not think to name.
const paintedBackgrounds = (container) =>
  [...container.querySelectorAll("*")]
    .map((el) => getComputedStyle(el).backgroundColor)
    .filter((colour) => colour && colour !== "rgba(0, 0, 0, 0)" && colour !== "transparent");

describe("an audio lecture", () => {
  test("paints no black surface at all", () => {
    const { container } = renderPlayer("audio");
    expect(paintedBackgrounds(container)).not.toContain("rgb(0, 0, 0)");
  });

  // A card, not an empty stage: nothing reserves a 16:9 frame any more, since
  // the tabs card no longer takes its height from the player (D-22).
  test("is a card with no stage", () => {
    const { container } = renderPlayer("audio");
    expect(screen.getByTestId("player-card")).toBeInTheDocument();
    const ratios = [...container.querySelectorAll("*")].map((el) => getComputedStyle(el).aspectRatio);
    expect(ratios).not.toContain("16/9");
  });

  // The element stays in the DOM and keeps a box — it is a <video> even for
  // audio, since the stream URL carries no extension — but a box small enough to
  // paint nothing. `width: 1` would NOT do this: MUI reads a bare number between
  // 0 and 1 as a percentage, so it would mean 100%.
  test("keeps the media element rendered, at no visible size", () => {
    const { getByTestId } = renderPlayer("audio");
    expect(getByTestId("player")).toBeInTheDocument();

    const wrapper = getComputedStyle(getByTestId("player-element"));
    expect(wrapper.width).toBe("1px");
    expect(wrapper.height).toBe("1px");
    expect(wrapper.opacity).toBe("0");
  });

  // D-21: play, the line and its times, and a row of the secondary buttons —
  // nothing the old bar offered is gone.
  test("offers play, the position, the times, volume and settings", () => {
    renderPlayer("audio");
    expect(screen.getByRole("button", { name: "נגינה" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "מיקום בשיעור" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "השתקה" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "הגדרות נגן" })).toBeInTheDocument();
    expect(screen.getByTestId("player-controls")).toHaveTextContent("1:40");
  });

  // An audio lecture's controls ARE the player. Nothing in its card fades.
  test("never hides its controls, however long it plays", async () => {
    vi.useFakeTimers();
    try {
      renderPlayer("audio");
      fireEvent.click(screen.getByRole("button", { name: "נגינה" }));
      await act(async () => { vi.advanceTimersByTime(10000); });

      expect(screen.queryByTestId("player-bar")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "השהיה" })).toBeVisible();
    } finally {
      vi.useRealTimers();
    }
  });
});

// Three things the picture area is responsible for, none of which any other
// test would notice going wrong.
describe("the video picture", () => {
  const stageOf = (container) => container.firstChild.firstChild;
  const pictureOf = (container) => stageOf(container).firstChild;
  const barOf = () => screen.getByTestId("player-bar");

  // The bar is an overlay, and one that never leaves is part of the picture.
  test("the bar is showing while paused, and hides once playback runs", async () => {
    vi.useFakeTimers();
    try {
      const { container } = renderPlayer("video");
      expect(getComputedStyle(barOf()).visibility).toBe("visible");

      // The picture is the play target, so clicking it starts playback.
      fireEvent.click(pictureOf(container));
      await act(async () => { vi.advanceTimersByTime(3000); });

      expect(getComputedStyle(barOf()).visibility).toBe("hidden");
    } finally {
      vi.useRealTimers();
    }
  });

  test("moving the pointer brings it back", async () => {
    vi.useFakeTimers();
    try {
      const { container } = renderPlayer("video");
      fireEvent.click(pictureOf(container));
      await act(async () => { vi.advanceTimersByTime(3000); });
      expect(getComputedStyle(barOf()).visibility).toBe("hidden");

      await act(async () => { fireEvent.pointerMove(stageOf(container)); });
      expect(getComputedStyle(barOf()).visibility).toBe("visible");
    } finally {
      vi.useRealTimers();
    }
  });

  // Play, pause, play again — from the picture alone.
  test("clicking it toggles playback both ways", () => {
    const { container } = renderPlayer("video");
    const picture = pictureOf(container);

    fireEvent.click(picture);
    expect(screen.getByRole("button", { name: "השהיה" })).toBeInTheDocument();

    fireEvent.click(picture);
    expect(screen.getByRole("button", { name: "נגינה" })).toBeInTheDocument();
  });
});

// The played portion is the accent, for every kind of lecture (Redesign v4,
// part B). It used to take the media type's colour from mediaTypeAccents.
describe("the progress colour", () => {
  const trackColour = (container) =>
    getComputedStyle(container.querySelector(".MuiSlider-track")).backgroundColor;

  test.each(["video", "audio"])("a %s runs in the accent", (type) => {
    const { container } = renderPlayer(type);
    expect(trackColour(container)).toBe(hexToRgb(COLORS.light.accent));
  });
});

// The settings menu and the download pill under the panel are two ways to the
// same set of downloads, and they are built from one hook (downloadOptions.jsx)
// for exactly that reason. They were written separately and drifted: the pill
// grew a transcript PDF and this menu never did, so the same lecture offered
// different downloads depending on which control the user opened.
describe("the downloads in the settings menu", () => {
  const openSettings = () => fireEvent.click(screen.getByRole("button", { name: "הגדרות נגן" }));

  test("a video offers the file, its audio, and the transcript PDF", () => {
    renderPlayer("video", { transcript: { edited_text: "שורה" } });
    openSettings();

    expect(screen.getByText("הורדת וידאו")).toBeInTheDocument();
    expect(screen.getByText("הורדת שמע בלבד")).toBeInTheDocument();
    expect(screen.getByText("הורדת תמלול (PDF)")).toBeInTheDocument();
  });

  // A transcript row can exist while still pending or failed, and an empty PDF
  // is worse than no option at all.
  test("with no transcript, no PDF is offered", () => {
    renderPlayer("audio");
    openSettings();

    expect(screen.getByText("הורדת שמע")).toBeInTheDocument();
    expect(screen.queryByText("הורדת תמלול (PDF)")).not.toBeInTheDocument();
  });

  // The speeds are in the same menu, in both shapes of the player.
  test("an audio card's menu sets the speed", () => {
    renderPlayer("audio");
    openSettings();
    fireEvent.click(screen.getByRole("menuitem", { name: "1.5X" }));
    openSettings();
    expect(screen.getByRole("menuitem", { name: "1.5X" })).toHaveClass("Mui-selected");
  });
});

describe("a video lecture", () => {
  // The same frame, but painted — and with the bar pushed to the bottom edge so
  // it sits over the picture rather than in the middle of it.
  test("keeps its black 16:9 stage, with the bar at the foot of it", () => {
    const { container } = renderPlayer("video");
    const stage = getComputedStyle(container.firstChild.firstChild);

    expect(getComputedStyle(container.firstChild).backgroundColor).toBe("rgb(0, 0, 0)");
    expect(stage.aspectRatio).toBe("16/9");
    expect(stage.alignItems).toBe("flex-end");
  });

  // Redesign v4, part B: the video player's radius is 28.
  test("rounds its corners at the player's radius", () => {
    const { container } = renderPlayer("video");
    expect(getComputedStyle(container.firstChild).borderRadius).toBe("28px");
  });
});

// Captions (PRD MOB-5): a button in the bar when the lesson has any, and the
// line being said drawn over the picture — or inside a recording's player card,
// since an <audio> shows no captions of its own.
describe("captions", () => {
  const captions = {
    precise: true,
    cues: [
      { text: "שלום לכולם", start: 0, end: 4 },
      { text: "היום נלמד דף", start: 4, end: 8 },
    ],
  };

  test("offers no button when the lesson has nothing to caption", () => {
    renderPlayer("video");
    expect(screen.queryByRole("button", { name: "כתוביות" })).not.toBeInTheDocument();
  });

  test.each(["video", "audio"])("a %s shows the line being said once captions are turned on", (type) => {
    localStorage.removeItem("captionsOn");
    renderPlayer(type, { captions });
    const button = screen.getByRole("button", { name: "כתוביות" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("player-caption")).not.toBeInTheDocument();

    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTestId("player-caption")).toHaveTextContent("שלום לכולם");
    // Remembered for the next lesson.
    expect(localStorage.getItem("captionsOn")).toBe("1");
    fireEvent.click(button);
    expect(screen.queryByTestId("player-caption")).not.toBeInTheDocument();
  });

  test("the settings menu offers the captions as a file", () => {
    renderPlayer("video", {
      captions,
      transcript: { chunks: [{ content: "שלום לכולם היום נלמד דף", start_time: 0, end_time: 8 }], timing: null },
    });
    fireEvent.click(screen.getByRole("button", { name: "הגדרות נגן" }));
    expect(screen.getByText("הורדת כתוביות (VTT)")).toBeInTheDocument();
  });
});
