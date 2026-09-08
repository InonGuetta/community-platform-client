// @vitest-environment jsdom
import { test, expect, describe, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import TextViewer from "./TextViewer";

// The real one loads pdf.js and a worker. What this file is about is WHICH of
// the two paths a format takes, so the viewer only has to be identifiable.
let lastPdfProps = null;
vi.mock("./PdfViewer", () => ({
  default: (props) => {
    lastPdfProps = props;
    return <div data-testid="pdf-viewer" />;
  },
}));

// Showing the original file — the whole of what a document page shows.
//
// The whole point of this component changed: it used to download the file
// through axios into a Blob and hand a blob: URL to the frame, and it showed
// nothing at all for a PDF. It now points the frame at the stream route, which
// is the path <video> and <audio> have always used successfully.
//
// What is asserted here is the shape of that decision — WHERE the frame points,
// and what happens for a file that cannot be pointed at — because both are
// invisible from looking at the page and both were wrong before.

const PDF = { id: 9, media_type: "text", file_ext: "pdf", can_view_inline: true };
const DOC = { id: 9, media_type: "text", file_ext: "doc", can_view_inline: false };

const frame = () => document.querySelector("iframe");

describe("which of the two paths a format takes", () => {
  // The browser's viewer reads a PDF perfectly and tells us nothing: not which
  // page is showing, not what was selected, not where on the page it sat. Those
  // three facts ARE the anchor for a bookmark on a line of the original, so a
  // PDF is drawn by a viewer we own.
  // Awaited because the viewer is loaded lazily — the Suspense fallback is what
  // renders first, which is the point: nothing fetches pdf.js until a PDF is
  // actually opened.
  test("a PDF is rendered by us, not handed to the browser", async () => {
    render(<TextViewer media={PDF} />);
    expect(await screen.findByTestId("pdf-viewer")).toBeInTheDocument();
    expect(frame()).toBeNull();
  });

  // Everything else is for reading rather than marking, and the browser shows it
  // well. A DOCX arrives as HTML the server generated from an uploaded file —
  // active content — so the opaque origin is half of what stands between it and
  // the signed-in session.
  test("a Word document goes to the frame, sandboxed and never same-origin", () => {
    render(<TextViewer media={{ ...PDF, file_ext: "docx" }} />);
    expect(screen.queryByTestId("pdf-viewer")).not.toBeInTheDocument();
    const sandbox = frame().getAttribute("sandbox");
    expect(sandbox).toBe("allow-scripts");
    expect(sandbox).not.toContain("allow-same-origin");
  });

  test("plain text does too", () => {
    render(<TextViewer media={{ ...PDF, file_ext: "txt" }} />);
    expect(frame().getAttribute("src")).toBe("/api/media/9/stream");
    expect(frame().getAttribute("sandbox")).toBe("allow-scripts");
  });

  // The bug the direct URL replaced: a blob: URL is its own opaque origin, and
  // nothing displayed inside one in a sandboxed frame.
  test("the frame never points at a blob", () => {
    render(<TextViewer media={{ ...PDF, file_ext: "txt" }} />);
    expect(frame().getAttribute("src")).not.toMatch(/^blob:/);
  });
});

// A place asked for by a link — /media/9?page=70 — arrives here as the same
// shape a bookmark that names a page does, so there is one thing for the viewer
// to resolve rather than two.
describe("being asked to open at a place", () => {
  test("a PDF is handed the place, and reports back which page is being read", async () => {
    const onPageChange = vi.fn();
    render(<TextViewer media={PDF} jumpTo={{ page_number: 70 }} onPageChange={onPageChange} />);
    await screen.findByTestId("pdf-viewer");

    expect(lastPdfProps.jumpTo).toEqual({ page_number: 70 });
    expect(lastPdfProps.onPageChange).toBe(onPageChange);
  });

  // A .docx or a .txt has no viewer of ours and therefore no pages at all. The
  // parameter is meaningless there rather than wrong, and the document still has
  // to render — a link pasted into the wrong chat must not produce a blank tab.
  test("a format with no pages ignores it and still renders", () => {
    render(<TextViewer media={{ ...PDF, file_ext: "docx" }} jumpTo={{ page_number: 70 }} />);
    expect(frame()).not.toBeNull();
  });

  test("and so does one that cannot be displayed at all", () => {
    render(<TextViewer media={DOC} jumpTo={{ page_number: 70 }} />);
    expect(screen.getByRole("link", { name: /פתיחה בכרטיסייה חדשה/ })).toBeInTheDocument();
  });
});

describe("a file that cannot be displayed", () => {
  // The stream route answers 400 with a JSON body for a .doc. An iframe pointed
  // at that renders the JSON as text — which looks like the document, and is
  // worse than the blank frame it replaced. So it is never pointed there.
  test("is not embedded at all", () => {
    render(<TextViewer media={DOC} />);
    expect(frame()).toBeNull();
  });

  test("says which format it is and what to do instead", () => {
    render(<TextViewer media={DOC} />);
    expect(screen.getByText(/\.doc/)).toBeInTheDocument();
    expect(screen.getByText(/docx/)).toBeInTheDocument();
  });
});

// Embedding depends on a browser's plugin behaviour, which this application
// cannot promise. Reaching your own upload is something it can.
describe("the way out, which is always there", () => {
  test("a viewable file offers the tab", () => {
    render(<TextViewer media={PDF} />);
    expect(screen.getByRole("link", { name: /פתיחה בכרטיסייה חדשה/ }))
      .toHaveAttribute("href", "/api/media/9/stream");
  });

  test("so does one that cannot be shown", () => {
    render(<TextViewer media={DOC} />);
    expect(screen.getByRole("link", { name: /פתיחה בכרטיסייה חדשה/ })).toBeInTheDocument();
  });

  // The actions bar under the panel already carries a download for the same file
  // through the same route. Two of them, a few centimetres apart, is a control
  // the reader has to think about rather than one they can use.
  test("and no download, because the actions bar already has one", () => {
    render(<TextViewer media={PDF} />);
    expect(screen.queryByRole("link", { name: /הורדה/ })).not.toBeInTheDocument();
    expect(document.querySelector('[href*="/download"]')).toBeNull();
  });

  test("the new tab is opened without handing it a window reference", () => {
    render(<TextViewer media={PDF} />);
    const link = screen.getByRole("link", { name: /פתיחה בכרטיסייה חדשה/ });
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  // Under the document, not over it. Above the first page it read as a heading
  // for the book — the first thing the eye met on a page whose whole point is
  // the page underneath. Asserted as DOM ORDER, which is the half of "below"
  // that jsdom can actually see; the alignment is CSS and is not testable here.
  test("it comes after the document, not before it", async () => {
    render(<TextViewer media={PDF} />);
    const viewer = await screen.findByTestId("pdf-viewer");
    const link = screen.getByRole("link", { name: /פתיחה בכרטיסייה חדשה/ });

    expect(viewer.compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  test("and after the frame, for the formats that use one", () => {
    render(<TextViewer media={{ ...PDF, file_ext: "txt" }} />);
    const link = screen.getByRole("link", { name: /פתיחה בכרטיסייה חדשה/ });
    expect(frame().compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });
});
