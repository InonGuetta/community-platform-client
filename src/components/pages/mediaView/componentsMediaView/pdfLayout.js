// ── The two spacings, named once ──────────────────────────────────────────
//
// Used BOTH in the layout (PdfPage, PdfViewer) and in the zoom arithmetic
// (usePdfFit), and they have to be the same numbers or zooming lands somewhere
// near where the reader was rather than on it. Written once so they cannot drift: a gap changed in the sx and
// forgotten in the arithmetic would be a slow, silent misplacement that grows
// with every page down the book.
export const PAGE_GAP = 16;
export const BOX_PAD = 8;
