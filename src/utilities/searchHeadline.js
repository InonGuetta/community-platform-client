// A search snippet from Postgres' ts_headline, as text segments.
//
// ts_headline wraps each matched word in <b>…</b>. The text around them is
// transcript or book text — content, not markup — so it must never reach the
// DOM as HTML. This splits on exactly those two tags and returns plain
// segments the caller renders as text, bold where the search matched. Any
// other tag-like text is left as the literal characters it is.
//
// A hit found by meaning alone has no matched words, and comes back as one
// plain segment.
export const headlineSegments = (headline = "") => {
  const segments = [];
  const re = /<b>(.*?)<\/b>/g;
  let last = 0;
  let match;
  while ((match = re.exec(headline)) !== null) {
    if (match.index > last) segments.push({ text: headline.slice(last, match.index), bold: false });
    if (match[1]) segments.push({ text: match[1], bold: true });
    last = re.lastIndex;
  }
  if (last < headline.length) segments.push({ text: headline.slice(last), bold: false });
  return segments;
};
