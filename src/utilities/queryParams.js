// How a list becomes a query string.
//
// ── The bug this exists to fix ──────────────────────────────────────────────
//
// axios spells an array with brackets: `{ tagIds: [1, 2] }` goes out as
// `tagIds[]=1&tagIds[]=2`. Express 5 changed its default query parser to
// "simple", which is Node's own querystring and does nothing with brackets — so
// the server received a parameter literally named `tagIds[]` and `req.query.tagIds`
// was undefined.
//
// Nothing failed. The request was well formed, the server answered 200, and the
// archive came back UNFILTERED — the filter appeared to do nothing at all, which
// is indistinguishable from a filter that matches everything. No error, no log
// line, nothing to search for.
//
// The fix belongs on this side because the server's contract is already the
// repeated form — `?tagIds=1&tagIds=2` — which is what its controller reads and
// what its tests assert. Changing the server to accept brackets would mean two
// spellings of the same thing, and the one nobody tested would be the one that
// broke next.
//
// It is set on the shared axios instance rather than at the one call site that
// sends arrays, because the next caller to send one will not know any of this.

/**
 * `{ a: 1, tagIds: [2, 3] }` → `a=1&tagIds=2&tagIds=3`
 *
 * Absent values are omitted rather than sent empty: an absent parameter means
 * "no filter", while `creator=` asks the server to compare against an empty
 * string. An empty array is the same statement and disappears the same way.
 */
export const serializeParams = (params = {}) => {
  const pairs = [];
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null) continue;
    const encodedKey = encodeURIComponent(key);
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry === undefined || entry === null) continue;
      pairs.push(`${encodedKey}=${encodeURIComponent(entry)}`);
    }
  }
  return pairs.join("&");
};
