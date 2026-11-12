// @vitest-environment jsdom
import { test, expect, describe, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mediaApi } from "../../../../api/mediaApi";
import { pdfStates } from "../../../../utilities/constant";
import { scrollTopForMark, zoomedScrollTop } from "../../../../utilities/pageAnchors";
import { clampZoom } from "./PdfToolbar";

// The original PDF, drawn by pdf.js (PRD: the "מקור" tab). pdf.js itself is
// stood in for — a document of five 600×800 pages — and so are the two things
// jsdom does not have: layout (each page is placed where the real column would
// put it) and the observers, which the tests drive by hand. Everything between
// them is the real viewer: opening, fitting, drawing near pages, tracking the
// page being read, the toolbar, zoom, a jump to a mark, and marking a passage.

const pdfjs = vi.hoisted(() => ({ getDocument: vi.fn(), TextLayer: vi.fn(), GlobalWorkerOptions: {} }));
vi.mock("pdfjs-dist", () => pdfjs);

// The selection a reader made, as utilities/pageAnchors reads it off the DOM —
// tested on its own in pageAnchors.test.js; here it is whatever the test says.
const selection = vi.hoisted(() => ({ anchor: null }));
vi.mock("../../../../utilities/pageAnchors", async (importOriginal) => ({
  ...(await importOriginal()),
  pageAnchorFromSelection: () => selection.anchor,
}));

import PdfViewer from "./PdfViewer";

// ── Layout, as the column would lay it out ──────────────────────────────────
const BOX_TOP = 100;
const BOX_HEIGHT = 500;
const PAD = 8;
const GAP = 16;
let boxWidth = 624; // 600 for the page once the 24px allowance is taken off

const scrolls = new WeakMap();
const isBox = (el) => el.hasAttribute?.("data-pdf-scroll");
const box = () => document.querySelector("[data-pdf-scroll]");
const pageEl = (n) => document.querySelector(`[data-pdf-page="${n}"]`);
const sizeOf = (el) => {
  const style = getComputedStyle(el);
  return { width: parseFloat(style.width), height: parseFloat(style.height) };
};

const descriptors = {};
const stub = (proto, name, descriptor) => {
  descriptors[name] = [proto, Object.getOwnPropertyDescriptor(proto, name)];
  Object.defineProperty(proto, name, { configurable: true, ...descriptor });
};

// ── The observers, driven by the tests ──────────────────────────────────────
let observers = [];
class FakeIntersectionObserver {
  constructor(callback, options) {
    Object.assign(this, { callback, options, nodes: new Set(), disconnected: false });
    observers.push(this);
  }
  observe(node) { this.nodes.add(node); }
  unobserve(node) { this.nodes.delete(node); }
  disconnect() { this.nodes.clear(); this.disconnected = true; }
}
const liveObserver = (margin) => observers.filter((o) => !o.disconnected && o.options.rootMargin === margin).at(-1);
const nearObserver = () => liveObserver("150% 0px");
const screenObserver = () => liveObserver("0px");
const report = (observer, pages, isIntersecting) =>
  act(() => observer.callback(pages.map((n) => ({ target: pageEl(n), isIntersecting }))));

