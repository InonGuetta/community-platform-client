// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// The page is a pure function of what its controller returns — that is what
// pulling the dispatches and selectors out bought, and it is why this file needs
// no store, no router and no network. Mock the one module and the whole page
// becomes a table-driven test.
//
// What is worth asserting here is the branching that the eye cannot check: which
// tabs exist for which media type, and which of the four AI/edit affordances a
// given viewer is offered. Both are decided by flags, both are silent when
// wrong — a document that offers "תמלול" opens an editor for a transcript that
// does not exist, and a viewer offered a button they cannot use gets a 403.
const controller = vi.hoisted(() => vi.fn());
vi.mock("./useMediaViewPageController", () => ({ default: controller }));

// Neither is renderable here: one loads a media file, the other reaches for the
// store. Their own behaviour is not what this file is about.
//
// forwardRef, not a plain function: the page hands the player a ref so the
// chapters list can seek it. A plain component would still render, but React
// warns on every test and a log full of warnings is a log nobody reads.
vi.mock("../../features/MediaPlayer/MediaPlayer", async () => {
  const { forwardRef } = await import("react");
  return { default: forwardRef((props, ref) => <div ref={ref} data-testid="player" />) };
});
vi.mock("./componentsMediaView/TextViewer", () => ({
  default: () => <div data-testid="text-viewer" />,
}));
vi.mock("../../features/TranscriptEditor/TranscriptEditor", () => ({
  default: () => <div data-testid="transcript-editor" />,
}));
vi.mock("./componentsMediaView/NotesPanel", () => ({
  default: () => <div data-testid="notes-panel" />,
}));
// These two call useDispatch themselves — legitimately, they own their own
// actions — which would otherwise demand a real store to render the page at all.
// Their behaviour belongs to their own tests, not to this file.
vi.mock("../../features/DownloadMenu/DownloadMenu", () => ({
  default: () => <div data-testid="download-menu" />,
}));
vi.mock("./componentsMediaView/ShareDialog", () => ({
  default: () => <div data-testid="share-dialog" />,
}));
vi.mock("./componentsMediaView/SaveMenu", () => ({
  default: () => <div data-testid="save-menu" />,
}));

import MediaViewPage from "./MediaViewPage";

const audio = { id: 7, title: "שיעור בהלכות שבת", media_type: "audio", duration_seconds: 3600 };
const book = { id: 9, title: "ספר", media_type: "text" };

const state = (over = {}) => ({
  media: audio,
  transcript: { status: "done", ai_summary: "סיכום", chunks: [{ id: 1 }], ai_key_points: ["א"] },
  bookmarks: [],
  seekOnReady: 0,
  currentTime: 0,
  handlePlayerProgress: vi.fn(),
  handleCreateBookmark: vi.fn(),
  isLiked: false,
  toggleLike: vi.fn(),
  isSaved: false,
  toggleSave: vi.fn(),
  generatingHeadings: false,
  generateHeadings: vi.fn(),
  generatingSummary: false,
  generateSummary: vi.fn(),
  isText: false,
  keyPointHeadings: [],
  canEditTranscript: false,
  canGenerateHeadings: true,
  pollingStalled: false,
  retryPolling: vi.fn(),
  ...over,
});

const renderPage = (over = {}) => {
  const value = state(over);
  controller.mockReturnValue(value);
  render(<MediaViewPage />);
  return value;
};

beforeEach(() => controller.mockReset());

test("shows a spinner rather than a broken page while the media is still loading", () => {
  renderPage({ media: null });
  expect(screen.getByRole("progressbar")).toBeInTheDocument();
  expect(screen.queryByRole("tab")).not.toBeInTheDocument();
});

// The tab set is built as a list precisely so a document can drop two of them.
// Hard-coded indices used to point at the wrong panel the moment the set changed.
describe("which tabs a media type offers", () => {
  test("audio and video get all four", () => {
    renderPage({ media: audio, isText: false });
    expect(screen.getAllByRole("tab").map((t) => t.textContent))
      .toEqual(["סיכום", "פרקים", "הערות אישיות", "תמלול"]);
  });

  // A book has no timeline to place a chapter on and no transcript to edit.
  test("a document drops chapters and transcript", () => {
    renderPage({ media: book, isText: true });
    expect(screen.getAllByRole("tab").map((t) => t.textContent))
      .toEqual(["סיכום", "הערות אישיות"]);
  });

  test("the player is only rendered for playable media", () => {
    renderPage({ media: audio, isText: false });
    expect(screen.getByTestId("player")).toBeInTheDocument();
    expect(screen.queryByTestId("text-viewer")).not.toBeInTheDocument();
  });

  test("a document gets the text viewer instead", () => {
    renderPage({ media: book, isText: true });
    expect(screen.getByTestId("text-viewer")).toBeInTheDocument();
    expect(screen.queryByTestId("player")).not.toBeInTheDocument();
  });
});

describe("the like button", () => {
  test("reads its state out, and asks the controller to flip it", async () => {
    const { toggleLike } = renderPage({ isLiked: false });
    const button = screen.getByRole("button", { name: /לייק/ });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    expect(toggleLike).toHaveBeenCalledOnce();
  });

  test("says something different once liked", () => {
    renderPage({ isLiked: true });
    const button = screen.getByRole("button", { name: /אהבתי/ });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });
});

// Saving is a split control, and the split is the part worth asserting: the wide
// half must toggle the save and the caret must NOT — a caret wired to the same
// handler would file nothing and silently unsave instead, which looks identical
// until it happens to you.
describe("the save button", () => {
  test("reads its state out, and asks the controller to flip it", async () => {
    const { toggleSave } = renderPage({ isSaved: false });
    const button = screen.getByRole("button", { name: /שמירה$/ });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(button);
    expect(toggleSave).toHaveBeenCalledOnce();
  });

  test("says something different once saved", () => {
    renderPage({ isSaved: true });
    expect(screen.getByRole("button", { name: /נשמר/ })).toHaveAttribute("aria-pressed", "true");
  });

  test("the lists caret is a separate target that does not toggle the save", async () => {
    const { toggleSave } = renderPage({ isSaved: false });
    await userEvent.click(screen.getByRole("button", { name: "הוספה לרשימת שיעורים" }));
    expect(toggleSave).not.toHaveBeenCalled();
  });
});

// "Generate summary" restarts the pipeline. For audio that means re-buying a
// three-hour Whisper transcription, which is not what the button should mean —
// so it is offered for documents only, and only to someone allowed to write.
describe("who is offered the summary action", () => {
  const generateButton = () => screen.queryByRole("button", { name: /הפק סיכום/ });

  test("a document, for someone who may edit it", () => {
    renderPage({ media: book, isText: true, canEditTranscript: true, transcript: null });
    expect(generateButton()).toBeInTheDocument();
  });

  test("not for a viewer who may not edit", () => {
    renderPage({ media: book, isText: true, canEditTranscript: false, transcript: null });
    expect(generateButton()).not.toBeInTheDocument();
  });

  test("not for audio, however privileged the viewer", () => {
    renderPage({ media: audio, isText: false, canEditTranscript: true, transcript: null });
    expect(generateButton()).not.toBeInTheDocument();
  });
});
