// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { discussionReadiness, DISCUSSION_MODES } from "../../useAIDiscussionController";

// The panel is a function of what its controller returns, so the controller is
// mocked — except `discussionReadiness` and the modes, which are the real ones.
const controller = vi.hoisted(() => vi.fn());
vi.mock("../../useAIDiscussionController", async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, default: controller };
});

import AIDiscussionPanel from "./AIDiscussionPanel";

// A controller whose mode really switches, so the toggle can be driven. Plain
// state outside React plus a rerender: a hook in a mock factory runs against a
// second copy of React under vitest's module graph.
let currentMode;
const useFakeController = (readiness) => {
  currentMode = DISCUSSION_MODES.chat;
  return () => ({
    mode: currentMode,
    setMode: (next) => { currentMode = next; },
    readiness,
    // The controller's real shape: the search pane is no longer a stub and
    // reads every field of it.
    search: { query: "", results: [], status: "idle", error: null, run: () => {}, reset: () => {} },
    chat: {
      conversation: null, messages: [], loadStatus: "succeeded", loadError: null,
      asking: false, askError: null,
      ask: async () => true, startNew: () => {}, dismissAskError: () => {}, retryLoad: () => {},
    },
  });
};

describe("whether there is anything to discuss", () => {
  // Chunks, not status === "done": a recording's chunks exist while its summary
  // is still being written, and the tab should work in those minutes.
  test("a lesson with chunks is ready, whatever its status", () => {
    expect(discussionReadiness({ status: "analyzing", chunks: [{ id: 1 }] })).toBe("ready");
    expect(discussionReadiness({ status: "done", chunks: [{ id: 1 }] })).toBe("ready");
  });

  test("a lesson still in the pipeline is processing", () => {
    for (const status of ["pending", "processing", "analyzing"]) {
      expect(discussionReadiness({ status, chunks: [] })).toBe("processing");
    }
  });

  test("a failed pipeline, and a lesson never processed, are told apart", () => {
    expect(discussionReadiness({ status: "error", chunks: [] })).toBe("error");
    expect(discussionReadiness({ status: "done", chunks: [] })).toBe("empty");
  });

  // Seen in the browser: an 816-chunk book whose transcript read answered 503
  // was told it had no text. A transcript that did not load is not empty.
  test("a transcript that did not load is not 'no text'", () => {
    expect(discussionReadiness(null)).toBe("unavailable");
    expect(discussionReadiness(undefined)).toBe("unavailable");
  });

  // A book's summary can fail while its text is fine; the text is what the
  // discussion needs.
  test("a failed summary over text that exists is still ready", () => {
    expect(discussionReadiness({ status: "error", chunks: [{ id: 1 }] })).toBe("ready");
  });
});

describe("the panel", () => {
  beforeEach(() => controller.mockReset());

  test("opens on the chat, and the switch moves to the search and back", async () => {
    controller.mockImplementation(useFakeController("ready"));
    const ui = () => <AIDiscussionPanel mediaId={7} transcript={null} />;
    const { rerender } = render(ui());

    expect(screen.getByTestId("chat-empty")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "שיחה עם AI" })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: "חיפוש חכם" }));
    rerender(ui());
    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-empty")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "שיחה עם AI" }));
    rerender(ui());
    expect(screen.getByTestId("chat-empty")).toBeInTheDocument();
  });

  test("pressing the active mode again does not leave the panel with no mode", async () => {
    controller.mockImplementation(useFakeController("ready"));
    const ui = () => <AIDiscussionPanel mediaId={7} transcript={null} />;
    const { rerender } = render(ui());
    await userEvent.click(screen.getByRole("button", { name: "שיחה עם AI" }));
    rerender(ui());
    expect(currentMode).toBe(DISCUSSION_MODES.chat);
    expect(screen.getByTestId("chat-empty")).toBeInTheDocument();
  });

  test.each([
    ["processing", /עדיין בעיבוד/],
    ["error", /עיבוד השיעור נכשל/],
    ["empty", /עדיין אין תמלול/],
    ["unavailable", /לא הצלחנו לטעון/],
  ])("%s: says why instead of offering panes that cannot work", (readiness, text) => {
    controller.mockImplementation(useFakeController(readiness));
    render(<AIDiscussionPanel mediaId={7} transcript={null} />);
    expect(screen.getByTestId("discussion-not-ready")).toHaveTextContent(text);
    expect(screen.queryByTestId("chat-empty")).not.toBeInTheDocument();
    expect(screen.queryByRole("search")).not.toBeInTheDocument();
  });

  test("says it answers from the book, for a book", () => {
    controller.mockImplementation(useFakeController("ready"));
    render(<AIDiscussionPanel mediaId={7} transcript={null} isText />);
    expect(screen.getByText(/על הספר הזה בלבד/)).toBeInTheDocument();
  });
});