let resizeObservers = [];
class FakeResizeObserver {
  constructor(callback) { this.callback = callback; resizeObservers.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
}
const resizeColumn = (width) => {
  boxWidth = width;
  act(() => resizeObservers.filter((o) => !o.disconnected).forEach((o) => o.callback([])));
};

// ── pdf.js, as far as the viewer uses it ────────────────────────────────────
let renders = [];
const makeDoc = (numPages = 5) => ({
  numPages,
  destroy: vi.fn(),
  getPage: vi.fn(async (n) => ({
    getViewport: ({ scale }) => ({ width: 600 * scale, height: 800 * scale }),
    render: vi.fn((args) => {
      const task = { n, args, promise: Promise.resolve(), cancel: vi.fn() };
      renders.push(task);
      return task;
    }),
    getTextContent: vi.fn(async () => ({ items: [] })),
  })),
});
const openWith = (doc) => {
  const task = { promise: Promise.resolve(doc), destroy: vi.fn() };
  pdfjs.getDocument.mockReturnValue(task);
  return task;
};

beforeEach(() => {
  vi.clearAllMocks();
  observers = [];
  resizeObservers = [];
  renders = [];
  boxWidth = 624;
  selection.anchor = null;
  globalThis.IntersectionObserver = FakeIntersectionObserver;
  globalThis.ResizeObserver = FakeResizeObserver;
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
  Element.prototype.scrollIntoView = vi.fn();
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({}));
  pdfjs.TextLayer.mockImplementation(function TextLayer(options) {
    this.render = async () => {
      const word = document.createElement("span");
      word.textContent = "מילה";
      options.container.append(word);
    };
  });

  stub(Element.prototype, "scrollTop", {
    get() { return scrolls.get(this) ?? 0; },
    set(value) { scrolls.set(this, value); },
  });
  stub(HTMLElement.prototype, "clientHeight", { get() { return isBox(this) ? BOX_HEIGHT : 0; } });
  stub(HTMLElement.prototype, "clientWidth", { get() { return isBox(this) ? boxWidth : 0; } });
  stub(Element.prototype, "getBoundingClientRect", {
    value() {
      if (isBox(this)) return { top: BOX_TOP, height: BOX_HEIGHT, left: 0, width: boxWidth, bottom: BOX_TOP + BOX_HEIGHT };
      const n = Number(this.getAttribute?.("data-pdf-page"));
      if (n) {
        const { width, height } = sizeOf(this);
        const top = BOX_TOP + PAD + (n - 1) * (height + GAP) - box().scrollTop;
        return { top, height, left: 0, width, bottom: top + height };
      }
      return { top: 0, height: 0, left: 0, width: 0, bottom: 0 };
    },
  });
});

afterEach(() => {
  for (const [name, [proto, descriptor]] of Object.entries(descriptors)) {
    if (descriptor) Object.defineProperty(proto, name, descriptor);
    else delete proto[name];
  }
});

const renderViewer = async (props = {}) => {
  const onStatusChange = vi.fn();
  const onPageChange = vi.fn();
  const view = render(
    <PdfViewer media={{ id: 7 }} onStatusChange={onStatusChange} onPageChange={onPageChange} {...props} />
  );
  await screen.findByRole("textbox", { name: "מספר עמוד" });
  // The column is measured once the pages exist; the sizes settle after it.
  await waitFor(() => expect(sizeOf(pageEl(1)).width).toBeGreaterThan(0));
  return { ...view, onStatusChange, onPageChange };
};
const lastCall = (fn) => fn.mock.calls.at(-1)?.[0];
const nextFrame = () => act(() => new Promise((r) => setTimeout(r, 5)));

