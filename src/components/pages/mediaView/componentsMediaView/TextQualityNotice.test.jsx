// @vitest-environment jsdom
import { test, expect, describe } from "vitest";
import { render, screen } from "@testing-library/react";
import TextQualityNotice from "./TextQualityNotice";
import AISummaryPanel from "./AISummaryPanel";

// A book whose extracted text is largely broken OCR. The server measured the
// readable share once (migration 033); the page says what that means.

describe("the warning on a book with broken text", () => {
  test("a book that is a quarter readable says so, and what it costs", () => {
    render(<TextQualityNotice quality={24} />);
    const notice = screen.getByTestId("text-quality-notice");
    expect(notice).toHaveTextContent("כ־24%");
    expect(notice).toHaveTextContent("הסיכום, החיפוש והשיחה מכסים רק את החלק הקריא");
    expect(notice).not.toHaveTextContent("העלו קובץ PDF");
  });

  test("whoever can re-upload it is told how to fix it", () => {
    render(<TextQualityNotice quality={24} canFix />);
    expect(screen.getByTestId("text-quality-notice")).toHaveTextContent("העלו קובץ PDF עם זיהוי טקסט טוב יותר");
  });

  test("a readable book, and one never measured, say nothing", () => {
    const { rerender } = render(<TextQualityNotice quality={95} />);
    expect(screen.queryByTestId("text-quality-notice")).not.toBeInTheDocument();
    rerender(<TextQualityNotice quality={80} />);
    expect(screen.queryByTestId("text-quality-notice")).not.toBeInTheDocument();
    rerender(<TextQualityNotice quality={null} />);
    expect(screen.queryByTestId("text-quality-notice")).not.toBeInTheDocument();
  });
});

describe("where it is shown", () => {
  const transcript = { status: "done", ai_summary: "סיכום", ai_key_points: [], text_quality: 24 };

  test("on a book's summary tab", () => {
    render(<AISummaryPanel transcript={transcript} isText />);
    expect(screen.getByTestId("text-quality-notice")).toBeInTheDocument();
  });

  // A Whisper transcript is generated text, never OCR.
  test("never on a recording, whatever the number says", () => {
    render(<AISummaryPanel transcript={transcript} isText={false} />);
    expect(screen.queryByTestId("text-quality-notice")).not.toBeInTheDocument();
  });
});
