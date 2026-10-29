// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryPane from "./HistoryPane";

// The history of the "דיון עם AI" chat. Presentation only: `history` is what
// useAIDiscussionController hands it.

const closed = { conversationId: null, conversation: null, messages: [], status: "idle", error: null };

const history = (over = {}) => ({
  items: [],
  status: "succeeded",
  error: null,
  currentId: null,
  viewing: closed,
  open: vi.fn(),
  close: vi.fn(),
  continueConversation: vi.fn(async () => true),
  retry: vi.fn(),
  remove: vi.fn(async () => true),
  deletingId: null,
  deleteError: null,
  ...over,
});

const older = { id: 3, updated_at: "2026-10-20T10:00:00Z", questions: 4, first_question: "מה כתוב על תפילין?" };
const current = { id: 9, updated_at: "2026-10-27T10:00:00Z", questions: 1, first_question: "למה אוכלים מצה?" };

describe("the list", () => {
  test("each conversation is titled by its first question, with how many it holds", () => {
    render(<HistoryPane history={history({ items: [current, older], currentId: 9 })} />);
    const [first, second] = screen.getAllByTestId("history-item");
    expect(first).toHaveTextContent("למה אוכלים מצה?");
    expect(first).toHaveTextContent("שאלה אחת");
    expect(second).toHaveTextContent("4 שאלות");
  });

  test("the current conversation is marked, and only it", () => {
    render(<HistoryPane history={history({ items: [current, older], currentId: 9 })} />);
    const [first, second] = screen.getAllByTestId("history-item");
    expect(within(first).getByText("השיחה הנוכחית")).toBeInTheDocument();
    expect(within(second).queryByText("השיחה הנוכחית")).not.toBeInTheDocument();
  });

  test("clicking a conversation opens it", async () => {
    const h = history({ items: [older] });
    render(<HistoryPane history={h} />);
    await userEvent.click(screen.getByText("מה כתוב על תפילין?"));
    expect(h.open).toHaveBeenCalledWith(3);
  });

  test("no conversations yet says so, in the book's words for a book", () => {
    render(<HistoryPane history={history()} isText />);
    expect(screen.getByTestId("history-empty")).toHaveTextContent("על הספר הזה");
  });

  test("a list that failed to load says so and can be retried", async () => {
    const h = history({ status: "failed", error: { code: "DB_UNAVAILABLE" } });
    render(<HistoryPane history={h} />);
    await userEvent.click(screen.getByRole("button", { name: "נסה שוב" }));
    expect(h.retry).toHaveBeenCalled();
  });
});

describe("one conversation", () => {
  const opened = (conversationId, over = {}) => ({
    conversationId,
    conversation: { id: conversationId },
    status: "succeeded",
    error: null,
    messages: [
      { id: 1, role: "user", content: "מה כתוב על תפילין?", citations: [] },
      { id: 2, role: "assistant", content: "של יד תחילה [1].", citations: [{ n: 1, start_time: null, page_number: 66, chunk_index: 5 }] },
    ],
    ...over,
  });

  test("reads as the chat does — its sources open the book at their page", async () => {
    const onOpenPage = vi.fn();
    render(<HistoryPane history={history({ viewing: opened(3) })} isText onOpenPage={onOpenPage} />);
    expect(screen.getAllByTestId(/message-/)).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "מקור 1, עמ' 66" }));
    expect(onOpenPage).toHaveBeenCalledWith(66);
  });

  test("an earlier conversation can be continued", async () => {
    const h = history({ viewing: opened(3), currentId: 9 });
    render(<HistoryPane history={h} />);
    await userEvent.click(screen.getByRole("button", { name: "המשך את השיחה הזו" }));
    await waitFor(() => expect(h.continueConversation).toHaveBeenCalledWith(3));
  });

  // Nothing to resume in the conversation already current — it is a way back.
  test("the current conversation offers a way back to it instead", () => {
    render(<HistoryPane history={history({ viewing: opened(9), currentId: 9 })} />);
    expect(screen.getByRole("button", { name: "חזרה לשיחה" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "המשך את השיחה הזו" })).not.toBeInTheDocument();
  });

  test("back to the list", async () => {
    const h = history({ viewing: opened(3) });
    render(<HistoryPane history={h} />);
    await userEvent.click(screen.getByRole("button", { name: "חזרה לרשימה" }));
    expect(h.close).toHaveBeenCalled();
  });

  test("one that could not be opened says so, and offers no way to continue it", () => {
    render(<HistoryPane history={history({ viewing: { ...opened(3), status: "failed", error: { code: "NOT_FOUND" }, messages: [] } })} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "המשך את השיחה הזו" })).not.toBeInTheDocument();
  });
});

