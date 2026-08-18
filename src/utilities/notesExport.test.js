import { test, expect, describe, vi } from "vitest";
import { downloadNotebooks } from "./notesExport";

// Exporting one selection as SEVERAL documents — ten notes that are really three
// subjects, written out as three files the user named.
//
// The writers themselves are not exercised here: one of them loads jsPDF, a
// Hebrew font and the bidi tables, and the other hands a blob to the browser.
// What is worth testing is the part that decides how many files there are and
// what goes in each, which is why `write` is a parameter rather than a choice
// this function makes.

const note = (id, title) => ({ id, title, body: "", updated_at: null });

describe("writing several notebooks", () => {
  test("each notebook is one document, named and ordered as the user arranged it", async () => {
    const write = vi.fn();
    const books = [
      { name: "פרק א", notes: [note(1, "אחת"), note(2, "שתיים")] },
      { name: "פרק ב", notes: [note(3, "שלוש")] },
    ];

    const written = await downloadNotebooks(books, write);

    expect(written).toBe(2);
    expect(write).toHaveBeenCalledTimes(2);
    expect(write.mock.calls[0]).toEqual([books[0].notes, { title: "פרק א" }]);
    expect(write.mock.calls[1]).toEqual([books[1].notes, { title: "פרק ב" }]);
  });

  // A file holding no notes is not a smaller export, it is a puzzle in the
  // downloads folder. The dialog lets a notebook sit empty while the user is
  // still moving notes around, so this is a state that genuinely arrives here.
  test("an empty notebook produces no file, and is not counted as one", async () => {
    const write = vi.fn();

    const written = await downloadNotebooks(
      [{ name: "ריקה", notes: [] }, { name: "מלאה", notes: [note(1, "אחת")] }],
      write
    );

    expect(written).toBe(1);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][1]).toEqual({ title: "מלאה" });
  });

  // Sequential, not parallel. The PDF writer loads a font and the bidi tables on
  // first use, and three parallel calls would race three copies of that import —
  // quite apart from the browser's own limit on downloads from one gesture.
  test("one file is finished before the next is started", async () => {
    const order = [];
    const write = vi.fn(async (notes) => {
      order.push(`start ${notes[0].id}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(`end ${notes[0].id}`);
    });

    await downloadNotebooks(
      [{ name: "א", notes: [note(1)] }, { name: "ב", notes: [note(2)] }],
      write
    );

    expect(order).toEqual(["start 1", "end 1", "start 2", "end 2"]);
  });

  // A failure has to reach the page, which is what turns it into a message —
  // otherwise a half-written export looks exactly like a finished one.
  test("a writer that fails is not swallowed", async () => {
    const write = vi.fn(async () => { throw new Error("nope"); });

    await expect(downloadNotebooks([{ name: "א", notes: [note(1)] }], write)).rejects.toThrow("nope");
  });
});
