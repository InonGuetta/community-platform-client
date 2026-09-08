// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import AISummaryPanel from "./AISummaryPanel";

// What the tab says when there is no summary, and for how long it says a
// failure.
//
// `status` on a transcript row is the LAST OUTCOME, not a recent event — a book
// whose summary failed once reads 'error' until somebody presses the button
// again. The panel showed the failure alert straight off that value, so "הפקת
// הסיכום נכשלה" sat on a perfectly readable document for days.

const failed = { status: "error" };
const never = { status: null };

const alertText = () => screen.queryByText(/הפקת הסיכום נכשלה/);
const emptyText = () => screen.queryByText("אין סיכום עבור תוכן זה");

describe("a document with no summary", () => {
  test("says so plainly", () => {
    render(<AISummaryPanel transcript={never} isText />);
    expect(emptyText()).toBeInTheDocument();
  });

  // The button extracts the text as well as summarising it, which is not
  // something its label can say on its own.
  test("and tells whoever can press the button what it will do", () => {
    render(<AISummaryPanel transcript={never} isText canGenerate />);
    expect(emptyText()).toBeInTheDocument();
    expect(screen.getByText(/כדי לחלץ את הטקסט מהקובץ/)).toBeInTheDocument();
  });

  test("a reader who cannot generate one is not told to press anything", () => {
    render(<AISummaryPanel transcript={never} isText />);
    expect(screen.queryByText(/כדי לחלץ את הטקסט מהקובץ/)).not.toBeInTheDocument();
  });

  // A recording keeps its own wording: there the summary is a by-product of a
  // transcript that may still be coming.
  test("a recording still says the summary is not there YET", () => {
    render(<AISummaryPanel transcript={never} />);
    expect(screen.getByText("אין עדיין סיכום.")).toBeInTheDocument();
    expect(emptyText()).not.toBeInTheDocument();
  });
});

describe("a document whose summary failed", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  // The bug, stated as a test: opening the page long after the failure is not
  // the moment to interrupt anybody about it.
  test("opening the page later shows no alert at all", () => {
    render(<AISummaryPanel transcript={failed} isText />);
    expect(alertText()).not.toBeInTheDocument();
    expect(emptyText()).toBeInTheDocument();
  });

  test("but failing while the reader is watching does say so", () => {
    const { rerender } = render(<AISummaryPanel transcript={{ status: "analyzing" }} isText />);
    rerender(<AISummaryPanel transcript={failed} isText />);

    expect(alertText()).toBeInTheDocument();
    // And the empty state stays out of the way while it does.
    expect(emptyText()).not.toBeInTheDocument();
  });

  test("and stops saying so a few moments later", () => {
    const { rerender } = render(<AISummaryPanel transcript={{ status: "analyzing" }} isText />);
    rerender(<AISummaryPanel transcript={failed} isText />);

    act(() => { vi.advanceTimersByTime(10000); });

    expect(alertText()).not.toBeInTheDocument();
    expect(emptyText()).toBeInTheDocument();
  });

  // The worker records why, and for a document it is usually something the
  // lecturer can act on ("this file is a scan").
  test("the reason the worker recorded is what is shown", () => {
    const { rerender } = render(<AISummaryPanel transcript={{ status: "analyzing" }} isText />);
    rerender(<AISummaryPanel transcript={{ status: "error", error_message: "לא נמצא טקסט קריא בקובץ." }} isText />);

    expect(screen.getByText("לא נמצא טקסט קריא בקובץ.")).toBeInTheDocument();
  });

  // A recording's failure is the whole reason its transcript tab is empty, and a
  // lecturer has to be able to come back and read why. Only documents expire it.
  test("a recording's failure keeps standing", () => {
    render(<AISummaryPanel transcript={failed} />);
    expect(alertText()).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(60000); });
    expect(alertText()).toBeInTheDocument();
  });
});