// Found in the browser: the database answered the resume with a 503 after
// ten seconds, and the click simply seemed to do nothing.
test("a resume that failed says so, and the conversation stays open", () => {
  const viewing = {
    conversationId: 3, conversation: { id: 3 }, status: "succeeded", error: null,
    messages: [{ id: 1, role: "user", content: "שאלה", citations: [] }],
    resumeError: { code: "DB_UNAVAILABLE" },
  };
  render(<HistoryPane history={history({ viewing, currentId: 9 })} />);
  expect(screen.getByRole("alert")).toBeInTheDocument();
  expect(screen.getByTestId("message-user")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "המשך את השיחה הזו" })).toBeEnabled();
});

describe("deleting a conversation", () => {
  const deleteButton = () => screen.getByRole("button", { name: 'מחק את השיחה "מה כתוב על תפילין?"' });

  test("asks first, and deletes only on yes", async () => {
    const h = history({ items: [older] });
    render(<HistoryPane history={h} />);
    await userEvent.click(deleteButton());
    expect(screen.getByRole("dialog")).toHaveTextContent("לא יהיה אפשר לשחזר");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "ביטול" }));
    expect(h.remove).not.toHaveBeenCalled();
    // While the dialog fades out, the page behind it is still aria-hidden.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(deleteButton());
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "מחק" }));
    expect(h.remove).toHaveBeenCalledWith(3);
  });

  // The delete button sits beside the row: clicking it must not also open it.
  test("deleting does not open the conversation", async () => {
    const h = history({ items: [older] });
    render(<HistoryPane history={h} />);
    await userEvent.click(deleteButton());
    expect(h.open).not.toHaveBeenCalled();
  });

  test("the row being deleted cannot be deleted again", () => {
    render(<HistoryPane history={history({ items: [older, current], deletingId: 3 })} />);
    expect(deleteButton()).toBeDisabled();
  });

  test("a failed deletion is said, in Hebrew", () => {
    render(<HistoryPane history={history({ items: [older], deleteError: { code: "SOMETHING" } })} />);
    expect(screen.getByRole("alert")).toHaveTextContent("מחיקת השיחה נכשלה");
  });
});

test("an answer in an earlier conversation can be saved to the notebook too", async () => {
  const notebook = { saved: {}, save: vi.fn(async () => true) };
  const messages = [
    { id: 1, role: "user", content: "מה כתוב על תפילין?", citations: [] },
    { id: 2, role: "assistant", content: "של יד תחילה [1].", citations: [{ n: 1, start_time: null, page_number: 66, chunk_index: 5 }] },
  ];
  const viewing = { conversationId: 3, conversation: { id: 3 }, status: "succeeded", error: null, messages };
  render(<HistoryPane history={history({ viewing })} notebook={notebook} />);
  await userEvent.click(screen.getByRole("button", { name: "שמור למחברת" }));
  expect(notebook.save).toHaveBeenCalledWith(messages, 2);
});

test("an earlier conversation can be copied whole", async () => {
  const copy = vi.fn();
  const messages = [{ id: 1, role: "user", content: "שאלה", citations: [] }];
  const viewing = { conversationId: 3, conversation: { id: 3 }, status: "succeeded", error: null, messages };
  render(<HistoryPane history={history({ viewing, copy })} />);
  await userEvent.click(screen.getByRole("button", { name: "העתק שיחה" }));
  expect(copy).toHaveBeenCalledWith(messages);
});
