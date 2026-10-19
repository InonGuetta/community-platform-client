// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import notesReducer from "../../../../store/slicesAndThunks/notesSlice/notesSlice";
import notificationReducer from "../../../../store/slicesAndThunks/notificationSlice";
import { sourceChipHtml, sourceFromChip } from "../../../../utilities/noteSource";

// The notebook strip under a lesson. Mocked at the API, as the notebook's own
// flow test is, so the real thunks, reducer and cards run — what is checked is
// which notes this lesson gets, what a new note is pinned to, and that a link
// back to THIS lesson moves the player rather than opening a window.

const listNotes = vi.hoisted(() => vi.fn());
const createNote = vi.hoisted(() => vi.fn());
const updateNote = vi.hoisted(() => vi.fn());
const createBookmark = vi.hoisted(() => vi.fn());
const updateBookmark = vi.hoisted(() => vi.fn());
const removeBookmark = vi.hoisted(() => vi.fn());

vi.mock("../../../../api/bookmarksApi", () => ({
  bookmarksApi: {
    create: (...args) => createBookmark(...args),
    update: (...args) => updateBookmark(...args),
    remove: (...args) => removeBookmark(...args),
    list: vi.fn(),
  },
}));

vi.mock("../../../../api/notesApi", () => ({
  notesApi: {
    list: (...args) => listNotes(...args),
    create: (...args) => createNote(...args),
    update: (...args) => updateNote(...args),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));

// The window loads a whole second lesson; whether it opens is all that matters.
vi.mock("../../notebook/componentsNotebook/SourcePreviewDialog", () => ({
  default: ({ mediaId }) => <div data-testid="source-preview" data-media-id={mediaId} />,
}));

import LessonNotebook from "./LessonNotebook";

const LESSON = { id: 49, title: "שיחה על שמירת הברית", media_type: "audio" };

const NOTES = [
  { id: 1, title: "נלקחה בשיעור", body: "", media_id: 49, media_title: LESSON.title, media_type: "audio", timestamp_seconds: 95 },
  { id: 2, title: "מצטטת את השיעור", body: `<p>${sourceChipHtml({ mediaId: 49, timestampSeconds: 30, mediaTitle: LESSON.title })}</p>`, media_id: null },
  { id: 3, title: "שיעור אחר", body: "", media_id: 7, media_title: "אחר", media_type: "video" },
  { id: 4, title: "בלי מקור", body: "סתם", media_id: null },
];

const renderNotebook = async (props = {}) => {
  const store = configureStore({ reducer: { notes: notesReducer, notification: notificationReducer } });
  const onSeek = vi.fn();
  const onJumpTo = vi.fn();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <LessonNotebook
          media={LESSON}
          isText={false}
          currentTime={0}
          readerPage={null}
          bookmarks={[]}
          onSeek={onSeek}
          onJumpTo={onJumpTo}
          {...props}
        />
      </MemoryRouter>
    </Provider>
  );
  await waitFor(() => expect(listNotes).toHaveBeenCalled());
  return { onSeek, onJumpTo };
};

const titles = () => screen.queryAllByPlaceholderText("כותרת ההערה").map((input) => input.value);

beforeEach(() => {
  listNotes.mockReset().mockResolvedValue(NOTES);
  createNote.mockReset();
  createBookmark.mockReset().mockImplementation(async (payload) => ({ id: 500, ...payload }));
  updateBookmark.mockReset();
  removeBookmark.mockReset().mockResolvedValue(undefined);
  updateNote.mockReset().mockImplementation(async (id, { title, body }) => ({ id, title, body }));
});

describe("which notes the lesson shows", () => {
  test("the ones taken on it and the ones quoting it — no others", async () => {
    await renderNotebook();
    await waitFor(() => expect(titles()).toEqual(["נלקחה בשיעור", "מצטטת את השיעור"]));
  });

  test("an empty lesson says how to start", async () => {
    listNotes.mockResolvedValue([NOTES[2]]);
    await renderNotebook();
    expect(await screen.findByText(/עדיין אין הערות לשיעור הזה/)).toBeInTheDocument();
  });
});

describe("a new note", () => {
  test("on a recording is pinned to the lesson and to where playback is", async () => {
    createNote.mockResolvedValue({ id: 10, title: "", body: "", media_id: 49, timestamp_seconds: 125 });
    await renderNotebook({ currentTime: 125.7 });
    fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
    await waitFor(() => expect(createNote).toHaveBeenCalledWith(expect.objectContaining({
      title: "", mediaId: 49, timestampSeconds: 125,
    })));
  });

  test("on a book carries no moment in time", async () => {
    createNote.mockResolvedValue({ id: 11, title: "", body: "", media_id: 49 });
    await renderNotebook({ media: { ...LESSON, media_type: "text" }, isText: true, currentTime: 0 });
    fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
    await waitFor(() => expect(createNote).toHaveBeenCalled());
    expect(createNote.mock.calls[0][0]).not.toHaveProperty("timestampSeconds");
  });

  test("arrives named after the lesson, though the server returns the bare row", async () => {
    listNotes.mockResolvedValue([]);
    createNote.mockResolvedValue({ id: 12, title: "", body: "", media_id: 49, timestamp_seconds: null });
    await renderNotebook();
    fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
    expect(await screen.findByRole("button", { name: `מתוך: ${LESSON.title}` })).toBeInTheDocument();
  });
});

// The body a new note opens with: a line to write on, and under it a reference
// back to where the user was, named "הפנייה כללית" until they rename it.
describe("the reference a new note opens with", () => {
  const createdChip = async () => {
    await waitFor(() => expect(createNote).toHaveBeenCalled());
    const host = document.createElement("div");
    host.innerHTML = createNote.mock.calls[0][0].body;
    return { host, chip: sourceFromChip(host.querySelector("span[data-media-id]")) };
  };

  test("on a recording points at the second the player is at", async () => {
    createNote.mockResolvedValue({ id: 20, title: "", body: "", media_id: 49 });
    await renderNotebook({ currentTime: 125.7 });
    fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
    const { host, chip } = await createdChip();
    expect(chip).toMatchObject({ mediaId: 49, timestampSeconds: 125, pageNumber: null, note: "הפנייה כללית" });
    // Below the line the user writes on, not above it.
    expect(host.firstElementChild.querySelector("span[data-media-id]")).toBe(null);
    expect(host.lastElementChild.querySelector("span[data-media-id]")).not.toBe(null);
  });

  test("before playback starts points at the start", async () => {
    createNote.mockResolvedValue({ id: 21, title: "", body: "", media_id: 49 });
    await renderNotebook({ currentTime: 0 });
    fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
    const { chip } = await createdChip();
    expect(chip.timestampSeconds).toBe(0);
  });

  test("on a book points at the page the reader is showing", async () => {
    createNote.mockResolvedValue({ id: 22, title: "", body: "", media_id: 49 });
    await renderNotebook({ media: { ...LESSON, media_type: "text" }, isText: true, readerPage: 14 });
    fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
    const { chip } = await createdChip();
    expect(chip).toMatchObject({ mediaId: 49, pageNumber: 14, timestampSeconds: null, mediaType: "text" });
  });

  test("on a book the reader has not laid out yet names no page", async () => {
    createNote.mockResolvedValue({ id: 23, title: "", body: "", media_id: 49 });
    await renderNotebook({ media: { ...LESSON, media_type: "text" }, isText: true, readerPage: null });
    fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
    const { chip } = await createdChip();
    expect(chip).toMatchObject({ pageNumber: null, timestampSeconds: null });
  });
});

describe("a link back to a lesson", () => {
  test("to this one seeks the player instead of opening a window", async () => {
    const { onSeek } = await renderNotebook();
    fireEvent.click(await screen.findByRole("button", { name: /^מתוך: .*1:35/ }));
    expect(onSeek).toHaveBeenCalledWith(95);
    expect(screen.queryByTestId("source-preview")).not.toBeInTheDocument();
  });
});

// Saving a card with no title asks for one first.
describe("saving a card with no title", () => {
  const UNTITLED = { id: 30, title: "", body: "<p>תוכן</p>", media_id: 49, media_title: LESSON.title, media_type: "audio" };

  const pressSave = async () => {
    listNotes.mockResolvedValue([UNTITLED]);
    await renderNotebook();
    // The save button only wakes up once the card has an unsaved change.
    fireEvent.input(await screen.findByRole("textbox", { name: "גוף ההערה" }), { target: { innerHTML: "<p>תוכן חדש</p>" } });
    fireEvent.click(screen.getByRole("button", { name: /^שמירה/ }));
  };

  test("asks for a name instead of saving", async () => {
    await pressSave();
    expect(await screen.findByText("לא צוין שם לכרטיסייה")).toBeInTheDocument();
    expect(updateNote).not.toHaveBeenCalled();
  });

  test("a name given in the dialog is what the card is saved under", async () => {
    await pressSave();
    fireEvent.change(await screen.findByLabelText("שם הכרטיסייה"), { target: { value: "מצוות ציצית" } });
    fireEvent.click(screen.getByRole("button", { name: "שמור" }));
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith(30, expect.objectContaining({ title: "מצוות ציצית" })));
  });

  test("'שמור בכל זאת' saves it untitled", async () => {
    await pressSave();
    fireEvent.click(await screen.findByRole("button", { name: "שמור בכל זאת" }));
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith(30, expect.objectContaining({ title: "" })));
  });

  test("a card that has a title saves without asking", async () => {
    listNotes.mockResolvedValue([{ ...UNTITLED, title: "יש שם" }]);
    await renderNotebook();
    fireEvent.input(await screen.findByRole("textbox", { name: "גוף ההערה" }), { target: { innerHTML: "<p>שונה</p>" } });
    fireEvent.click(screen.getByRole("button", { name: /^שמירה/ }));
    await waitFor(() => expect(updateNote).toHaveBeenCalledWith(30, expect.objectContaining({ title: "יש שם" })));
    expect(screen.queryByText("לא צוין שם לכרטיסייה")).not.toBeInTheDocument();
  });
});

