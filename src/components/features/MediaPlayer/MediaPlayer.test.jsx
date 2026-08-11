// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import notificationReducer from "../../../store/slicesAndThunks/notificationSlice";
import { buildTheme } from "../../../theme/theme";
import { mediaTypeAccents } from "../../../utilities/constant";

// The accents are authored as hex; getComputedStyle answers in rgb(). Converted
// here so the tests can name the shared constant rather than restate its value —
// a test that hard-codes #ef6c00 stops meaning "the same orange as the archive"
// the moment the archive's orange changes.
const hexToRgb = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

// The stage a lecture is shown on depends on whether there is anything to show.
// A video gets a black 16:9 frame; an audio lecture gets the control bar alone,
// because the frame around it was empty — and an empty black rectangle taking up
// most of the page is the kind of thing that looks deliberate and is not.
//
// Worth testing rather than eyeballing: both cases render the same components
// with the same props, and the difference is entirely in computed CSS. Nothing
// about the markup changes if the black comes back.

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
// store to mount at all.
const store = configureStore({ reducer: { notification: notificationReducer } });

const renderPlayer = (mediaType, props = {}) =>
  render(
    <Provider store={store}>
      <ThemeProvider theme={buildTheme("light")}>
        <MediaPlayer
          url="/stream/1"
          media={{ id: 1, media_type: mediaType, title: "שיעור", duration_seconds: 100 }}
          {...props}
        />
      </ThemeProvider>
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

    expect(getComputedStyle(container.firstChild).backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(paintedBackgrounds(container)).not.toContain("rgb(0, 0, 0)");
  });

  // It keeps the frame a video would have, empty, and stands its bar in the
  // middle of it. Two things depend on that: the bar lines up with the centre of
  // the side panel beside it, and the panel — which is sized from this block —
  // has a height worth having. What was removed is the black, not the space.
  test("keeps a stage's worth of space and centres the bar in it", () => {
    const { container } = renderPlayer("audio");
    const stage = getComputedStyle(container.firstChild.firstChild);

    expect(stage.aspectRatio).toBe("16/9");
    expect(stage.alignItems).toBe("center");
  });

  // The element stays in the DOM and keeps a box — it is a <video> even for
  // audio, since the stream URL carries no extension — but a box small enough to
  // paint nothing. `width: 1` would NOT do this: MUI reads a bare number between
  // 0 and 1 as a percentage, so it would mean 100%.
  test("keeps the media element rendered, at no visible size", () => {
    const { container, getByTestId } = renderPlayer("audio");
    expect(getByTestId("player")).toBeInTheDocument();

    const wrapper = getComputedStyle(container.firstChild.firstChild.firstChild);
    expect(wrapper.width).toBe("1px");
    expect(wrapper.height).toBe("1px");
    expect(wrapper.opacity).toBe("0");
  });
});

// Three things the picture area is responsible for, none of which any other
// test would notice going wrong.
describe("the video picture", () => {
  const stageOf = (container) => container.firstChild.firstChild;
  const pictureOf = (container) => stageOf(container).firstChild;
  const barOf = (container) => stageOf(container).lastChild;

  // The bar is an overlay, and one that never leaves is part of the picture.
  test("the bar is showing while paused, and hides once playback runs", async () => {
    vi.useFakeTimers();
    try {
      const { container } = renderPlayer("video");
      expect(getComputedStyle(barOf(container)).visibility).toBe("visible");

      // The picture is the play target, so clicking it starts playback.
      fireEvent.click(pictureOf(container));
      await act(async () => { vi.advanceTimersByTime(3000); });

      expect(getComputedStyle(barOf(container)).visibility).toBe("hidden");
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
      expect(getComputedStyle(barOf(container)).visibility).toBe("hidden");

      await act(async () => { fireEvent.pointerMove(stageOf(container)); });
      expect(getComputedStyle(barOf(container)).visibility).toBe("visible");
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

  // An audio lecture's bar IS the player. Hiding it would leave an empty frame.
  test("an audio bar never hides, however long it plays", async () => {
    vi.useFakeTimers();
    try {
      const { container } = renderPlayer("audio");
      fireEvent.click(screen.getByRole("button", { name: "נגינה" }));
      await act(async () => { vi.advanceTimersByTime(10000); });

      expect(getComputedStyle(barOf(container)).visibility).toBe("visible");
    } finally {
      vi.useRealTimers();
    }
  });
});

// The played portion says what KIND of lecture this is, using the same accent
// the archive card paints a video's corner brackets with. It was a fixed blue on
// everything, video included.
describe("the progress colour", () => {
  const trackColour = (container) =>
    getComputedStyle(container.querySelector(".MuiSlider-track")).backgroundColor;

  test("a video runs orange, the archive's video accent", () => {
    const { container } = renderPlayer("video");
    expect(trackColour(container)).toBe(hexToRgb(mediaTypeAccents.video));
  });

  test("an audio lecture runs its own accent instead", () => {
    const { container } = renderPlayer("audio");
    expect(trackColour(container)).toBe(hexToRgb(mediaTypeAccents.audio));
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
    expect(screen.getByText("הורדת אודיו בלבד")).toBeInTheDocument();
    expect(screen.getByText("הורדת תמלול (PDF)")).toBeInTheDocument();
  });

  // A transcript row can exist while still pending or failed, and an empty PDF
  // is worse than no option at all.
  test("with no transcript, no PDF is offered", () => {
    renderPlayer("audio");
    openSettings();

    expect(screen.getByText("הורדת אודיו")).toBeInTheDocument();
    expect(screen.queryByText("הורדת תמלול (PDF)")).not.toBeInTheDocument();
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
});
