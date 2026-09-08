// How many bitmap pixels to draw a PDF page with.
//
// A canvas has two sizes that have nothing to do with each other: the bitmap it
// holds and the box it is displayed in. The viewer drew the bitmap at the CSS
// size and let the browser stretch it to the box — which on any display that is
// not exactly one device pixel per CSS pixel means every page is upscaled.
// Windows at 125% display scaling is a device pixel ratio of 1.25; a Retina
// panel is 2.
//
// What that looked like was not "slightly soft". Hebrew is full of small thin
// glyphs — a yud is a stroke a pixel or two wide — and an upscale of a bitmap
// that never had the resolution washes those out. Words came out with holes in
// them and gaps where letters used to be, which reads as a broken PDF rather
// than a blurry one.
//
// This lives in its own module for one reason: it is arithmetic that only ever
// runs in a browser rendering a PDF, which is exactly what the test suite
// cannot do. Inline, it could only be checked by looking at a screen.

// Past 2 the extra pixels are past what any display resolves, and every one of
// them is memory held for as long as the page stays near the viewport.
export const MAX_OUTPUT_SCALE = 2;

// Beyond this a browser refuses to allocate the bitmap and the page comes back
// BLANK. Resolution is worth having only if it never costs the page, so the
// budget wins — and it may pull the scale below 1: a soft page is worth having,
// a missing one is not. A page can exceed the budget on its own at the 4× zoom
// ceiling, which is why this is not merely a cap on the ratio.
export const MAX_CANVAS_PIXELS = 2 ** 24;

/**
 * @param {{width: number, height: number}} viewport - the page at the scale it
 *   will be displayed at, in CSS pixels.
 * @param {number} [devicePixelRatio] - defaults to the current display's.
 * @returns {number} what to multiply the bitmap's dimensions by.
 */
export const outputScaleFor = (viewport, devicePixelRatio = globalThis.devicePixelRatio) => {
  const area = Number(viewport?.width) * Number(viewport?.height);
  // A page that has not been measured yet. 1 rather than 0: the caller is about
  // to size a canvas with this, and a canvas of no pixels is a blank page.
  if (!Number.isFinite(area) || area <= 0) return 1;

  const ratio = Number(devicePixelRatio);
  const wanted = Math.min(Number.isFinite(ratio) && ratio > 0 ? ratio : 1, MAX_OUTPUT_SCALE);
  return Math.min(wanted, Math.sqrt(MAX_CANVAS_PIXELS / area));
};
