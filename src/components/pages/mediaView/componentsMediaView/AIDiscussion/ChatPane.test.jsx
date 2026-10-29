// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatPane from "./ChatPane";

// The chat is presentation only: `chat` is what useAIDiscussionController
// hands it, so every state is a different object here.

const chat = (over = {}) => ({
  conversation: { id: 17 },
  messages: [],
  loadStatus: "succeeded",
  loadError: null,
  asking: false,
  askError: null,
  ask: vi.fn(async () => true),
  startNew: vi.fn(),
  dismissAskError: vi.fn(),
  retryLoad: vi.fn(),
  ...over,
});

const question = { id: 1, role: "user", content: "מה העיקר?", citations: [] };
const answer = {
  id: 2,
  role: "assistant",
  content: "העיקר הוא תשובה [1] וגם תפילה [2].",
  citations: [
    { n: 1, start_time: 754, page_number: null, chunk_index: 1, quote: "תשובה היא חזרה" },
    { n: 2, start_time: 0, page_number: null, chunk_index: 0, quote: "פתיחה" },
  ],
};
const bookAnswer = {
  id: 3,
  role: "assistant",
  content: "כתוב כך [1].",
  citations: [{ n: 1, start_time: null, page_number: 47, chunk_index: 5, quote: "בעמוד" }],
};

describe("asking", () => {
  test("Enter sends the question and empties the box", async () => {
    const c = chat();
    render(<ChatPane chat={c} />);
    const box = screen.getByRole("textbox", { name: "שאלה" });
    await userEvent.type(box, "מה העיקר?{Enter}");
    expect(c.ask).toHaveBeenCalledWith("מה העיקר?");
    expect(box).toHaveValue("");
  });

  test("Shift+Enter is a new line, not a send", async () => {
    const c = chat();
    render(<ChatPane chat={c} />);
    await userEvent.type(screen.getByRole("textbox"), "שורה{Shift>}{Enter}{/Shift}עוד");
    expect(c.ask).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox")).toHaveValue("שורה\nעוד");
  });

  // The server stores nothing for a failed answer. Making the reader retype
  // the question to retry would be the one thing worse than the failure.
  test("a failed answer puts the question back in the box", async () => {
    const c = chat({ ask: vi.fn(async () => false) });
    render(<ChatPane chat={c} />);
    await userEvent.type(screen.getByRole("textbox"), "מה העיקר?{Enter}");
    await waitFor(() => expect(screen.getByRole("textbox")).toHaveValue("מה העיקר?"));
  });

  test("nothing is sent while an answer is on its way", async () => {
    const c = chat({ asking: true, messages: [{ ...question, pending: true }] });
    render(<ChatPane chat={c} />);
    await userEvent.type(screen.getByRole("textbox"), "עוד שאלה{Enter}");
    expect(c.ask).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "שלח" })).toBeDisabled();
    expect(screen.getByTestId("chat-thinking")).toHaveTextContent("מעיין בשיעור");
  });

  test("an empty conversation offers questions to start with", async () => {
    const c = chat();
    render(<ChatPane chat={c} />);
    await userEvent.click(screen.getByRole("button", { name: "מה הנקודה המרכזית?" }));
    expect(c.ask).toHaveBeenCalledWith("מה הנקודה המרכזית?");
  });

  test("a failure is said in Hebrew and can be dismissed", async () => {
    const c = chat({ askError: { code: "AI_ANSWER_FAILED", message: "The AI could not answer" } });
    render(<ChatPane chat={c} />);
    expect(screen.getByRole("alert")).toHaveTextContent("נסה לשאול שוב");
    expect(screen.queryByText(/could not answer/)).not.toBeInTheDocument();
    await userEvent.click(within(screen.getByRole("alert")).getByRole("button"));
    expect(c.dismissAskError).toHaveBeenCalled();
  });
});

