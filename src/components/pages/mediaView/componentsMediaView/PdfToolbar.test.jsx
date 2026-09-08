// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PdfToolbar, { clampPage, clampZoom, MIN_ZOOM, MAX_ZOOM } from "./PdfToolbar";

// The part of the browser's toolbar we chose to rebuild, and the arithmetic that
// keeps it honest when a reader types something into it.
//
// A sefer here runs to 547 pages, so the number box is not a nicety: it is the
// only way to reach page 400 without scrolling to it.

const setup = (props = {}) => {
  const onPage = vi.fn();
  const onZoom = vi.fn();
  const onFit = vi.fn();
  render(
    <PdfToolbar page={9} pages={547} onPage={onPage} zoom={1} onZoom={onZoom} onFit={onFit} {...props} />
  );
  return { onPage, onZoom, onFit };
};

const pageBox = () => screen.getByLabelText("מספר עמוד");

describe("what the toolbar says", () => {
  test("the page it is on, out of how many", () => {
    setup();
    expect(pageBox()).toHaveValue("9");
    expect(screen.getByText("/ 547")).toBeInTheDocument();
  });

  // 100% is the page fitted to the column, not the page at its natural size. In
  // a column narrower than a page, "fits" is the useful zero point.
  test("the zoom, as a percentage of fitting the column", () => {
    setup({ zoom: 1.5 });
    expect(screen.getByText("150%")).toBeInTheDocument();
  });

  test("it follows the page the viewer reports", () => {
    const { rerender } = render(
      <PdfToolbar page={9} pages={547} onPage={vi.fn()} zoom={1} onZoom={vi.fn()} onFit={vi.fn()} />
    );
    rerender(
      <PdfToolbar page={41} pages={547} onPage={vi.fn()} zoom={1} onZoom={vi.fn()} onFit={vi.fn()} />
    );
    expect(screen.getByLabelText("מספר עמוד")).toHaveValue("41");
  });
});

describe("moving between pages", () => {
  test("the arrows step one page", () => {
    const { onPage } = setup();
    fireEvent.click(screen.getByLabelText("העמוד הבא"));
    expect(onPage).toHaveBeenCalledWith(10);
    fireEvent.click(screen.getByLabelText("העמוד הקודם"));
    expect(onPage).toHaveBeenCalledWith(8);
  });

  test("the first page cannot go back", () => {
    setup({ page: 1 });
    expect(screen.getByLabelText("העמוד הקודם")).toBeDisabled();
  });

  test("the last page cannot go forward", () => {
    setup({ page: 547 });
    expect(screen.getByLabelText("העמוד הבא")).toBeDisabled();
  });

  test("typing a page and pressing Enter goes there", () => {
    const { onPage } = setup();
    fireEvent.change(pageBox(), { target: { value: "412" } });
    fireEvent.keyDown(pageBox(), { key: "Enter" });
    expect(onPage).toHaveBeenCalledWith(412);
  });

  test("leaving the box does the same", () => {
    const { onPage } = setup();
    fireEvent.change(pageBox(), { target: { value: "100" } });
    fireEvent.blur(pageBox());
    expect(onPage).toHaveBeenCalledWith(100);
  });

  // Otherwise clearing the box to type a new number would jump to page 1 on the
  // first keystroke.
  test("a half-typed number does not move anything", () => {
    const { onPage } = setup();
    fireEvent.change(pageBox(), { target: { value: "" } });
    fireEvent.change(pageBox(), { target: { value: "4" } });
    expect(onPage).not.toHaveBeenCalled();
  });

  test("Escape puts back the page it is really on", () => {
    const { onPage } = setup();
    fireEvent.change(pageBox(), { target: { value: "412" } });
    fireEvent.keyDown(pageBox(), { key: "Escape" });
    expect(pageBox()).toHaveValue("9");
    expect(onPage).not.toHaveBeenCalled();
  });
});

describe("zoom", () => {
  test("the buttons step it", () => {
    const { onZoom } = setup({ zoom: 1 });
    fireEvent.click(screen.getByLabelText("הגדלה"));
    expect(onZoom).toHaveBeenCalledWith(1.25);
    fireEvent.click(screen.getByLabelText("הקטנה"));
    expect(onZoom).toHaveBeenCalledWith(0.75);
  });

  test("fitting the width is not offered when it is already fitted", () => {
    setup({ zoom: 1 });
    expect(screen.getByLabelText("התאמה לרוחב")).toBeDisabled();
  });

  test("and is offered as soon as it is not", () => {
    setup({ zoom: 2 });
    expect(screen.getByLabelText("התאמה לרוחב")).toBeEnabled();
  });

  test("it stops shrinking at the floor", () => {
    setup({ zoom: MIN_ZOOM });
    expect(screen.getByLabelText("הקטנה")).toBeDisabled();
  });

  test("and stops growing at the ceiling", () => {
    setup({ zoom: MAX_ZOOM });
    expect(screen.getByLabelText("הגדלה")).toBeDisabled();
  });
});

// The box takes free text, so the guards are what stand between a reader's
// typing and a request for page −4 or page 900 of 547.
describe("the arithmetic behind the box", () => {
  test("a page is clamped into the document", () => {
    expect(clampPage("412", 547)).toBe(412);
    expect(clampPage("900", 547)).toBe(547);
    expect(clampPage("0", 547)).toBe(1);
    expect(clampPage("-4", 547)).toBe(1);
  });

  test("nonsense becomes the first page rather than NaN", () => {
    expect(clampPage("", 547)).toBe(1);
    expect(clampPage("עמוד", 547)).toBe(1);
  });

  test("a fraction of a page is not a page", () => {
    expect(clampPage("12.7", 547)).toBe(12);
  });

  test("zoom is clamped and kept to whole percents", () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(1.2349)).toBe(1.23);
  });
});