describe("opening the file", () => {
  test("by range from the stream route, glyphs from the font program; loading, then ready", async () => {
    const doc = makeDoc(5);
    const task = openWith(doc);
    const onStatusChange = vi.fn();
    const view = render(<PdfViewer media={{ id: 7 }} onStatusChange={onStatusChange} />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(onStatusChange).toHaveBeenCalledWith(pdfStates.loading);
    expect(pdfjs.getDocument).toHaveBeenCalledWith({
      url: mediaApi.streamUrl(7), withCredentials: true, disableFontFace: true,
    });

    await screen.findByRole("textbox", { name: "מספר עמוד" });
    expect(lastCall(onStatusChange)).toBe(pdfStates.ready);
    expect(screen.getByText("/ 5")).toBeInTheDocument();
    expect(document.querySelectorAll("[data-pdf-page]")).toHaveLength(5);
    // One page measured, not all of them.
    expect(doc.getPage.mock.calls.map(([n]) => n)).toEqual([1]);
    expect(typeof pdfjs.GlobalWorkerOptions.workerSrc).toBe("string");

    view.unmount();
    expect(task.destroy).toHaveBeenCalled();
    expect(doc.destroy).toHaveBeenCalled();
  });

  test("a file that will not open says so, and reports the error", async () => {
    pdfjs.getDocument.mockReturnValue({ promise: Promise.reject(new Error("bad pdf")), destroy: vi.fn() });
    const onStatusChange = vi.fn();
    render(<PdfViewer media={{ id: 7 }} onStatusChange={onStatusChange} />);
    expect(await screen.findByText("לא ניתן להציג את הקובץ. אפשר לפתוח אותו בכרטיסייה חדשה.")).toBeInTheDocument();
    expect(lastCall(onStatusChange)).toBe(pdfStates.error);
  });

  test("another lesson closes the first document and opens its own", async () => {
    const first = makeDoc(5);
    openWith(first);
    const { rerender } = await renderViewer();
    const second = makeDoc(3);
    openWith(second);
    rerender(<PdfViewer media={{ id: 8 }} />);
    expect(first.destroy).toHaveBeenCalled();
    expect(pdfjs.getDocument).toHaveBeenLastCalledWith(expect.objectContaining({ url: mediaApi.streamUrl(8) }));
    expect(await screen.findByText("/ 3")).toBeInTheDocument();
  });
});

test("pages are sized to the column, and follow it when it changes", async () => {
  openWith(makeDoc(5));
  await renderViewer();
  expect(sizeOf(pageEl(1))).toEqual({ width: 600, height: 800 });

  resizeColumn(324);
  await waitFor(() => expect(sizeOf(pageEl(1))).toEqual({ width: 300, height: 400 }));
  // Never narrower than 240px of page, however narrow the column.
  resizeColumn(100);
  await waitFor(() => expect(sizeOf(pageEl(1))).toEqual({ width: 240, height: 320 }));
});

test("only pages near the viewport are drawn, and they let go when they leave", async () => {
  const doc = makeDoc(5);
  openWith(doc);
  await renderViewer();

  await report(nearObserver(), [2], true);
  await waitFor(() => expect(pdfjs.TextLayer).toHaveBeenCalledTimes(1));
  const canvas = pageEl(2).querySelector("canvas");
  const words = pageEl(2).querySelector(".textLayer");
  expect(doc.getPage.mock.calls.map(([n]) => n)).toEqual([1, 2]);
  expect(renders).toHaveLength(1);
  expect(renders[0].args.viewport).toEqual({ width: 600, height: 800 });
  expect(renders[0].args.transform).toBeNull();
  expect([canvas.width, canvas.height]).toEqual([600, 800]);
  expect(pdfjs.TextLayer.mock.calls[0][0].container).toBe(words);
  expect(words.textContent).toBe("מילה");

  await report(nearObserver(), [2], false);
  expect([canvas.width, canvas.height]).toEqual([0, 0]);
  expect(words.textContent).toBe("");
  expect(renders[0].cancel).toHaveBeenCalled();
});

test("the page being read is the topmost one on screen, reported outward", async () => {
  openWith(makeDoc(5));
  const { onPageChange } = await renderViewer();
  expect(lastCall(onPageChange)).toBe(1);

  await report(screenObserver(), [3, 4], true);
  expect(lastCall(onPageChange)).toBe(3);
  expect(screen.getByRole("textbox", { name: "מספר עמוד" })).toHaveValue("3");
  await report(screenObserver(), [3], false);
  expect(lastCall(onPageChange)).toBe(4);
});

test("the toolbar moves page by page and by number", async () => {
  openWith(makeDoc(5));
  const { onPageChange } = await renderViewer();
  fireEvent.click(screen.getByRole("button", { name: "העמוד הבא" }));
  expect(Element.prototype.scrollIntoView.mock.contexts.at(-1)).toBe(pageEl(2));
  expect(lastCall(onPageChange)).toBe(2);

  const input = screen.getByRole("textbox", { name: "מספר עמוד" });
  await userEvent.clear(input);
  await userEvent.type(input, "4{Enter}");
  expect(Element.prototype.scrollIntoView.mock.contexts.at(-1)).toBe(pageEl(4));
  expect(lastCall(onPageChange)).toBe(4);
});

test("zooming from the toolbar keeps the reader on their page", async () => {
  openWith(makeDoc(5));
  await renderViewer();
  fireEvent.click(screen.getByRole("button", { name: "העמוד הבא" }));
  fireEvent.click(screen.getByRole("button", { name: "העמוד הבא" }));
  Element.prototype.scrollIntoView.mockClear();

  fireEvent.click(screen.getByRole("button", { name: "הגדלה" }));
  expect(sizeOf(pageEl(1))).toEqual({ width: 750, height: 1000 });
  await nextFrame();
  expect(Element.prototype.scrollIntoView.mock.contexts).toEqual([pageEl(3)]);

  fireEvent.click(screen.getByRole("button", { name: "התאמה לרוחב" }));
  expect(sizeOf(pageEl(1))).toEqual({ width: 600, height: 800 });
});

describe("Ctrl+wheel", () => {
  test("zooms the document around the line under the pointer, and keeps it from the browser", async () => {
    openWith(makeDoc(5));
    await renderViewer();
    box().scrollTop = 1000;

    const wheel = new WheelEvent("wheel", { deltaY: -120, ctrlKey: true, clientY: 300, bubbles: true, cancelable: true });
    act(() => { box().dispatchEvent(wheel); });
    expect(wheel.defaultPrevented).toBe(true);

    const zoom = clampZoom(Math.exp(120 / 300));
    expect(sizeOf(pageEl(1)).width).toBe(Math.round(600 * zoom));
    await nextFrame();
    expect(box().scrollTop).toBe(zoomedScrollTop({
      scrollTop: 1000, pointerOffset: 300 - BOX_TOP, padTop: PAD, gap: GAP,
      pageHeight: 800, nextPageHeight: Math.round(800 * zoom),
    }));
  });

  test("a plain wheel scrolls, and is left alone", async () => {
    openWith(makeDoc(5));
    await renderViewer();
    const wheel = new WheelEvent("wheel", { deltaY: -120, clientY: 300, bubbles: true, cancelable: true });
    act(() => { box().dispatchEvent(wheel); });
    expect(wheel.defaultPrevented).toBe(false);
    expect(sizeOf(pageEl(1)).width).toBe(600);
  });
});

describe("a jump to a mark", () => {
  const MARK = { id: 5, media_id: 7, page_number: 3, rect_x: 0.1, rect_y: 0.5, rect_w: 0.4, rect_h: 0.1, timestamp_seconds: null };
  const OTHER = { id: 6, media_id: 7, page_number: 3, rect_x: 0.1, rect_y: 0.1, rect_w: 0.4, rect_h: 0.1, timestamp_seconds: null };
  const markEl = (id) => document.querySelector(`[data-mark-id="${id}"]`);

  test("waits for the document and the column, centres the mark, flashes it — once", async () => {
    openWith(makeDoc(5));
    const { onPageChange, rerender } = await renderViewer({ bookmarks: [MARK, OTHER], jumpTo: MARK });

    const pageTop = PAD + 2 * (800 + GAP);
    const ink = (id) => getComputedStyle(markEl(id)).backgroundColor;
    // Together: the scroll is set in the effect, and the page and the flash are
    // state it sets, on screen and reported one render later.
    await waitFor(() => {
      expect(box().scrollTop).toBe(
        scrollTopForMark({ pageTop, pageHeight: 800, boxHeight: BOX_HEIGHT, rect: { y: 0.5, h: 0.1 } })
      );
      expect(lastCall(onPageChange)).toBe(3);
      expect(ink(5)).not.toBe(ink(6));
    });
    await waitFor(() => expect(ink(5)).toBe(ink(6)), { timeout: 2500 });

    // The effect runs again whenever the column is re-measured, but a mark it
    // has served is not served twice: a reader who has scrolled away stays
    // where they went.
    box().scrollTop = 0;
    resizeColumn(324);
    await waitFor(() => expect(sizeOf(pageEl(1)).width).toBe(300));
    await nextFrame();
    expect(box().scrollTop).toBe(0);
    rerender(<PdfViewer media={{ id: 7 }} bookmarks={[MARK, OTHER]} jumpTo={MARK} onPageChange={onPageChange} />);
    await nextFrame();
    expect(box().scrollTop).toBe(0);
  });

  test("a page past the end lands at the top of the last page, with nothing flashed", async () => {
    openWith(makeDoc(5));
    // Asking for mark 5's own rectangle on a page that does not exist.
    const { onPageChange } = await renderViewer({ bookmarks: [MARK, OTHER], jumpTo: { ...MARK, page_number: 99 } });
    await waitFor(() => {
      expect(box().scrollTop).toBe(PAD + 4 * (800 + GAP));
      expect(lastCall(onPageChange)).toBe(5);
    });
    const ink = (id) => getComputedStyle(markEl(id)).backgroundColor;
    expect(ink(5)).toBe(ink(6));
  });

  test("a bookmark that names only a page goes to the top of it", async () => {
    openWith(makeDoc(5));
    await renderViewer({ jumpTo: { id: 10, media_id: 7, page_number: 2, char_position: 40, chunk_id: 3 } });
    await waitFor(() => expect(box().scrollTop).toBe(PAD + 800 + GAP));
  });
});

describe("marking a passage", () => {
  const ANCHOR = { pageNumber: 2, rect: { x: 0.1, y: 0.2, w: 0.3, h: 0.05 }, text: "שורה מן הספר", truncated: false };
  const select = (anchor) => act(() => {
    selection.anchor = anchor;
    document.dispatchEvent(new Event("selectionchange"));
  });
  const panel = () => screen.queryByLabelText("שמירת סימנייה על הקטע המסומן");
  const noteField = () => within(panel()).getByLabelText("הערה (לא חובה)");

  // The handler is handed in once and never changes — as the notebook's source
  // window passes it (a useCallback). Marking used to depend on the parent
  // re-rendering with a NEW handler after the document opened: the listener's
  // effect ran while the spinner was up, found no page box, and never ran again,
  // so in the source window a selection offered nothing at all.
  const renderMarkable = (onAddBookmark) => renderViewer({ onAddBookmark });

  test("a selection offers the words back, and a new one starts a new note", async () => {
    openWith(makeDoc(5));
    await renderMarkable(vi.fn());
    expect(panel()).toBeNull();

    await select(ANCHOR);
    expect(within(panel()).getByText("„שורה מן הספר”")).toBeInTheDocument();
    await userEvent.type(noteField(), "הערה");

    await select({ ...ANCHOR });
    expect(noteField()).toHaveValue("הערה");
    // A selection cleared — by focusing the field — leaves the panel alone.
    await select(null);
    expect(noteField()).toHaveValue("הערה");

    await select({ ...ANCHOR, rect: { ...ANCHOR.rect, y: 0.6 }, text: "שורה אחרת", truncated: true });
    expect(noteField()).toHaveValue("");
    expect(within(panel()).getByText("הסימון יישמר עד סוף העמוד.")).toBeInTheDocument();

    fireEvent.click(within(panel()).getByRole("button", { name: "ביטול" }));
    expect(panel()).toBeNull();
  });

  test("saving sends the page, the rectangle, the words and the note, then clears", async () => {
    openWith(makeDoc(5));
    let finish;
    const onAddBookmark = vi.fn(() => new Promise((resolve) => { finish = resolve; }));
    await renderMarkable(onAddBookmark);
    const removeAllRanges = vi.spyOn(document.getSelection(), "removeAllRanges");

    await select(ANCHOR);
    await userEvent.type(noteField(), "  הערה  ");
    fireEvent.click(within(panel()).getByRole("button", { name: "שמירת סימנייה" }));
    expect(onAddBookmark).toHaveBeenCalledWith({
      pageNumber: 2, rect: ANCHOR.rect, quotedText: "שורה מן הספר", note: "הערה",
    });
    expect(within(panel()).getByRole("button", { name: "ביטול" })).toBeDisabled();

    await act(async () => finish());
    expect(panel()).toBeNull();
    expect(removeAllRanges).toHaveBeenCalled();

    await select({ ...ANCHOR, text: "", rect: { ...ANCHOR.rect, x: 0.5 } });
    fireEvent.click(within(panel()).getByRole("button", { name: "שמירת סימנייה" }));
    expect(onAddBookmark).toHaveBeenLastCalledWith({
      pageNumber: 2, rect: { ...ANCHOR.rect, x: 0.5 }, quotedText: undefined, note: undefined,
    });
    await act(async () => finish());
  });

  test("without a way to save, selecting offers nothing", async () => {
    openWith(makeDoc(5));
    const { rerender } = await renderViewer();
    rerender(<PdfViewer media={{ id: 7 }} />);
    await select(ANCHOR);
    expect(panel()).toBeNull();
  });
});