describe("the thread", () => {
  test("questions and answers are shown in order", () => {
    render(<ChatPane chat={chat({ messages: [question, answer] })} />);
    const log = screen.getByRole("log");
    const bubbles = within(log).getAllByTestId(/message-/);
    expect(bubbles.map((b) => b.dataset.testid)).toEqual(["message-user", "message-assistant"]);
  });

  test("'שיחה חדשה' is offered once there is something to start over from", async () => {
    const c = chat({ messages: [question, answer] });
    const { rerender } = render(<ChatPane chat={chat()} />);
    expect(screen.queryByRole("button", { name: "שיחה חדשה" })).not.toBeInTheDocument();
    rerender(<ChatPane chat={c} />);
    await userEvent.click(screen.getByRole("button", { name: "שיחה חדשה" }));
    expect(c.startNew).toHaveBeenCalled();
  });

  test("a conversation that failed to load says so and can be retried", async () => {
    const c = chat({ loadStatus: "failed", loadError: { code: "DB_UNAVAILABLE" } });
    render(<ChatPane chat={c} />);
    await userEvent.click(screen.getByRole("button", { name: "נסה שוב" }));
    expect(c.retryLoad).toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("citations", () => {
  test("each [n] in an answer is a button that seeks to its moment", async () => {
    const onSeek = vi.fn();
    render(<ChatPane chat={chat({ messages: [question, answer] })} onSeek={onSeek} />);
    await userEvent.click(screen.getByRole("button", { name: "מקור 1, 12:34" }));
    expect(onSeek).toHaveBeenCalledWith(754);
  });

  // 0 is the first second of the lesson — a real place, not a missing one.
  test("a citation at 0:00 is still a place to go", async () => {
    const onSeek = vi.fn();
    render(<ChatPane chat={chat({ messages: [question, answer] })} onSeek={onSeek} />);
    await userEvent.click(screen.getByRole("button", { name: "מקור 2, 0:00" }));
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  test("the sources are listed again under the answer", async () => {
    const onSeek = vi.fn();
    render(<ChatPane chat={chat({ messages: [question, answer] })} onSeek={onSeek} />);
    const sources = screen.getByTestId("answer-sources");
    expect(within(sources).getByText("[1] 12:34")).toBeInTheDocument();
    await userEvent.click(within(sources).getByText("[2] 0:00"));
    expect(onSeek).toHaveBeenCalledWith(0);
  });

  test("in a book, a citation opens its page", async () => {
    const onOpenPage = vi.fn();
    render(<ChatPane chat={chat({ messages: [question, bookAnswer] })} isText onOpenPage={onOpenPage} />);
    await userEvent.click(screen.getByRole("button", { name: "מקור 1, עמ' 47" }));
    expect(onOpenPage).toHaveBeenCalledWith(47);
  });

  test("a marker with no citation behind it stays plain text", () => {
    const stray = { ...answer, content: "כך [7].", citations: [] };
    render(<ChatPane chat={chat({ messages: [question, stray] })} onSeek={() => {}} />);
    expect(screen.getByTestId("message-assistant")).toHaveTextContent("כך [7].");
    expect(within(screen.getByTestId("message-assistant")).queryByRole("button")).not.toBeInTheDocument();
  });

  test("the question's own text is never parsed for markers", () => {
    const q = { ...question, content: "מה פירוש [1] כאן?" };
    render(<ChatPane chat={chat({ messages: [q] })} onSeek={() => {}} />);
    expect(within(screen.getByTestId("message-user")).queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("an answer as it is written", () => {
  const draft = { id: "draft-r1", role: "assistant", content: "העיקר הוא תשובה [1]", citations: [], streaming: true };

  test("the arriving answer replaces the 'thinking' line", () => {
    render(<ChatPane chat={chat({ asking: true, messages: [{ ...question, pending: true }, draft] })} onSeek={() => {}} />);
    expect(screen.queryByTestId("chat-thinking")).not.toBeInTheDocument();
    const bubble = screen.getByTestId("message-assistant");
    expect(bubble).toHaveTextContent("העיקר הוא תשובה [1]");
    expect(bubble).toHaveAttribute("aria-busy", "true");
  });

  // Its citations arrive with the stored answer; until then [1] leads nowhere.
  test("a draft's markers are not buttons yet", () => {
    render(<ChatPane chat={chat({ asking: true, messages: [{ ...question, pending: true }, draft] })} onSeek={() => {}} />);
    expect(within(screen.getByTestId("message-assistant")).queryByRole("button")).not.toBeInTheDocument();
  });

  test("before the first piece, the 'thinking' line is there", () => {
    render(<ChatPane chat={chat({ asking: true, messages: [{ ...question, pending: true }] })} />);
    expect(screen.getByTestId("chat-thinking")).toBeInTheDocument();
  });
});

describe("the waiting line names the step", () => {
  const waiting = (askStage, isText = false) =>
    render(<ChatPane chat={chat({ asking: true, askStage, messages: [{ ...question, pending: true }] })} isText={isText} />);

  test("before the server has said anything", () => {
    waiting(null);
    expect(screen.getByTestId("chat-thinking")).toHaveTextContent("מעיין בשיעור…");
  });

  test("while the passages are found — in a book's words for a book", () => {
    waiting("searching", true);
    expect(screen.getByTestId("chat-thinking")).toHaveTextContent("מחפש קטעים בספר…");
  });

  test("while the answer is written", () => {
    waiting("writing");
    expect(screen.getByTestId("chat-thinking")).toHaveTextContent("כותב תשובה…");
  });
});

// The daily quota (PRD ASK-5). "Try again" would send the reader into a loop
// that cannot work until midnight; they are told when it will, and what works now.
test("the daily quota says when the chat comes back, and points at the search", () => {
  render(<ChatPane chat={chat({ askError: { code: "AI_DAILY_LIMIT", message: "Daily question limit reached" } })} />);
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("הגעת למכסת השאלות היומית");
  expect(alert).toHaveTextContent("אפשר להמשיך מחר");
  expect(alert).toHaveTextContent("החיפוש החכם");
  expect(alert).not.toHaveTextContent("נסה לשאול שוב");
});

describe("saving an answer to the notebook", () => {
  const notebook = (saved = {}) => ({ saved, save: vi.fn(async () => true) });

  test("a cited answer can be saved, with the conversation it is in", async () => {
    const n = notebook();
    const messages = [question, answer];
    render(<ChatPane chat={chat({ messages })} notebook={n} />);
    await userEvent.click(screen.getByRole("button", { name: "שמור למחברת" }));
    expect(n.save).toHaveBeenCalledWith(messages, 2);
  });

  test("a question, an answer still being written, and an uncited answer cannot", () => {
    const messages = [
      question,
      { id: 5, role: "assistant", content: "לא נדון בשיעור.", citations: [] },
      { id: "draft-r", role: "assistant", content: "כותב [1]", citations: [], streaming: true },
    ];
    render(<ChatPane chat={chat({ messages, asking: true })} notebook={notebook()} />);
    expect(screen.queryByRole("button", { name: "שמור למחברת" })).not.toBeInTheDocument();
  });

  test("once saved it says so, and cannot be pressed again by accident", () => {
    render(<ChatPane chat={chat({ messages: [question, answer] })} notebook={notebook({ 2: "saved" })} />);
    expect(screen.getByRole("button", { name: "נשמר במחברת" })).toBeDisabled();
  });

  test("a failed save says so and can be tried again", async () => {
    const n = notebook({ 2: "failed" });
    render(<ChatPane chat={chat({ messages: [question, answer] })} notebook={n} />);
    await userEvent.click(screen.getByRole("button", { name: "השמירה נכשלה — נסה שוב" }));
    expect(n.save).toHaveBeenCalled();
  });
});

describe("today's questions left", () => {
  test("shown to a reader the quota binds", () => {
    render(<ChatPane chat={chat({ quota: { limit: 50, remaining: 42 } })} />);
    expect(screen.getByTestId("chat-quota")).toHaveTextContent("נשארו לך היום 42 שאלות מתוך 50");
  });

  test("one, and none, are said in words", () => {
    const { rerender } = render(<ChatPane chat={chat({ quota: { limit: 50, remaining: 1 } })} />);
    expect(screen.getByTestId("chat-quota")).toHaveTextContent("נשארה לך היום שאלה אחת");
    rerender(<ChatPane chat={chat({ quota: { limit: 50, remaining: 0 } })} />);
    expect(screen.getByTestId("chat-quota")).toHaveTextContent("אפשר להמשיך מחר");
  });

  test("not shown to a lecturer or an admin, who have no quota", () => {
    render(<ChatPane chat={chat({ quota: null })} />);
    expect(screen.queryByTestId("chat-quota")).not.toBeInTheDocument();
  });
});

describe("copying the conversation", () => {
  test("one button for the whole conversation, not one per answer", async () => {
    const copy = vi.fn();
    const messages = [question, answer, { ...question, id: 4 }, { ...bookAnswer, id: 5 }];
    render(<ChatPane chat={chat({ messages, copy })} />);
    const buttons = screen.getAllByRole("button", { name: "העתק שיחה" });
    expect(buttons).toHaveLength(1);
    await userEvent.click(buttons[0]);
    expect(copy).toHaveBeenCalledWith(messages);
  });

  test("not offered on an empty conversation, nor pressed mid-answer", () => {
    const { rerender } = render(<ChatPane chat={chat({ copy: vi.fn() })} />);
    expect(screen.queryByRole("button", { name: "העתק שיחה" })).not.toBeInTheDocument();
    rerender(<ChatPane chat={chat({ messages: [question, answer], asking: true, copy: vi.fn() })} />);
    expect(screen.getByRole("button", { name: "העתק שיחה" })).toBeDisabled();
  });
});