// The same place, listed under "הערות אישיות" beside the player as well.
describe("the bookmark a new note brings with it", () => {
  const press = () => fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));

  test("on a recording: the second the player is at, named like the reference", async () => {
    createNote.mockResolvedValue({ id: 40, title: "", body: "", media_id: 49 });
    await renderNotebook({ currentTime: 125.7 });
    press();
    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith({
      mediaId: 49, note: "הפנייה כללית", timestampSeconds: 125,
    }));
  });

  test("before playback starts: the start", async () => {
    createNote.mockResolvedValue({ id: 41, title: "", body: "", media_id: 49 });
    await renderNotebook({ currentTime: 0 });
    press();
    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith(expect.objectContaining({ timestampSeconds: 0 })));
  });

  test("on a book: the page the reader shows, as a thin band along its top", async () => {
    createNote.mockResolvedValue({ id: 42, title: "", body: "", media_id: 49 });
    await renderNotebook({ media: { ...LESSON, media_type: "text" }, isText: true, readerPage: 14 });
    press();
    await waitFor(() => expect(createBookmark).toHaveBeenCalledWith({
      mediaId: 49, note: "הפנייה כללית", pageNumber: 14, rect: { x: 0, y: 0, w: 1, h: 0.02 },
    }));
  });

  // Nowhere to put it: the server refuses a page mark without a page.
  test("on a book the reader has not laid out yet: none", async () => {
    createNote.mockResolvedValue({ id: 43, title: "", body: "", media_id: 49 });
    await renderNotebook({ media: { ...LESSON, media_type: "text" }, isText: true, readerPage: null });
    press();
    await waitFor(() => expect(createNote).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(createBookmark).not.toHaveBeenCalled();
  });

  // The bookmark is made first, so the chip can carry its id — and is taken
  // back if the note it was made for never came to exist.
  test("a note that failed to save leaves no bookmark behind", async () => {
    createNote.mockRejectedValue(new Error("down"));
    await renderNotebook({ currentTime: 30 });
    press();
    await waitFor(() => expect(removeBookmark).toHaveBeenCalledWith(500));
  });
});

