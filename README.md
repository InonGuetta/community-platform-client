# community-platform-client

The browser half of a two-repository system. `../ARCHITECTURE.md` maps how the
two fit together; `../CONTRIBUTING.md` is the file-by-file recipes.

**Read its "four pairs that must be edited together" section before your first
change.** Two of those pairs straddle the repository boundary, so no test in
this repository can catch them going out of step — and nothing fails when they
do.

```bash
npm run dev     # dev server on :5173, proxying /api to the backend
npm run build
npm test
```

## Tests

Vitest. Run with `npm test`.

Two kinds, and the distinction matters when adding one:

| | Environment | Opt in with |
|---|---|---|
| Logic — the majority | `node` (the default) | nothing |
| Rendering a component | `jsdom` | `// @vitest-environment jsdom` on line 1 |

`node` stays the default deliberately: jsdom costs about a second of startup,
and most of these tests never touch a DOM. A rendering test declares its own
environment so that cost lands only where it buys something. `vitest.setup.js`
registers the jest-dom matchers and unmounts between tests.

They concentrate on the things that fail quietly:

- **MediaViewPage** — which tabs a media type offers, and which of the AI/edit
  affordances a given viewer is shown. Both are decided by flags and both are
  silent when wrong: a document that offers "תמלול" opens an editor for a
  transcript that does not exist. The page takes everything it renders from
  `useMediaViewPageController`, so the test mocks that one module and needs no
  store, router or network.
- **Navbar** — the per-role link sets, which are built by extending one another
  (student ⊂ lecturer ⊂ admin). Adding an entry to the wrong array shows
  students a link they will get a 403 from, and nothing fails.

- **peerMesh** — the WebRTC signalling. There is no browser, camera or second
  peer here, so the mesh takes its connection factory and transport as
  arguments; that is what makes candidate ordering, peer reuse and teardown
  testable at all.
- **imports** — a structural guard. Bundlers tolerate import cycles, so one
  does not fail the build; it fails at runtime as an undefined binding. Two
  design choices exist purely to avoid a cycle, and this stops them being
  undone by accident.
- **store** — that a transcript save merges rather than replaces (the response
  carries no chunks), and that the memoised selectors keep a stable reference.
- **axiosInstance** — which responses count as an expired session, and which
  are ordinary traffic that must not clear it.
- **pollingSchedule** — the backoff and the ceiling that stops the page polling
  a transcript no worker will ever finish.

### Linting

`npm run lint`. Two rule choices are deliberate and explained in
`eslint.config.js`:

- `react-hooks/exhaustive-deps` is a **warning**, not an error. The obvious way
  to satisfy it — add the missing dependency — is often the wrong fix. An
  effect that lists a callback its parent rebuilds every render tears itself
  down and back up continuously; that was a real bug in the video room, and the
  fix was the opposite, removing it from the array and holding it in a ref. The
  rule cannot tell those apart. Every deliberate omission carries a comment
  saying why.
- `eslint-plugin-react-hooks` 7 bundles the React Compiler's rule family.
  `preserve-manual-memoization` and `set-state-in-effect` fire on correct code
  here and are off; the rest stay on.

## Configuration

`.env.example` documents `VITE_ICE_SERVERS`, which matters if video connects
for some participants and not others.

## Known debt

Deliberately not addressed, recorded so the reasoning is not lost:

- **State synchronised inside effects** (`set-state-in-effect`, six places).
  Resetting derived state when a media id or note selection changes. The
  idiomatic fix is remounting via a `key` rather than syncing in an effect, but
  that restructures four working files and the UI layer has no test coverage.
  Revisit alongside component tests.
- **No pagination on the media list.** `/api/media/get-all` returns every row
  and the archive filters client-side even though the server accepts a search
  parameter. Premature at the current library size; revisit in the hundreds.
- **`react-router` open-redirect advisory.** The fix needs react-router 7, a
  major upgrade of the routing layer. Not reachable here — every dynamic
  navigation target is a server-issued value behind a literal path prefix.
- **The AI endpoints run synchronously inside the request.** `fix-hebrew` and
  `key-point-headings` take minutes on a long transcript. They are rate limited
  and guarded against concurrent runs, but belong on the queue with the client
  polling, which is a feature rather than a fix.
