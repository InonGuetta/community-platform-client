// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SmartSearchPane from "./SmartSearchPane";

// The pane is presentation only: `search` is what useAIDiscussionController
// hands it, so each state is just a different object here.

const search = (over = {}) => ({
  query: "",
  results: [],
  status: "idle",
  error: null,
  run: vi.fn(),
  reset: vi.fn(),
  ...over,
});

const recordingHit = { id: 1, chunk_index: 1, start_time: 754, page_number: null, headline: "אמר <b>תשובה</b> היא", similarity: 0.9 };
const bookHit = { id: 2, chunk_index: 5, start_time: null, page_number: 47, headline: "בעמוד הזה", similarity: 0.3 };
const textHit = { id: 3, chunk_index: 4, start_time: null, page_number: null, headline: "בלי מקום", similarity: 0.5 };

describe("searching", () => {
  test("Enter runs the search with what was typed", async () => {
    const s = search();
    render(<SmartSearchPane search={s} />);
    await userEvent.type(screen.getByRole("textbox", { name: "חיפוש בשיעור" }), "מה נאמר על תשובה{Enter}");
    expect(s.run).toHaveBeenCalledWith("מה נאמר על תשובה");
  });

  test("an empty box searches for nothing", async () => {
    const s = search();
    render(<SmartSearchPane search={s} />);
    await userEvent.type(screen.getByRole("textbox"), "   {Enter}");
    expect(s.run).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "חפש" })).toBeDisabled();
  });

  // Every search is paid for. A second Enter while one is running would only
  // race the first.
  test("a search in flight cannot be fired again", async () => {
    const s = search({ query: "תשובה", status: "loading" });
    render(<SmartSearchPane search={s} />);
    await userEvent.type(screen.getByRole("textbox"), "{Enter}");
    expect(s.run).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "חפש" })).toBeDisabled();
  });

  test("coming back to the tab shows the query that produced the results", () => {
    render(<SmartSearchPane search={search({ query: "תשובה", status: "succeeded", results: [recordingHit] })} />);
    expect(screen.getByRole("textbox")).toHaveValue("תשובה");
  });

  test("clearing empties the box and the results", async () => {
    const s = search({ query: "תשובה", status: "succeeded", results: [recordingHit] });
    render(<SmartSearchPane search={s} />);
    await userEvent.click(screen.getByRole("button", { name: "נקה חיפוש" }));
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(s.reset).toHaveBeenCalled();
  });
});

describe("what comes back", () => {
  test("no results says so, and points at the chat", () => {
    render(<SmartSearchPane search={search({ query: "x", status: "succeeded", results: [] })} />);
    expect(screen.getByTestId("search-empty")).toHaveTextContent("דיון עם בינה מלאכותית");
  });

  test("a failure is shown in Hebrew, never the server's English", () => {
    render(<SmartSearchPane search={search({ status: "failed", error: { code: "SOMETHING", message: "Internal error" } })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("החיפוש נכשל");
    expect(screen.queryByText(/Internal error/)).not.toBeInTheDocument();
  });

  test("matched words are marked, as text", () => {
    render(<SmartSearchPane search={search({ status: "succeeded", results: [recordingHit] })} onSeek={() => {}} />);
    const mark = screen.getByText("תשובה", { selector: "mark" });
    expect(mark).toBeInTheDocument();
  });

  test("only a clearly relevant hit is marked as such", () => {
    render(<SmartSearchPane search={search({ status: "succeeded", results: [recordingHit, bookHit] })} />);
    const [strong, weak] = screen.getAllByTestId("search-hit");
    expect(within(strong).getByText("התאמה גבוהה")).toBeInTheDocument();
    expect(within(weak).queryByText("התאמה גבוהה")).not.toBeInTheDocument();
  });
});

describe("opening a hit", () => {
  test("a moment in a recording seeks the player", async () => {
    const onSeek = vi.fn();
    render(<SmartSearchPane search={search({ status: "succeeded", results: [recordingHit] })} onSeek={onSeek} />);
    await userEvent.click(screen.getByRole("button", { name: "נגן מ־12:34" }));
    expect(onSeek).toHaveBeenCalledWith(754);
  });

  test("a page of a book opens the reader there", async () => {
    const onOpenPage = vi.fn();
    render(<SmartSearchPane search={search({ status: "succeeded", results: [bookHit] })} isText onOpenPage={onOpenPage} />);
    await userEvent.click(screen.getByRole("button", { name: /עמ' 47/ }));
    expect(onOpenPage).toHaveBeenCalledWith(47);
  });

  // A hit with no time and no page has nowhere to go; a button would be a
  // click that does nothing.
  test("a hit with nowhere to open is not a button", () => {
    render(<SmartSearchPane search={search({ status: "succeeded", results: [textHit] })} isText onOpenPage={() => {}} />);
    const hit = screen.getByTestId("search-hit");
    expect(within(hit).queryByRole("button")).not.toBeInTheDocument();
    expect(within(hit).getByText("קטע 5")).toBeInTheDocument();
  });

  test("a recording's hit is not a button where no player was handed over", () => {
    render(<SmartSearchPane search={search({ status: "succeeded", results: [recordingHit] })} />);
    expect(within(screen.getByTestId("search-hit")).queryByRole("button")).not.toBeInTheDocument();
  });
});