// The chip and the bookmark are one value: the chip carries the bookmark's id,
// and its name is the bookmark's wherever either is renamed.
describe("the reference and its bookmark are one", () => {
  const press = () => fireEvent.click(screen.getByRole("button", { name: /הערה חדשה לשיעור/ }));
  const chipOf = (body) => {
    const host = document.createElement("div");
    host.innerHTML = body;
    return host.querySelector("span[data-media-id]");
  };

  test("the bookmark comes first, and the note's chip is that bookmark", async () => {
    createNote.mockResolvedValue({ id: 60, title: "", body: "", media_id: 49 });
    await renderNotebook({ currentTime: 30 });
    press();
    await waitFor(() => expect(createNote).toHaveBeenCalled());
    expect(createBookmark.mock.invocationCallOrder[0]).toBeLessThan(createNote.mock.invocationCallOrder[0]);
    expect(chipOf(createNote.mock.calls[0][0].body).getAttribute("data-bookmark-id")).toBe("500");
  });

  test("a bookmark that could not be made leaves a plain chip, and the note is still made", async () => {
    createBookmark.mockRejectedValue(new Error("down"));
    createNote.mockResolvedValue({ id: 61, title: "", body: "", media_id: 49 });
    await renderNotebook({ currentTime: 30 });
    press();
    await waitFor(() => expect(createNote).toHaveBeenCalled());
    expect(chipOf(createNote.mock.calls[0][0].body).hasAttribute("data-bookmark-id")).toBe(false);
  });

  // Renamed under "הערות אישיות": the note says the new name, whatever it was
  // saved with.
  test("a note shows its bookmark's current name, not the one it was saved with", async () => {
    const chip = sourceChipHtml({
      mediaId: 49, timestampSeconds: 30, mediaTitle: LESSON.title, note: "הפנייה כללית", bookmarkId: 77,
    });
    listNotes.mockResolvedValue([{ id: 70, title: "יש שם", body: `<p>${chip}</p>`, media_id: 49 }]);
    await renderNotebook({ bookmarks: [{ id: 77, media_id: 49, timestamp_seconds: 30, note: "פתיחת השיעור" }] });
    const shown = await screen.findByText("פתיחת השיעור");
    expect(shown.closest("span[data-media-id]").getAttribute("data-bookmark-id")).toBe("77");
    expect(screen.queryByText("הפנייה כללית")).not.toBeInTheDocument();
  });

  test("renamed with its pencil, it is the bookmark that is renamed", async () => {
    updateBookmark.mockResolvedValue({ id: 77, media_id: 49, timestamp_seconds: 30, note: "פתיחה" });
    const chip = sourceChipHtml({
      mediaId: 49, timestampSeconds: 30, mediaTitle: LESSON.title, note: "הפנייה כללית", bookmarkId: 77,
    });
    listNotes.mockResolvedValue([{ id: 71, title: "יש שם", body: `<p>${chip}</p>`, media_id: 49 }]);
    await renderNotebook();
    fireEvent.mouseOver(await screen.findByText("הפנייה כללית"));
    fireEvent.click(screen.getByLabelText("שינוי שם ההפניה"));
    fireEvent.change(screen.getByLabelText("שם ההפניה"), { target: { value: "פתיחה" } });
    fireEvent.click(screen.getByRole("button", { name: "שמירה" }));
    await waitFor(() => expect(updateBookmark).toHaveBeenCalledWith(77, "פתיחה"));
    // Nothing about the note itself changed, so it does not claim to be unsaved.
    expect(screen.queryByText("יש שינויים שלא נשמרו")).not.toBeInTheDocument();
  });
});
